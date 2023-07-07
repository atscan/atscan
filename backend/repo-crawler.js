import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { ATScan } from "./lib/atscan.js";
import { differenceInMinutes } from "npm:date-fns";
import _ from "npm:lodash";

const CONCURRENCY = 4;

const counters = { total: 0 };

async function processPDSRepos(ats, repos, item) {
  let count = 0;
  const objs = await ats.db.did.find({
    did: { $in: repos.repos.map((r) => r.did) },
  }).toArray();
  for (const repo of repos.repos) {
    const didObj = objs.find((d) => d.did === repo.did);
    if (!didObj) {
      console.error(`DID ${repo.did} not exists?? (!!)`);
      continue;
    }

    if (repo.head !== didObj.repo?.root) {
      // ignore dids which was updated in last 20h hours
      if (didObj.repo) {
        const diff = differenceInMinutes(
          new Date(),
          new Date(didObj.repo.time),
        );
        const size = didObj.repo.size || 0;
        if (diff < (20 * 60) && size > 20000) {
          continue;
        }
      }
      const task = await ats.queues.repoSnapshot.add(repo.did, didObj, {
        priority: 100,
        jobId: repo.did,
      });
      //console.log(task)
      count++;
    }
  }
  return { count };
}
async function getPDSRepos(item, cursor = null) {
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
  if (!counters[item.url]) {
    counters[item.url] = 1;
  } else {
    counters[item.url]++;
  }
  const repos = await getPDSRepos(item, cursor);
  if (repos?.repos) {
    const { count } = await processPDSRepos(ats, repos, item);
    counters.total += count;
    console.log(
      `total=${counters.total} [PDS=${item.url} page=${
        counters[item.url]
      } count=${count}]`,
    );

    if (repos.repos.length === 1000) {
      await traversePDSRepos(ats, item, repos.cursor);
    }
  }
}

async function crawlNew(ats) {
  const pds = await ats.db.pds.find({}).toArray();
  const results = pooledMap(CONCURRENCY, _.shuffle(pds), async (item) => {
    /*if (item.url !== "https://bsky.social") {
      return null;
    }*/
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
  const ats = new ATScan({ enableQueues: true });
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
  const ats = new ATScan({ debug: true, enableQueues: true });
  await ats.init();
  await crawlNew(ats);
  Deno.exit();
}
