//import { Bson, MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { load as envLoad } from "https://deno.land/std@0.192.0/dotenv/mod.ts";
import { parse, stringify } from "https://deno.land/std@0.192.0/yaml/mod.ts";
import { MongoClient } from "npm:mongodb";
import { InfluxDB } from "npm:@influxdata/influxdb-client";
import { createClient as redisCreateClient } from "npm:redis@^4.6";
import { makeQueues } from "./queues.js";
import {
  connect as NATSConnect,
  JSONCodec,
  StringCodec,
} from "https://deno.land/x/nats/src/mod.ts";

export class ATScan {
  constructor(opts = {}) {
    this.verbose = opts.verbose;
    this.debug = opts.debug;
    this.enableQueues = opts.enableQueues || false;
    this.enableNats = opts.enableNats || false;
    //console.log(this.enableQueues);
  }

  async init() {
    this.env = Object.assign(Deno.env.toObject(), await envLoad());
    await this.ecosystemLoad();
    // redis
    const redisUrl = "redis://localhost:6379";
    this.redis = redisCreateClient({
      url: redisUrl,
      pingInterval: 1000,
    });
    await this.redis.connect();
    console.log(`Connected to Redis: ${redisUrl}`);
    // influxdb
    const influxConfig = {
      url: this.env.INFLUXDB_HOST,
      token: this.env.INFLUXDB_TOKEN,
    };
    this.influx = new InfluxDB(influxConfig);
    this.influxQuery = this.influx.getQueryApi(this.env.INFLUXDB_ORG);
    // monbodb
    this.client = new MongoClient(this.env.MONGODB_URL);
    await this.client.connect();
    this.dbRaw = this.client.db("test");
    this.db = {
      did: this.dbRaw.collection("did"),
      pds: this.dbRaw.collection("pds"),
      meta: this.dbRaw.collection("meta"),
    };
    console.log(`Connected to MongoDB: ${this.env.MONGODB_URL}`);
    // nats - optional
    if (this.enableNats) {
      await (async () => {
        this.nats = await NATSConnect({
          servers: this.env.NATS_SERVERS,
        });
        this.JSONCodec = JSONCodec();
        console.log(`Connected to NATS: ${this.env.NATS_SERVERS}`);
      })();
    }
    if (this.enableQueues) {
      this.queues = await makeQueues(this);
      console.log(`Queues initialized: ${Object.keys(this.queues).join(", ")}`);
    }
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
