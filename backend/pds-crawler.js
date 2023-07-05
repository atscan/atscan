import { ATScan } from "./lib/atscan.js";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { timeout } from "./lib/utils.js";

const WAIT = 1000 * 60 * 2;
const TIMEOUT = 2500;

const hosts = {
  local: {},
  texas: {},
  tokyo: {},
};

async function crawlUrl(ats, url, host = "local") {
  if (host === "local") {
    try {
      const [, ms] = await timeout(
        TIMEOUT,
        fetch(url, {
          method: "OPTIONS",
          headers: {
            "User-Agent": "ATScan Crawler",
            "connection": "keep-alive",
            keepalive: "timeout=5, max=1000",
          },
        }),
      );
    } catch (e) {
      return { err: "timeout" };
    }
    let res, data, ms, err;
    try {
      [res, ms] = await timeout(
        TIMEOUT,
        fetch(url, {
          headers: {
            "User-Agent": "ATScan Crawler",
          },
        }),
      );
      if (res) {
        data = await res.json();
      }
    } catch (e) {
      err = e.message;
    }
    return {
      err,
      data,
      ms,
    };
  }
  const hostConfig = hosts[host];
  if (!hostConfig) {
    console.error(`Unknown host: ${host}`);
    return { err: "unknown host" };
  }
  const codec = ats.JSONCodec;
  const resp = await ats.nats.request(
    `ats-nodes.${host}.http`,
    codec.encode({ url }),
    {
      timeout: 60000,
    },
  );
  const { err, data, ms } = codec.decode(resp.data);
  return { err, data, ms };
}

async function crawl(ats) {
  const arr = await ats.db.pds.find().toArray();
  const results = pooledMap(25, arr.slice(0, 1000), async (i) => {
    let err = null;

    if (i.url.match(/^https?:\/\/(localhost|example.com)/)) {
      err = "not allowed domain";
      await ats.db.pds.updateOne({ url: i.url }, {
        $set: { "inspect.current": { err } },
      });
      return;
    }

    const host = i.url.replace(/^https?:\/\//, "");

    if (!i.dns) {
      console.log("sending dns request: ", i.url);
      let dns =
        await (await fetch(`https://dns.google/resolve?name=${host}&type=A`))
          .json();
      i.dns = dns;
      ats.db.pds.updateOne({ url: i.url }, { $set: { dns } });
    }
    if (
      !i.ip &&
      (i.dns.Answer && i.dns.Answer.filter((a) => a.type === 1).length > 0)
    ) {
      const ipAddr = i.dns.Answer.filter((a) => a.type === 1)[0].data;
      let ip;
      try {
        ip = await (await fetch(
          `http://ipinfo.io/${ipAddr}?token=${ats.env.IPINFO_TOKEN}`,
        ))
          .json();
      } catch (e) {}
      if (
        ip ||
        (i.ip && i.ip.Question && i.ip &&
          i.ip.Question[0].name !== host + ".") ||
        !i.ip
      ) {
        i.ip = ip;
        ats.db.pds.updateOne({ url: i.url }, { $set: { ip } });
      }
    }

    if (!i.dns.Answer) {
      err = "not existing domain";
    }

    const url = `${i.url}/xrpc/com.atproto.server.describeServer`;
    await Promise.all(
      Object.keys(hosts).map(async (chost) => {
        const { err, data, ms } = await crawlUrl(ats, url, chost);
        const inspect = {
          err,
          data,
          ms,
          time: new Date().toISOString(),
        };
        if (chost === "local") {
          const dbSet = { "inspect.current": inspect };
          if (!err && data) {
            dbSet["inspect.lastOnline"] = (new Date()).toISOString();
          }
          await ats.db.pds.updateOne({ url: i.url }, {
            $set: dbSet,
          });
        }
        await ats.db.pds.updateOne({ url: i.url }, {
          $set: { [`inspect.${chost}`]: inspect },
        });
        if (ms && Number(ms) > 0) {
          await ats.writeInflux("pds_response_time", "intField", Number(ms), [
            ["pds", host],
            ["crawler", chost],
          ]);
        }
        ats.nats.publish(
          "ats.service.pds.update",
          ats.JSONCodec.encode({ url: i.url }),
        );
        console.log(
          `[${chost}] -> ${i.url} ${ms ? "[" + ms + "ms]" : ""} ${
            err ? "error = " + err : ""
          }`,
        );
      }),
    );
  });
  for await (const _ of results) {}
}

if (Deno.args[0] === "daemon") {
  console.log("Initializing ATScan ..");
  const ats = new ATScan({ enableNats: true });
  ats.debug = true;
  await ats.init();
  console.log("pds-crawl daemon started");
  console.log("Performing initial crawl ..");
  // initial crawl
  await crawl(ats);
  console.log(`Initial crawl done`);
  ats.debug = false;
  console.log(`Processing events [wait=${WAIT / 1000}s] ..`);
  setInterval(() => crawl(ats), WAIT);
} else {
  const ats = new ATScan({ enableNats: true, debug: true });
  await ats.init();
  await crawl(ats);
}
