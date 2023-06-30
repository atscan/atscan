import { ATScan } from "./lib/atscan.js";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { timeout } from "./lib/utils.js";
import "https://deno.land/std@0.192.0/dotenv/load.ts";

const WAIT = 1000 * 60 * 2;
const TIMEOUT = 5000;

async function crawl(ats) {
  const arr = await ats.db.pds.find().toArray();
  const results = pooledMap(25, arr.slice(0, 1000), async (i) => {
    let err = null;
    let res, data, ms;

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

    if (i.url.match(/^https?:\/\/(localhost|example.com)/)) {
      err = "not allowed domain";
    }
    if (!i.dns.Answer) {
      err = "not existing domain";
    }

    if (!err) {
      const url = `${i.url}/xrpc/com.atproto.server.describeServer`;
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
    }
    const inspect = {
      err,
      data,
      ms,
      time: new Date().toISOString(),
    };
    const dbSet = { "inspect.current": inspect };
    if (!err && data) {
      dbSet["inspect.lastOnline"] = (new Date()).toISOString();
    }
    await ats.db.pds.updateOne({ url: i.url }, {
      $set: dbSet,
    });
    if (ms && Number(ms) > 0) {
      await ats.writeInflux("pds_response_time", "intField", Number(ms), [[
        "pds",
        host,
      ]]);
    }
    console.log(
      `-> ${i.url} ${ms ? "[" + ms + "ms]" : ""} ${
        err ? "error = " + err : ""
      }`,
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
