import { ATScan } from "./lib/atscan.js";

async function crawl(ats) {
  for (const plc of ats.ecosystem.data["plc-directories"]) {
    let start = 0;
    if (Deno.args[0] !== "init") {
      const item = await ats.db.meta.findOne({ key: `lastUpdate:${plc.url}` });
      if (item) {
        start = item.value;
      }
    }
    let after = await ats.processPlcExport(plc, start);
    while (after) {
      after = await ats.processPlcExport(plc, after);
    }
  }
}

if (Deno.args[0] === "daemon") {
  const wait = 30;

  console.log("Initializing ATScan ..");
  const ats = new ATScan();
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
  const ats = new ATScan({ debug: true });
  await ats.init();
  await crawl(ats);
}
