import { ATScan } from "./lib/atscan.js";
import whoiser from "npm:whoiser";

const wait = 60 * 15;

async function index(ats) {
  const arr = await ats.db.pds.find().toArray();
  for (const pds of arr) {
    const didsCount = await ats.db.did.countDocuments({
      "pds": { $in: [pds.url] },
    });
    console.log(`${pds.url}: ${didsCount}`);
    await ats.db.pds.updateOne({ url: pds.url }, { $set: { didsCount } });
  }

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
}
