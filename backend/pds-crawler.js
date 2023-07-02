import { ATScan } from "./lib/atscan.js";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { timeout } from "./lib/utils.js";
import {
  connect,
  JSONCodec,
  StringCodec,
} from "https://deno.land/x/nats/src/mod.ts";
import "https://deno.land/std@0.192.0/dotenv/load.ts";

const WAIT = 1000 * 60 * 2;
const TIMEOUT = 5000;

const nc = await connect({
  servers: Deno.env.get("NATS_SERVERS"),
});
const jc = JSONCodec();
console.log(`connected to ${nc.getServer()}`);

const hosts = {
  local: {},
  texas: {},
};

async function crawlUrl(url, host = "local") {
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
  const resp = await nc.request(`ats-nodes.${host}.http`, jc.encode({ url }), {
    timeout: 60000,
  });
  const { err, data, ms } = jc.decode(resp.data);
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
          `http://ipinfo.io/${ipAddr}?token=${Deno.env.get("IPINFO_TOKEN")}`,
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
        const { err, data, ms } = await crawlUrl(url, chost);
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
  //console.log('IPINFO_TOKEN', Deno.env.get("IPINFO_TOKEN"));
  const ats = new ATScan();
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
  const ats = new ATScan({ debug: true });
  await ats.init();
  await crawl(ats);
}
