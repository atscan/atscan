import { ATScan } from "./lib/atscan.js";
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { minidenticon } from "npm:minidenticons@4.2.0";
import _ from "npm:lodash";

const ats = new ATScan({ enableQueues: true, enableNats: true });
await ats.init();
ats.startDaemon();

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
      Object.assign(item, prepareObject("did", item));
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
      Object.assign(item, prepareObject("pds", item));
      ats.nats.publish(
        `ats.api.pds.${sub === "ats.service.pds.create" ? "create" : "update"}`,
        codec.encode(item),
      );
    }
  })();
}

const HTTP_PORT = ats.env.PORT || 6677;
const app = new Application();

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

const router = new Router();

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

function prepareObject(type, item) {
  switch (type) {
    case "pds":
      item.host = item.url.replace(/^https?:\/\//, "");
      item.fed = findPDSFed(item);
      item.err = Boolean(item.inspect?.current?.err);
      item.status = !item.inspect
        ? "unknown"
        : (item.inspect?.current.err ? "offline" : "online");

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
      item.srcHost = item.src.replace(/^https?:\/\//, "");
      item.fed = findDIDFed(item);
      break;
  }
  return item;
}

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
      Object.assign(item, prepareObject("pds", item));
      //item.didsCount = await ats.db.did.countDocuments({ 'pds': { $in: [ item.url ] }})
      out.push(item);
    }
    ctx.response.body = out; //.filter((i) => i.fed);
    perf(ctx);
  })
  .get("/pds/:host", async (ctx) => {
    let host = ctx.params.host;
    let https = true;
    if (host.startsWith("localhost:")) {
      https = false;
    }
    const q = { url: `http${https ? "s" : ""}://${host}` };
    const item = await ats.db.pds.findOne(q);
    if (!item) {
      return ctx.response.code = 404;
    }
    Object.assign(item, prepareObject("pds", item));

    const query = `
      from(bucket: "ats-stats")
        |> range(start: -1d)
        |> filter(fn: (r) => r["_measurement"] == "pds_response_time")
        |> filter(fn: (r) => r["pds"] == "${item.host}")
        |> aggregateWindow(every: 3m, fn: mean, createEmpty: true)`;

    item.responseTimesDay = await ats.influxQuery.collectRows(query);

    ctx.response.body = item;
    perf(ctx);
  })
  .get("/dids", async (ctx) => {
    const out = [];
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
        query.$and[0].$or.push({ did: { $regex: text } });
        query.$and[0].$or.push({
          "revs.operation.alsoKnownAs": { $regex: text },
        });
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
    const count = await ats.db.did.count(query);

    for (
      const did
        of (await ats.db.did.find(query).sort(sort).limit(limit).toArray())
    ) {
      Object.assign(did, prepareObject("did", did));
      out.push(did);
    }

    ctx.response.headers.append("X-Total-Count", count);
    ctx.response.body = ctx.request.headers.get("x-ats-wrapped") === "true"
      ? { count, items: out }
      : out;
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
  .get("/plc", async (ctx) => {
    const out = [];
    for (const plc of ats.ecosystem.data["plc-directories"]) {
      plc.host = plc.url.replace(/^https?:\/\//, "");
      plc.didsCount = await ats.db.did.countDocuments({ src: plc.url });
      plc.pdsCount = await ats.db.pds.countDocuments({
        plcs: { $in: [plc.url] },
      });
      plc.lastUpdate =
        (await ats.db.meta.findOne({ key: `lastUpdate:${plc.url}` })).value;
      out.push(plc);
    }
    ctx.response.body = out;
    perf(ctx);
  })
  .get("/_metrics", async (ctx) => {
    const metrics = {
      pds_count: [await ats.db.pds.count()],
      did_count: [await ats.db.did.count()],
    };
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
    }
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
      return ctx.status = 404;
    }
    const did = ctx.params.id;
    const item = await ats.db.did.findOne({ did });
    if (!item) {
      return ctx.status = 404;
    }
    item.fed = findDIDFed(item);
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
