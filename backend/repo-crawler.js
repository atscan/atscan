import { ensureDir } from "https://deno.land/std@0.192.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.192.0/path/posix.ts";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import * as fsize from "npm:filesize";
import { ATScan } from "./lib/atscan.js";
import { inspect } from "./lib/car.js";
import { timeout } from "./lib/utils.js";
import _ from "npm:lodash";

const filesize = fsize.filesize;

const DB_PATH = "./backend/db/repo";
await ensureDir(DB_PATH);

async function crawl(ats) {
  let expiry = new Date();
  expiry.setDate(expiry.getDate() - 10);

  const dids = await ats.db.did.find({
    //'pds': { $in: [ 'https://test-pds.gwei.cz' ] },
    $or: [{ "repo.time": { $lte: expiry } }, { "repo": { $exists: false } }],
  }).limit(10000).toArray();

  const results = pooledMap(8, _.shuffle(dids), async (didInfo) => {
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
    let repoRes;
    try {
      [repoRes] = await timeout(5000, fetch(url));
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
    let repo;
    try {
      repo = await inspect(data, did, signingKey);
    } catch (e) {
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
  });
  for await (const _ of results) {}
}

if (Deno.args[0] === "daemon") {
  const wait = 60;

  console.log("Initializing ATScan ..");
  const ats = new ATScan();
  ats.debug = true;
  await ats.init();
  console.log("repo-crawler daemon started");
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
  Deno.exit();
}
