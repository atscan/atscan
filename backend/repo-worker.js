import { Worker } from "npm:bullmq";
import { ATScan } from "./lib/atscan.js";
import { saveRepo } from "./lib/repo.js";

const ats = new ATScan();
ats.debug = true;
await ats.init();

async function processJob(job) {
  await saveRepo(ats, job.data, job);
  return Promise.resolve();
}

const worker = new Worker("repo-inspect", processJob, {
  connection: { host: "localhost", port: "6379" },
});
