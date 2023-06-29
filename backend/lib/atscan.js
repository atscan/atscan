//import { Bson, MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { parse, stringify } from "https://deno.land/std@0.184.0/yaml/mod.ts";
import { MongoClient } from "npm:mongodb";
import "https://deno.land/std@0.192.0/dotenv/load.ts";

const BSKY_OFFICIAL_PDS = [
  "https://bsky.social",
];
const ATSCAN_ECOSYSTEM = "https://mirror.ecosystem.atscan.net/index.json";

export class ATScan {
  constructor(opts = {}) {
    this.verbose = opts.verbose;
    this.debug = opts.debug;
    this.BSKY_OFFICIAL_PDS = BSKY_OFFICIAL_PDS;
  }

  async init() {
    await this.ecosystemLoad();
    this.client = new MongoClient(Deno.env.get("MONGODB_URL"));
    await this.client.connect();
    console.log(`Connected to MongoDB: ${Deno.env.get("MONGODB_URL")}`);
    this.dbRaw = this.client.db("test");
    this.db = {
      did: this.dbRaw.collection("did"),
      pds: this.dbRaw.collection("pds"),
      meta: this.dbRaw.collection("meta"),
    };
  }

  async processPlcExport(plc, after = null) {
    const url = plc.url + "/export?after=" + (after || "");
    if (this.debug) {
      console.log(`ProcessPlcExport: ${url}`);
    }
    const req = await fetch(url);
    const lines = await req.text();
    if (!lines) {
      console.error(`No output from PLC! [${url}]`);
      return null;
    }
    const arr = lines.split("\n").map((l) => JSON.parse(l));

    for (const data of arr) {
      const pdsUrl = data.operation.services?.atproto_pds?.endpoint;
      const matcher = { did: data.did, src: plc.url };
      const obj = {
        did: data.did,
        src: plc.url,
        revs: [data],
        time: new Date().toISOString(),
        lastMod: data.createdAt,
        pds: pdsUrl ? [pdsUrl] : [],
      };
      let didRev = 0;
      const found = await this.db.did.findOne(matcher);
      if (found) {
        const revFound = found.revs.find((r) => r.cid === data.cid);
        let updated = false;
        if (!revFound) {
          updated = true;
          didRev = found.revs.length;
          found.revs.push(data);
          //found.time = new Date().toISOString()
          console.log(
            `${
              (new Date()).toISOString()
            } DID: Adding new DID revision: ${data.did}@${didRev}`,
          );
        }
        if (pdsUrl && !found.pds.includes(pdsUrl)) {
          updated = true;
          found.pds.push(pdsUrl);
        }
        if (updated) {
          await this.db.did.updateOne(matcher, {
            $set: {
              time: new Date().toISOString(),
              revs: found.revs,
              pds: found.pds,
              lastMod: found.revs[found.revs.length - 1].createdAt,
            },
          });
        }
      } else {
        console.log(
          `${
            (new Date()).toISOString()
          } DID: Adding new DID revision: ${data.did}@0 (init)`,
        );
        await this.db.did.insertOne(obj);
      }
      if (pdsUrl) {
        const pdsFound = await this.db.pds.findOne({ url: pdsUrl });
        const didId = [data.did, didRev].join("@");
        if (pdsFound) {
          if (!pdsFound.plcs.includes(plc.url)) {
            pdsFound.plcs.push(plcUrl);
            console.log(
              `${
                (new Date()).toISOString()
              } PDS [${pdsUrl}]: Adding new PLC: ${plc.url}`,
            );
            await this.db.pds.updateOne({ url: pdsUrl }, {
              $set: {
                plcs: pdsFound.plcs,
              },
            });
          }
        } else {
          await this.db.pds.insertOne({
            url: pdsUrl,
            plcs: [plc.url],
            time: new Date().toISOString(),
          });
        }
        // update PDS stats
        const didsCount = await this.db.did.countDocuments({
          "pds": { $in: [pdsUrl] },
        });
        await this.db.pds.updateOne({ url: pdsUrl }, { $set: { didsCount } });
      }
    }

    const key = `lastUpdate:${plc.url}`;
    await this.db.meta.updateOne({ key }, {
      $set: { key, value: arr[arr.length - 1].createdAt },
    }, { upsert: true });
    return arr.length !== 1 ? arr[arr.length - 1].createdAt : false;
  }

  async ecosystemLoad() {
    const res = await fetch(ATSCAN_ECOSYSTEM);
    this.ecosystem = await res.json();
    console.log(`Ecosystem updated: ${ATSCAN_ECOSYSTEM}`);
  }
  startDaemon() {
    console.log("Starting daemon ..");
    const ecosInt = setInterval(() => this.ecosystemLoad(), 30 * 1000);
  }
}
