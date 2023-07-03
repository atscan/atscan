import { ATScan } from "./lib/atscan.js";
import whoiser from "npm:whoiser";

const wait = 60 * 5;

async function index(ats) {
  for (const pds of await ats.db.pds.find().toArray()) {
    const didsCount = await ats.db.did.countDocuments({
      "pds": { $in: [pds.url] },
    });
    const host = pds.url.replace(/^https?:\/\//, "");

    const stages = [
      { $match: { pds: { $in: [pds.url] } } },
      {
        $group: {
          _id: "$groupField",
          sum: {
            $sum: "$repo.size",
          },
        },
      },
    ];
    const sizeRes = await ats.db.did.aggregate(stages).toArray();
    const size = sizeRes[0].sum;

    await ats.db.pds.updateOne({ url: pds.url }, { $set: { didsCount, size } });
    await ats.writeInflux("pds_dids_count", "intField", didsCount, [[
      "pds",
      host,
    ]]);
    await ats.writeInflux("pds_size", "intField", size, [["pds", host]]);
  }
  console.log("indexer round finished");
  //console.log(await whoiser("dev.otaso-sky.blue"));
}

if (Deno.args[0] === "daemon") {
  console.log("Initializing ATScan ..");
  const ats = new ATScan();
  ats.debug = true;
  await ats.init();
  console.log("indexer daemon started");
  console.log("Performing initial index round ..");
  // initial crawl
  await index(ats);
  console.log(`Initial index round done`);
  ats.debug = false;
  console.log(`Processing [wait=${wait}s] ..`);
  setInterval(() => index(ats), wait * 1000);
} else {
  const ats = new ATScan({ debug: true });
  await ats.init();
  await index(ats);

  Deno.exit(0);
}
