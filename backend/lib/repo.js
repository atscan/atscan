import { inspect } from "./car.js";
import { timeout } from "./utils.js";
import { join } from "https://deno.land/std@0.192.0/path/posix.ts";
import { ensureDir } from "https://deno.land/std@0.192.0/fs/ensure_dir.ts";
import * as fsize from "npm:filesize";

const filesize = fsize.filesize;

export async function saveRepo(ats, didInfo, job = null) {
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

  // fetch remote repo
  const url = `${pds}/xrpc/com.atproto.sync.getRepo?did=${did}`;
  if (job) {
    job.log(url);
  }
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

  // car inspect
  const data = new Uint8Array(await repoRes.arrayBuffer());
  if (job) {
    job.log(`downloaded: ${url} [${filesize(data.length)}]`);
    await job.updateProgress(15);
  }
  let repo;
  try {
    repo = await inspect(data, did, signingKey, job);
  } catch (e) {
    console.error(e);
    await ats.db.did.updateOne({ did }, {
      $set: { repo: { error: e.message, time: new Date() } },
    });
    return;
  }

  // ensure db directory
  const dbPathBase = ats.env.ATSCAN_DB_PATH || "./db";
  const dbPath = join(dbPathBase, "repo");
  await ensureDir(dbPath);

  // write car file
  const carFn = join(dbPath, `${did}.car`);
  await Deno.writeFile(carFn, data);

  // write index file
  const indexFn = join(dbPath, `${did}.json`);
  await Deno.writeTextFile(
    indexFn,
    JSON.stringify(
      { did, signingKey, pds, root: repo.root, commits: repo.commits },
      null,
      2,
    ),
  );
  if (job) {
    await job.log(
      `[${did}@${pds}] displayName=${
        JSON.stringify(repo.profile?.displayName)
      } [${filesize(repo.size)}] ${carFn}`,
    );
    await job.updateProgress(99);
  }
  // update db record
  await ats.db.did.updateOne({ did }, { $set: { repo } });
}
