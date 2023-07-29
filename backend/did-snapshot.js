import { ATScan } from "./lib/atscan.js";
import { ensureDir } from "https://deno.land/std@0.192.0/fs/ensure_dir.ts";
import { emptyDir } from "https://deno.land/std@0.192.0/fs/empty_dir.ts";


const ats = new ATScan();
ats.debug = true;
await ats.init();

const limit = 1000;
let total = await ats.db.did.count()
let i = 0

const SNAPSHOT_DIR = "/corn/atscan-db/snapshots"
const SNAPSHOT_PREPARE_DIR = SNAPSHOT_DIR + "/did/prepare"
const SNAPSHOT_PUBLISH_DIR = SNAPSHOT_DIR + "/public/did"

await emptyDir(SNAPSHOT_PREPARE_DIR)

async function dump (root) {
    async function iterator () {
        for (const x of await ats.db.did.find().limit(limit).skip(i).toArray()) {
            const src = x.src.replace(/^https?:\/\//, '')
            const shards = x.did.substring(8)
            const dir = [root, src, ...[shards.substring(0,2), shards.substring(2,2)]].join("/")
            await ensureDir(dir)
            await Deno.writeTextFile(`${dir}/${x.did.replace(/^did:plc:/,'')}.json`, JSON.stringify(x, null, 2))
            i++;
        }
    }

    let done = false
    while (!done) {
        console.log(i + ' ...')
        await iterator()

        if (i >= total) {
            done = true
        }
    }
}

async function _(c, opts) {
    console.log(`running ${c} ${opts.args.join(" ")}`);
    const cmd = new Deno.Command(c, opts);
    const { stderr, stdout } = await cmd.output()

    const err = new TextDecoder().decode(stderr)
    console.log(err.trim())
    
    const out = new TextDecoder().decode(stdout) 
    console.log(out.trim())

    return out
}

async function compress (dir) {
    for await (const f of Deno.readDir(dir)) {
        const fb = (new Date).toISOString().substring(0, 10) + '_' + f.name
        const pd = SNAPSHOT_PUBLISH_DIR + '/' + f.name
        if (!f.isDirectory) {
            continue
        }
        await _("bash", {args: [`/corn/atscan/backend/did-snapshot-publish.sh`, dir, f.name, fb, pd]})
      }

}

await dump(SNAPSHOT_PREPARE_DIR)
await compress(SNAPSHOT_PREPARE_DIR)

console.log('done')
Deno.exit()