import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { ATScan } from "./lib/atscan.js";
import _ from "npm:lodash";
import { Queue } from "npm:bullmq";

const repoQueue = new Queue("repo-inspect", {
  connection: { host: "localhost", port: "6379" },
});
const counters = {};

async function processPDSRepos(ats, repos) {
  for (const repo of repos.repos) {
    const did = await ats.db.did.findOne({ did: repo.did });
    if (!did) {
      console.error(`DID ${repo.did} not exists?? (!!)`);
      continue;
    }
    console.log(
      repo.did,
      repo.head,
      did.repo?.root,
      repo.head === did.repo?.root,
    );
    if (repo.head !== did.repo?.root) {
      await repoQueue.add(repo.did, did, { priority: repo.head ? 10 : 5 });
    }
  }
}
async function getPDSRepos(item, cursor = null) {
  if (!counters[item.url]) {
    counters[item.url] = 1;
  } else {
    counters[item.url]++;
  }
  console.log(`Updating PDS=${item.url} [${counters[item.url]}] ..`);
  const reposUrl = item.url + "/xrpc/com.atproto.sync.listRepos?limit=1000" +
    (cursor ? "&cursor=" + cursor : "");
  const reposRes = await fetch(reposUrl);
  if (!reposRes.ok) {
    console.error(`Bad request: ${reposRes.statusText}`);
    return;
  }
  const repos = await reposRes.json();
  return repos;
}

async function traversePDSRepos(ats, item, cursor = null) {
  const repos = await getPDSRepos(item, cursor);
  if (repos?.repos) {
    await processPDSRepos(ats, repos);

    if (repos.repos.length === 1000) {
      await traversePDSRepos(ats, item, repos.cursor);
    }
  }
}

async function crawlNew(ats) {
  const pds = await ats.db.pds.find({}).toArray();
  const results = pooledMap(4, _.shuffle(pds), async (item) => {
    if (!item.inspect.current || item.inspect.current.err) {
      return null;
    }
    await traversePDSRepos(ats, item);
  });

  for await (const _ of results) {}
}

async function crawl(ats) {
  let expiry = new Date();
  expiry.setDate(expiry.getDate() - 10);

  const dids = await ats.db.did.find({
    //'pds': { $in: [ 'https://test-pds.gwei.cz' ] },
    $or: [{ "repo.time": { $lte: expiry } }, { "repo": { $exists: false } }],
  }).limit(10000).toArray();

  const results = pooledMap(3, _.shuffle(dids), async (didInfo) => {
  });
  for await (const _ of results) {}
}

if (Deno.args[0] === "daemon") {
  const wait = 60 * 15;

  console.log("Initializing ATScan ..");
  const ats = new ATScan();
  ats.debug = true;
  await ats.init();
  console.log("repo-crawler daemon started");
  console.log("Performing initial crawl ..");
  // initial crawl
  await crawlNew(ats);
  console.log(`Initial crawl done`);
  ats.debug = false;
  console.log(`Processing events [wait=${wait}s] ..`);
  setInterval(() => crawl(ats), wait * 1000);
} else {
  const ats = new ATScan({ debug: true });
  await ats.init();
  await crawlNew(ats);
  Deno.exit();
}
