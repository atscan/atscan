import { ATScan } from "./lib/atscan.js";

async function crawl(ats) {
  for await (const plc of ats.ecosystem.data["plc-directories"]) {
    let start = 0;
    if (Deno.args[0] !== "init") {
      const item = await ats.db.meta.findOne({ key: `lastUpdate:${plc.url}` });
      if (item) {
        start = item.value;
      }
    }
    await processPlcExport(ats, plc, start);
  }
}

async function processPlcExport(ats, plc, after = null) {
  const url = plc.url + "/export?after=" + (after || "");
  if (ats.debug) {
    console.log(`ProcessPlcExport: ${url}`);
  }
  const req = await fetch(url);
  const lines = await req.text();
  if (!lines) {
    console.error(`No output from PLC! [${url}]`);
    return null;
  }
  const arr = lines.split("\n").map((l) => JSON.parse(l));

  if (after && arr.length === 1) {
    return null;
  }

  for (const data of arr) {
    const pdsUrl = data.operation.services?.atproto_pds?.endpoint;
    const matcher = { did: data.did, src: plc.url };
    const obj = {
      did: data.did,
      src: plc.url,
      revs: [data],
      time: new Date().toISOString(),
      lastMod: data.createdAt,
      pds: pdsUrl ? [pdsUrl] : [],
    };
    let didRev = 0;
    const found = await ats.db.did.findOne(matcher);
    if (found) {
      const revFound = found.revs.find((r) => r.cid === data.cid);
      let updated = false;
      if (!revFound) {
        updated = true;
        didRev = found.revs.length;
        found.revs.push(data);
        //found.time = new Date().toISOString()
        console.log(
          `${
            (new Date()).toISOString()
          } DID: Adding new DID revision: ${data.did}@${didRev}`,
        );
      }
      if (pdsUrl && !found.pds.includes(pdsUrl)) {
        updated = true;
        found.pds.push(pdsUrl);
      }
      if (updated) {
        await ats.db.did.updateOne(matcher, {
          $set: {
            time: new Date().toISOString(),
            revs: found.revs,
            pds: found.pds,
            lastMod: found.revs[found.revs.length - 1].createdAt,
          },
        });
        ats.nats.publish(
          "ats.service.plc.did.update",
          ats.JSONCodec.encode({ did: obj.did }),
        );
      }
    } else {
      console.log(
        `${
          (new Date()).toISOString()
        } DID: Adding new DID revision: ${data.did}@0 (init)`,
      );
      await ats.db.did.insertOne(obj);
      ats.nats.publish(
        "ats.service.plc.did.create",
        ats.JSONCodec.encode({ did: obj.did }),
      );
    }
    await ats.queues.repoSnapshot.add(obj.did, obj, {
      jobId: obj.did,
      delay: 5000,
      priority: 1,
    });

    // update pds
    if (pdsUrl) {
      const pdsFound = await ats.db.pds.findOne({ url: pdsUrl });
      const didId = [data.did, didRev].join("@");
      if (pdsFound) {
        if (!pdsFound.plcs.includes(plc.url)) {
          pdsFound.plcs.push(plc.url);
          console.log(
            `${
              (new Date()).toISOString()
            } PDS [${pdsUrl}]: Adding new PLC: ${plc.url}`,
          );
          await ats.db.pds.updateOne({ url: pdsUrl }, {
            $set: {
              plcs: pdsFound.plcs,
            },
          });
        }
      } else {
        await ats.db.pds.insertOne({
          url: pdsUrl,
          plcs: [plc.url],
          time: new Date().toISOString(),
        });
      }
      // update PDS stats
      /*const didsCount = await ats.db.did.countDocuments({
        "pds": { $in: [pdsUrl] },
      });
      await ats.db.pds.updateOne({ url: pdsUrl }, { $set: { didsCount } });
      */
      ats.nats.publish(
        "ats.service.pds.update",
        ats.JSONCodec.encode({ url: pdsUrl }),
      );
    }
  }

  const key = `lastUpdate:${plc.url}`;
  await ats.db.meta.updateOne({ key }, {
    $set: { key, value: arr[arr.length - 1].createdAt },
  }, { upsert: true });

  const next = arr.length > 0 ? arr[arr.length - 1].createdAt : false;
  if (next) {
    await processPlcExport(ats, plc, next);
  }
}

if (Deno.args[0] === "daemon") {
  const wait = 10;

  console.log("Initializing ATScan ..");
  const ats = new ATScan({ enableNats: true, enableQueues: true });
  ats.debug = true;
  await ats.init();
  console.log("plc-crawl daemon started");
  console.log("Performing initial crawl ..");
  // initial crawl
  await crawl(ats);
  console.log(`Initial crawl done`);
  ats.debug = false;
  console.log(`Processing events [wait=${wait}s] ..`);
  setInterval(() => crawl(ats), wait * 1000);
} else {
  const ats = new ATScan({ debug: true, enableNats: true, enableQueues: true });
  await ats.init();
  await crawl(ats);
}
