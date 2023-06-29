import { ATScan } from "./lib/atscan.js";
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

const ats = new ATScan();
await ats.init();
ats.startDaemon();

const HTTP_PORT = 6677;
const app = new Application();

function perf(ctx) {
  console.log(
    `GET ${ctx.request.url} [${performance.now() - ctx.perf}ms] ${
      ctx.request.headers.get("user-agent")
    }`,
  );
}

const router = new Router();

router
  .get("/pds", async (ctx) => {
    const out = [];
    for (const item of (await ats.db.pds.find({}).toArray())) {
      item.host = item.url.replace(/^https?:\/\//, "");
      item.env = (ats.BSKY_OFFICIAL_PDS.includes(item.url) &&
          item.plcs.includes("https://plc.directory"))
        ? "bluesky"
        : (item.plcs.includes("https://plc.bsky-sandbox.dev")
          ? "sandbox"
          : null);
      //item.didsCount = await ats.db.did.countDocuments({ 'pds': { $in: [ item.url ] }})
      out.push(item);
    }
    ctx.response.body = out.filter((i) => i.env);
    perf(ctx);
  })
  .get("/dids", async (ctx) => {
    const out = [];
    const query = { $and: [{}] };
    let sort = { time: -1 };

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
    const count = await ats.db.did.count(query);

    for (
      const did
        of (await ats.db.did.find(query).sort(sort).limit(limit).toArray())
    ) {
      did.srcHost = did.src.replace(/^https?:\/\//, "");
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
      plc.lastUpdate =
        (await ats.db.meta.findOne({ key: `lastUpdate:${plc.url}` })).value;
      out.push(plc);
    }
    ctx.response.body = out;
    perf(ctx);
  })
  .get("/:id", async (ctx) => {
    if (!ctx.params.id.match(/^did\:/)) {
      return ctx.status = 404;
    }
    const did = ctx.params.id;
    const item = await ats.db.did.findOne({ did });
    item.env = (item.src === "https://plc.directory")
      ? "bluesky"
      : (item.src === "https://plc.bsky-sandbox.dev")
      ? "sandbox"
      : null;
    ctx.response.body = item;
    perf(ctx);
  })
  .get("/pds/:host", async (ctx) => {
    let host = ctx.params.host;
    let https = true;
    if (host.startsWith("localhost:")) {
      https = false;
    }
    const q = { url: `http${https ? "s" : ""}://${host}` };
    console.log(host, q);
    const item = await ats.db.pds.findOne(q);
    if (!item) {
      return ctx.response.code = 404;
    }
    item.host = item.url.replace(/^https?:\/\//, "");
    item.env = (ats.BSKY_OFFICIAL_PDS.includes(item.url) &&
        item.plcs.includes("https://plc.directory"))
      ? "bluesky"
      : (item.plcs.includes("https://plc.bsky-sandbox.dev") ? "sandbox" : null);
    ctx.response.body = item;
    perf(ctx);
  })
  .get("/", (ctx) => {
    ctx.response.body = "ATScan API";
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
