import { ensureDir } from "https://deno.land/std@0.192.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.192.0/path/posix.ts";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import * as fsize from "npm:filesize";
import { ATScan } from "./lib/atscan.js";
import { inspect } from "./lib/car.js";
import { timeout } from "./lib/utils.js";
import _ from "npm:lodash";
import { filesize as _filesize } from "npm:filesize";

const filesize = fsize.filesize;

const DB_PATH = "./backend/db/repo";
await ensureDir(DB_PATH);

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
      await saveRepo(ats, did);
    }
  }
}
async function getPDSRepos(item, cursor = null) {
  console.log(`Updating PDS=${item.url} ..`);
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

async function saveRepo(ats, didInfo) {
  if (didInfo.skipRepo) {
    return null;
  }

  const did = didInfo.did;
  const signingKey = didInfo.revs[didInfo.revs.length - 1].operation
    .verificationMethods?.atproto;

  if (!signingKey) {
    await ats.db.did.updateOne({ did }, {
      $set: { repo: { error: "no signing key", time: new Date() } },
    });
    return;
  }
  const pds = didInfo.pds[0];
  //console.log(`[${did}@${pds}] Getting repo ..`);

  // fetch remote repo
  const url = `${pds}/xrpc/com.atproto.sync.getRepo?did=${did}`;
  console.log(url);
  let repoRes;
  try {
    [repoRes] = await timeout(20 * 1000, fetch(url));
  } catch (e) {
    repoRes = { ok: false };
    console.error(e);

    await ats.db.did.updateOne({ did }, {
      $set: { repo: { error: e.message, time: new Date() } },
    });
    return;
  }
  if (!repoRes.ok) {
    let message = null;
    if ([403, 500].includes(repoRes.status)) {
      let err;
      try {
        err = await repoRes.json();
      } catch {}
      message = err?.message;
    }
    console.error(url, message);
    await ats.db.did.updateOne({ did }, {
      $set: { repo: { error: message, time: new Date() } },
    });
    return;
  }
  //console.log(`[${did}@${pds}] Inspecting CAR ..`);
  const data = new Uint8Array(await repoRes.arrayBuffer());
  console.log(`downloaded: ${url} [${filesize(data.length)}]`);
  let repo;
  try {
    repo = await inspect(data, did, signingKey);
  } catch (e) {
    console.error(e);
    await ats.db.did.updateOne({ did }, {
      $set: { repo: { error: e.message, time: new Date() } },
    });
    return;
  }

  const carFn = join(DB_PATH, `${did}.car`);
  await Deno.writeFile(carFn, data);
  //console.log(`[${did}@${pds}] File written: ${carFn}`);

  const indexFn = join(DB_PATH, `${did}.json`);
  await Deno.writeTextFile(
    indexFn,
    JSON.stringify(
      { did, signingKey, pds, root: repo.root, commits: repo.commits },
      null,
      2,
    ),
  );
  //console.log(`[${did}@${pds}] File written: ${indexFn}`);
  console.log(
    `[${did}@${pds}] displayName=${
      JSON.stringify(repo.profile?.displayName)
    } [${filesize(repo.size)}]`,
  );
  /*console.log(
    `[${did}@${pds}] Done [${
      Object.keys(repo.collections).map(
        (c) => [c + ":" + repo.collections[c]],
      ).join(", ")
    }]`,
  );*/

  await ats.db.did.updateOne({ did }, { $set: { repo } });
  //console.log(out)
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
