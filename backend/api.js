import { ATScan } from "./lib/atscan.js";
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { minidenticon } from "npm:minidenticons@4.2.0";
import _ from "npm:lodash";

const ats = new ATScan({ enableQueues: true, enableNats: true });
await ats.init();
ats.startDaemon();

const servers = ["local", "texas", "tokyo"];
const HTTP_PORT = ats.env.PORT || 6677;

if (Number(ats.env.PORT) === 6677) {
  const didUpdatedSub = ats.nats.subscribe("ats.service.plc.did.*");
  (async () => {
    for await (const m of didUpdatedSub) {
      const sub = m.subject;
      const codec = ats.JSONCodec;
      const did = codec.decode(m.data)?.did;

      const item = await ats.db.did.findOne({ did });
      if (!item) {
        continue;
      }
      Object.assign(item, await prepareObject("did", item));
      item.revs = [item.revs[item.revs.length - 1]];
      ats.nats.publish(
        `ats.api.did.${
          sub === "ats.service.plc.did.create" ? "create" : "update"
        }`,
        codec.encode(item),
      );
    }
  })();

  const pdsUpdatedSub = ats.nats.subscribe("ats.service.pds.*");
  (async () => {
    for await (const m of pdsUpdatedSub) {
      const sub = m.subject;
      const codec = ats.JSONCodec;
      const url = codec.decode(m.data)?.url;

      const item = await ats.db.pds.findOne({ url });
      if (!item) {
        continue;
      }
      Object.assign(item, await prepareObject("pds", item));
      ats.nats.publish(
        `ats.api.pds.${sub === "ats.service.pds.create" ? "create" : "update"}`,
        codec.encode(item),
      );
    }
  })();
}

function perf(ctx) {
  if (ctx.request.url.toString().startsWith("http://localhost:")) {
    return null;
  }
  console.log(
    `[${HTTP_PORT}] GET ${ctx.request.url} [${
      performance.now() - ctx.perf
    }ms] ${ctx.request.headers.get("user-agent")}`,
  );
}

function findPDSFed(item) {
  const ff = ats.ecosystem.data.federations.find((fed) => {
    if (fed.pds) {
      return fed.pds === item.url;
    } else {
      return item.plcs.includes(fed.plc);
    }
  });
  return ff ? ff.id : null;
}
function findDIDFed(item) {
  const ff = ats.ecosystem.data.federations.find((fed) => {
    if (fed.pds) {
      return item.pds.includes(fed.pds) && item.src === fed.plc;
    } else {
      return item.src === fed.plc;
    }
  });
  return ff ? ff.id : null;
}

function pdsUrlFromHost(host) {
  let https = true;
  if (host.startsWith("localhost:")) {
    https = false;
  }
  return `http${https ? "s" : ""}://${host}`;
}

function getPDSStatus(item) {
  if (!item.inspect) {
    return "unknown";
  }
  const bare = Object.keys(item.inspect).filter((k) => servers.includes(k));
  if (bare.length === 0) {
    return "unknown";
  }
  const offlineNum = bare.reduce(
    (acc, k) => acc += item.inspect[k].err ? 1 : 0,
    0,
  );
  if (bare.length === offlineNum) {
    return "offline";
  }
  return offlineNum > 0 ? "degraded" : "online";
}

async function prepareObject(type, item) {
  switch (type) {
    case "pds":
      item.host = item.url.replace(/^https?:\/\//, "");
      item.fed = findPDSFed(item);
      item.err = Boolean(item.inspect?.current?.err);
      item.status = getPDSStatus(item);

      const respTimes = item.inspect
        ? Object.keys(item.inspect).filter((k) =>
          !["current", "lastOnline"].includes(k)
        ).map((k) => item.inspect[k].ms || null).filter((k) => k)
        : [];

      item.responseTime = !item.inspect || item.status !== "online"
        ? null
        : (respTimes.length > 0 ? _.mean(respTimes) : null);
      break;

    case "did":
      item.current = item.revs && item.revs.length > 0
        ? item.revs[item.revs.length - 1]
        : null;
      item.handle = item.current && item.current.operation?.alsoKnownAs
        ? item.current.operation?.alsoKnownAs[0]?.replace(/^at:\/\//, "")
        : null;
      item.srcHost = item.src.replace(/^https?:\/\//, "");
      item.fed = findDIDFed(item);
      break;

    case "bgs":
      item.host = item.url.replace(/^https?:\/\//, "");
      item.status = await ats.redis.hGetAll(`ats:bgs:${item.host}`);
      break;

    case "plc":
      item.host = item.url.replace(/^https?:\/\//, "");
      item.didsCount = await ats.db.did.countDocuments({ src: item.url });
      item.pdsCount = await ats.db.pds.countDocuments({
        plcs: { $in: [item.url] },
      });
      item.lastUpdate =
        (await ats.db.meta.findOne({ key: `lastUpdate:${item.url}` })).value;
      break;
  }
  return item;
}

const app = new Application();
const router = new Router();

router
  .get("/", (ctx) => {
    ctx.response.body = "ATScan API";
    perf(ctx);
  })
  .get("/pds", async (ctx) => {
    const out = [];
    for (const item of (await ats.db.pds.find({}).toArray())) {
      if (!item.url) {
        console.error("PDS without url? ", item);
        continue;
      }
      Object.assign(item, await prepareObject("pds", item));
      //item.didsCount = await ats.db.did.countDocuments({ 'pds': { $in: [ item.url ] }})
      out.push(item);
    }
    ctx.response.body = out; //.filter((i) => i.fed);
    perf(ctx);
  })
  .get("/pds/:host", async (ctx) => {
    const url = pdsUrlFromHost(ctx.params.host);
    const item = await ats.db.pds.findOne({ url });
    if (!item) {
      return ctx.response.code = 404;
    }
    Object.assign(item, await prepareObject("pds", item));

    ctx.response.body = item;
    perf(ctx);
  })
  .get("/pds/:host/latency", async (ctx) => {
    const url = pdsUrlFromHost(ctx.params.host);
    const item = await ats.db.pds.findOne({ url });
    if (!item) {
      return ctx.response.code = 404;
    }
    const host = item.url.replace(/^https?:\/\//, "");
    const allowedRanges = ["24h", "7d", "30d"];
    const rangesAggregation = ["3m", "15m", "1h"];
    const userRange = ctx.request.url.searchParams.get("range");
    const range = userRange && allowedRanges.includes(userRange)
      ? userRange
      : "24h";
    const aggregation = rangesAggregation[allowedRanges.indexOf(range)];
    const query = `
      from(bucket: "ats-stats")
        |> range(start: -${range})
        |> filter(fn: (r) => r["_measurement"] == "pds_response_time")
        |> filter(fn: (r) => r["pds"] == "${host}")
        |> aggregateWindow(every: ${aggregation}, fn: mean, createEmpty: true)`;

    const data = await ats.influxQuery.collectRows(query);
    ctx.response.body = { range, aggregation, data };
    perf(ctx);
  })
  .get("/dids", async (ctx) => {
    const query = { $and: [{}] };

    const availableSort = {
      did: { key: "did" },
      lastMod: { key: "lastMod" },
      pds: { key: "pds" },
      size: { key: "repo.size" },
      commits: { key: "repo.commits" },
      lastSnapshot: { key: "repo.time" },
    };

    let inputSort = ctx.request.url.searchParams.get("sort");
    let inputSortDirection = 1;
    if (inputSort && inputSort.startsWith("!")) {
      inputSortDirection = -1;
      inputSort = inputSort.replace(/^!/, "");
    }
    let inputSortConfig = null;
    if (inputSort) {
      inputSortConfig = availableSort[inputSort];
    }
    let sort = inputSortConfig
      ? { [inputSortConfig.key]: inputSortDirection }
      : { lastMod: -1 };

    let q = ctx.request.url.searchParams.get("q")?.replace(/^@/, "");
    let searchInfo = null;
    if (q) {
      query.$and[0].$or = [];
      const tokens = q.split(" ");
      let textArr = [];
      for (const t of tokens) {
        let plcMatch = t.match(/^plc:(https:\/\/|)(.+)$/);
        let pdsMatch = t.match(/^pds:(https:\/\/|)(.+)$/);
        let fedMatch = t.match(/^fed:(.+)$/);
        if (plcMatch) {
          query.$and.push({ src: "https://" + plcMatch[2] });
        } else if (pdsMatch) {
          query.$and.push({ pds: { $in: ["https://" + pdsMatch[2]] } });
        } else if (fedMatch) {
          const fed = ats.ecosystem.data.federations.find((f) =>
            f.id === fedMatch[1]
          );
          if (fed) {
            query.$and.push({ src: fed.plc });
          }
        } else {
          textArr.push(t);
        }
      }
      const text = textArr.join(" ").trim();
      if (text) {
        const tsRes = await fetch(
          "http://localhost:8108/multi_search?x-typesense-api-key=Kaey9ahMo7xoob1haivaithe2Aighoo3azohl2Joo5Aemoh4aishoogugh3Oowim",
          {
            method: "post",
            body: JSON.stringify({
              searches: [
                {
                  collection: "dids",
                  exhaustive_search: true,
                  facet_by: "",
                  highlight_full_fields: "did,handle,prevHandles,name,desc",
                  page: 1,
                  per_page: 12,
                  q: text,
                  query_by: "did,handle,prevHandles,name,desc",
                  sort_by: "",
                },
              ],
            }),
          },
        );
        const ts = await tsRes.json();
        const didHits = ts.results[0].hits.map((hit) => hit.document.did);
        searchInfo = ts.results[0];

        query.$and[0].$or.push({ did: { $in: didHits } });

        /*query.$and[0].$or.push({ did: { $regex: text } });
        query.$and[0].$or.push({
          "revs.operation.alsoKnownAs": { $regex: text },
        });*/
      }
      if (query.$and[0].$or.length === 0) {
        delete query.$and[0].$or;
      }
      //sort = { score: { $meta: "textScore" } }
    }

    const maxLimit = 100;
    let limit = Number(ctx.request.url.searchParams.get("limit") || 100);
    if (limit > maxLimit) {
      limit = maxLimit;
    }

    //console.log(JSON.stringify(query, null, 2), { sort, limit });
    //console.log(JSON.stringify({ query, sort, inputSort, inputSortConfig }));
    let count = await ats.db.did.count(query);

    let out = [];
    for (
      const did
        of (await ats.db.did.find(query).sort(sort).limit(limit).toArray())
    ) {
      Object.assign(did, await prepareObject("did", did));
      out.push(did);
    }

    if (searchInfo?.hits) {
      out = out.map((item) => {
        const si = searchInfo.hits.find((h) => h.document.did === item.did);
        item.searchSort = searchInfo.hits.indexOf(si);
        return item;
      });

      out = out.sort((x, y) => x.searchSort > y.searchSort ? 1 : -1);
      count = searchInfo.found;
    }

    ctx.response.headers.append("X-Total-Count", count);
    ctx.response.body = ctx.request.headers.get("x-ats-wrapped") === "true"
      ? { count, items: out }
      : out;
    perf(ctx);
  })
  .get("/bgs", async (ctx) => {
    const items = await Promise.all(
      ats.ecosystem.data["bgs-instances"].map(async (item) => {
        return Object.assign(item, await prepareObject("bgs", item));
      }),
    );
    ctx.response.body = items;
    perf(ctx);
  })
  .get("/bgs/:host", async (ctx) => {
    const item = ats.ecosystem.data["bgs-instances"].find((f) =>
      f.url === "https://" + ctx.params.host
    );
    if (!item) {
      return ctx.response.code = 404;
    }

    Object.assign(item, await prepareObject("bgs", item));
    ctx.response.body = item;
    perf(ctx);
  })
  .get("/bgs/:host/ops", async (ctx) => {
    const item = ats.ecosystem.data["bgs-instances"].find((f) =>
      f.url === "https://" + ctx.params.host
    );
    if (!item) {
      return ctx.response.code = 404;
    }
    const host = item.url.replace(/^https?:\/\//, "");
    const allowedRanges = ["1h", "24h", "7d", "30d"];
    const rangesAggregation = ["15s", "5m", "30m", "2h"];
    const userRange = ctx.request.url.searchParams.get("range");
    const range = userRange && allowedRanges.includes(userRange)
      ? userRange
      : "24h";
    const aggregation = rangesAggregation[allowedRanges.indexOf(range)];
    let query = `
      from(bucket: "ats-nodes")
        |> range(start: -${range})
        |> filter(fn: (r) => r["_measurement"] == "firehose_event")
        |> filter(fn: (r) => r["server"] == "snowden")
        |> filter(fn: (r) => r["bgs"] == "${host}")
        |> filter(fn: (r) => r["_field"] == "value")
        |> derivative(unit: 1s,  nonNegative: true)
        |> aggregateWindow(every: ${aggregation}, fn: mean, createEmpty: true)`;

    if (!ctx.request.url.searchParams.get("complex")) {
      query += `   
        |> group(columns: ["_time"], mode:"by")
        |> sum()
        |> group()`;
    }

    const data = await ats.influxQuery.collectRows(query);
    ctx.response.body = { range, aggregation, data };
    perf(ctx);
  })
  .get("/bgs/:host/postLatency", async (ctx) => {
    const item = ats.ecosystem.data["bgs-instances"].find((f) =>
      f.url === "https://" + ctx.params.host
    );
    if (!item) {
      return ctx.response.code = 404;
    }
    const host = item.url.replace(/^https?:\/\//, "");
    const allowedRanges = ["1h", "24h", "7d", "30d"];
    const rangesAggregation = ["15s", "5m", "30m", "2h"];
    const userRange = ctx.request.url.searchParams.get("range");
    const range = userRange && allowedRanges.includes(userRange)
      ? userRange
      : "24h";
    const aggregation = rangesAggregation[allowedRanges.indexOf(range)];
    let query = `
      from(bucket: "ats-nodes")
        |> range(start: -${range})
        |> filter(fn: (r) => r["_measurement"] == "post_latency")
        |> filter(fn: (r) => r["server"] == "snowden")
        |> filter(fn: (r) => r["bgs"] == "${host}")
        |> filter(fn: (r) => r["_field"] == "value")
        |> aggregateWindow(every: ${aggregation}, fn: mean, createEmpty: true)`;

    if (!ctx.request.url.searchParams.get("complex")) {
      query += `   
        |> group(columns: ["_time"], mode:"by")
        |> sum()
        |> group()`;
    }

    const data = await ats.influxQuery.collectRows(query);
    ctx.response.body = { range, aggregation, data };
    perf(ctx);
  })
  .get("/feds", (ctx) => {
    ctx.response.body = ats.ecosystem.data.federations;
    perf(ctx);
  })
  .get("/fed/:id", (ctx) => {
    const item = ats.ecosystem.data.federations.find((f) =>
      f.id === ctx.params.id
    );
    if (!item) {
      return ctx.response.code = 404;
    }
    ctx.response.body = item;
    perf(ctx);
  })
  .get("/clients", (ctx) => {
    ctx.response.body = ats.ecosystem.data.clients;
    perf(ctx);
  })
  .get("/client/:id", (ctx) => {
    const item = ats.ecosystem.data.clients.find((f) => f.id === ctx.params.id);
    if (!item) {
      return ctx.response.code = 404;
    }
    ctx.response.body = item;
    perf(ctx);
  })
  .get("/plcs", async (ctx) => {
    const out = [];
    for (const plc of ats.ecosystem.data["plc-directories"]) {
      out.push(Object.assign(plc, await prepareObject("plc", plc)));
    }
    ctx.response.body = out;
    perf(ctx);
  })
  .get("/plc/:host", async (ctx) => {
    const item = ats.ecosystem.data["plc-directories"].find((f) =>
      f.url === `https://${ctx.params.host}`
    );
    if (!item) {
      return ctx.response.code = 404;
    }
    Object.assign(item, await prepareObject("plc", item));
    ctx.response.body = item;
    perf(ctx);
  })
  .get("/_metrics", async (ctx) => {
    const metrics = {};

    await Promise.all([
      (async () => {
        metrics.did_count = [await ats.db.did.count()];
      })(),
      (async () => {
        metrics.pds_count = [await ats.db.pds.count()];
      })(),
      (async () => {
        const statuses = { online: 0, offline: 0, degraded: 0, unknown: 0 };
        for (const pds of await ats.db.pds.find().toArray()) {
          const stn = getPDSStatus(pds);
          statuses[stn]++;
        }
        for (const st of Object.keys(statuses)) {
          metrics[`pds_count{status="${st}"}`] = [statuses[st]];
        }
      })(),
      (async () => {
        for (const queueName of Object.keys(ats.queues)) {
          const queue = ats.queues[queueName];
          const getMetric = async (name) =>
            (await queue.getMetrics(name)).meta.count;

          metrics[`queue_metric_completed{name="${queueName}"}`] = [
            await getMetric("completed"),
          ];
          metrics[`queue_metric_failed{name="${queueName}"}`] = [
            await getMetric("failed"),
          ];
          metrics[`queue_active{name="${queueName}"}`] = [
            await queue.getActiveCount(),
          ];
          metrics[`queue_waiting{name="${queueName}"}`] = [
            await queue.getWaitingCount(),
          ];
          metrics[`queue_waiting_children{name="${queueName}"}`] = [
            await queue.getWaitingChildrenCount(),
          ];
          metrics[`queue_prioritized{name="${queueName}"}`] = [
            await queue.getPrioritizedCount(),
          ];
        }
      })(),
    ]);
    ctx.response.body = Object.keys(metrics).map((m) => {
      const [data, help, type] = metrics[m];
      return `${m} ${data}`;
    }).join("\n") + "\n";
    perf(ctx);
  })
  .get("/:id.svg", async (ctx) => {
    if (!ctx.params.id.startsWith("did:")) {
      return ctx.status = 404;
    }
    ctx.response.body = minidenticon(ctx.params.id);
    ctx.response.headers.set("content-type", "image/svg+xml");
    perf(ctx);
  })
  .get("/:id", async (ctx) => {
    if (!ctx.params.id.match(/^did\:/)) {
      // try to lookup for handle
      const handle = await ats.db.did.findOne({
        "revs.operation.alsoKnownAs": `at://${ctx.params.id}`,
      });
      if (handle) {
        return ctx.response.redirect(`/${handle.did}`);
      } else {
        return ctx.status = 404;
      }
    }
    const did = ctx.params.id;
    const item = await ats.db.did.findOne({ did });
    if (!item) {
      return ctx.status = 404;
    }
    Object.assign(item, await prepareObject("did", item));
    ctx.response.body = item;
    perf(ctx);
  });

app.use(oakCors()); // Enable CORS for All Routes
app.use(async (ctx, next) => {
  ctx.perf = performance.now();
  await next();
});
app.use(router.routes());

app.listen({ port: HTTP_PORT });

console.log(`ATScan API started at port ${HTTP_PORT}`);
