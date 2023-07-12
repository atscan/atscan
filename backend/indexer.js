import { ATScan } from "./lib/atscan.js";

const indexers = {
  pdsIndex: {
    interval: 60 * 1000, // 1 min
    handler: async (ats) => {
      for (const pds of await ats.db.pds.find().toArray()) {
        const didsCount = await ats.db.did.countDocuments({
          "pds": { $in: [pds.url] },
        });
        const host = pds.url.replace(/^https?:\/\//, "");

        const stages = [
          { $match: { pds: { $in: [pds.url] } } },
          {
            $group: {
              _id: "$groupField",
              sum: {
                $sum: "$repo.size",
              },
            },
          },
        ];
        const sizeRes = await ats.db.did.aggregate(stages).toArray();
        const size = sizeRes[0].sum;

        await ats.db.pds.updateOne({ url: pds.url }, {
          $set: { didsCount, size },
        });
        await ats.writeInflux("pds_dids_count", "intField", didsCount, [[
          "pds",
          host,
        ]]);
        await ats.writeInflux("pds_size", "intField", size, [["pds", host]]);
        ats.nats.publish(
          "ats.service.pds.update",
          ats.JSONCodec.encode({ url: pds.url }),
        );
      }
      //console.log("indexer round finished");
    },
  },
  bgsIndex: {
    interval: 10 * 1000,
    handler: async (ats) => {
      await Promise.all(ats.ecosystem.data["bgs-instances"].map(async (bgs) => {
        const host = bgs.url.replace(/^https?:\/\//, "");

        const query = `
          from(bucket: "ats-nodes")
            |> range(start: -1m)
            |> filter(fn: (r) => r["_measurement"] == "firehose_event")
            |> filter(fn: (r) => r["server"] == "snowden")
            |> filter(fn: (r) => r["bgs"] == "${host}")
            |> filter(fn: (r) => r["_field"] == "value")
            |> group(columns: ["_time"], mode:"by")
            |> sum()
            |> group()
            |> derivative(unit: 1s,  nonNegative: true)
            |> mean()`;

        const data = await ats.influxQuery.collectRows(query);
        const value = data[0]?._value;
        if (value) {
          await ats.redis.HSET(`ats:bgs:${host}`, "ops", value); // 'OK'
        }
      }));
    },
  },
};

// start
console.log("Initializing ATScan ..");
const ats = new ATScan({ enableNats: true });
ats.debug = true;
await ats.init();
console.log("indexer daemon started");

// initial crawl
console.log("Performing initial index round ..");
await Promise.all(Object.keys(indexers).map((k) => indexers[k].handler(ats)));
console.log(`Initial index round done`);

// intervals
const intervals = [];
for (const key of Object.keys(indexers)) {
  const indexer = indexers[key];
  const interval = indexer.interval || 60 * 1000;
  console.log(`Setting up indexer: ${key} interval=${interval / 1000}s`);

  intervals.push(setInterval(() => indexer.handler(ats), interval));
}
