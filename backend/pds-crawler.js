import { ATScan } from "./lib/atscan.js";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import "https://deno.land/std@0.192.0/dotenv/load.ts";

function timeout(ms, promise) {
  return new Promise(function (resolve, reject) {
    const start = performance.now();
    setTimeout(function () {
      reject(new Error("timeout"));
    }, ms);
    promise.then((v) => {
      const end = performance.now();
      return resolve([v, end - start]);
    }, reject);
  });
}

async function crawl(ats) {
  const arr = await ats.db.pds.find().toArray();
  const results = pooledMap(25, arr.slice(0, 1000), async (i) => {
    let err = null;
    let res, data, ms;

    const host = i.url.replace(/^https?:\/\//, "");
    if (!i.dns) {
      console.log('sending dns request: ', i.url)
      let dns =
        await (await fetch(`https://dns.google/resolve?name=${host}&type=A`))
          .json();
      i.dns = dns;
      ats.db.pds.updateOne({ url: i.url }, { $set: { dns } });
    }
    if (!i.ip && (i.dns.Answer && i.dns.Answer.filter(a => a.type === 1).length > 0)) {
      const ipAddr = i.dns.Answer.filter(a => a.type === 1)[0].data
      let ip;
      try {
        ip =    
          await (await fetch(`http://ipinfo.io/${ipAddr}?token=${Deno.env.get('IPINFO_TOKEN')}`))
            .json();
      } catch (e) {}
      if (ip || (i.ip && i.ip.Question && i.ip && i.ip.Question[0].name !== host+'.') || !i.ip) {
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
          5000,
          fetch(url, {
            headers: {
              "User-Agent":
                "ATScan Crawler",
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
    console.log(
      `-> ${i.url} ${ms ? "[" + ms + "ms]" : ""} ${
        err ? "error = " + err : ""
      }`,
    );
  });
  for await (const value of results) {}
}

if (Deno.args[0] === "daemon") {
  const wait = 60 * 10;

  console.log("Initializing ATScan ..");
  const ats = new ATScan();
  ats.debug = true;
  await ats.init();
  console.log("pds-crawl daemon started");
  console.log("Performing initial crawl ..");
  // initial crawl
  await crawl(ats);
  console.log(`Initial crawl done`);
  ats.debug = false;
  console.log(`Processing events [wait=${wait}s] ..`);
  setInterval(() => crawl(ats), wait * 1000);
} else {
  const ats = new ATScan({ debug: true });
  await ats.init();
  await crawl(ats);
}
