//import { Bson, MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { load as envLoad } from "https://deno.land/std@0.192.0/dotenv/mod.ts";
import { parse, stringify } from "https://deno.land/std@0.192.0/yaml/mod.ts";
import { MongoClient } from "npm:mongodb";
import { InfluxDB } from "npm:@influxdata/influxdb-client";
import { makeQueues } from "./queues.js";

export class ATScan {
  constructor(opts = {}) {
    this.verbose = opts.verbose;
    this.debug = opts.debug;
    this.enableQueues = opts.enableQueues || false;
    console.log(this.enableQueues);
  }

  async init() {
    this.env = await envLoad();
    await this.ecosystemLoad();
    const influxConfig = {
      url: this.env.INFLUXDB_HOST,
      token: this.env.INFLUXDB_TOKEN,
    };
    this.influx = new InfluxDB(influxConfig);
    this.influxQuery = this.influx.getQueryApi(this.env.INFLUXDB_ORG);
    this.client = new MongoClient(this.env.MONGODB_URL);
    await this.client.connect();
    this.dbRaw = this.client.db("test");
    this.db = {
      did: this.dbRaw.collection("did"),
      pds: this.dbRaw.collection("pds"),
      meta: this.dbRaw.collection("meta"),
    };
    console.log(`Connected to MongoDB: ${this.env.MONGODB_URL}`);
    if (this.enableQueues) {
      this.queues = await makeQueues(this);
      console.log(`Queues initialized: ${Object.keys(this.queues).join(", ")}`);
    }
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
    const res = await fetch(this.env.ATSCAN_ECOSYSTEM_URL);
    this.ecosystem = await res.json();
    console.log(`Ecosystem updated: ${this.env.ATSCAN_ECOSYSTEM_URL}`);
  }
  startDaemon() {
    console.log("Starting daemon ..");
    const ecosInt = setInterval(() => this.ecosystemLoad(), 30 * 1000);
  }

  async writeInflux(name, type, value, tags = []) {
    const point = `${name},${
      tags.map((t) => t.join("=")).join(",")
    } value=${value} ${Date.now()}`;
    const resp = await fetch(
      `${this.env.INFLUXDB_HOST}/api/v2/write?org=${this.env.INFLUXDB_ORG}&bucket=${this.env.INFLUXDB_BUCKET}&precision=ms`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.env.INFLUXDB_TOKEN}`,
        },
        body: point,
      },
    );
    if (resp.status > 299) {
      console.error("influx error: " + resp.status, this.env.INFLUXDB_TOKEN);
      console.error(await resp.json());
    }
    return true;
  }

  redisConnectionOptions() {
    return {
      host: this.env.REDIS_HOST || "localhost",
      port: this.env.REDIS_PORT || "6379",
    };
  }
}
