import { ATScan } from "./lib/atscan.js";
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

const ats = new ATScan();
await ats.init();

const HTTP_PORT = 6677;
const app = new Application();

const router = new Router();
router
  .get("/pds", async (ctx) => {
    const out = []
    for (const item of (await ats.db.pds.find({}).toArray())) {
      item.host = item.url.replace(/^https?:\/\//, "");
      item.env = (ats.BSKY_OFFICIAL_PDS.includes(item.url) &&
          item.plcs.includes("https://plc.directory"))
        ? "bsky"
        : (item.plcs.includes("https://plc.bsky-sandbox.dev")
          ? "sandbox"
          : null);
      //item.didsCount = await ats.db.did.countDocuments({ 'pds': { $in: [ item.url ] }})
      out.push(item)
    }
    ctx.response.body = out.filter((i) => i.env)
  })
  .get("/plc", async (ctx) => {
    const out = []
    for (const plc of ats.defaultPLC) {
        plc.host = plc.url.replace(/^https?:\/\//, "");
        plc.didsCount = await ats.db.did.countDocuments({ src: plc.url })
        plc.lastUpdate = (await ats.db.meta.findOne({ key: `lastUpdate:${plc.url}` })).value
        out.push(plc)
    }
    ctx.response.body = out;
  })
  .get("/did", async (ctx) => {
    const out = []
    for (const did of (await ats.db.did.find({}).sort({ time: -1 }).limit(100).toArray())) {
        did.srcHost = did.src.replace(/^https?:\/\//, "");
        out.push(did)
    }
    ctx.response.body = out;
  })
  .get("/:id", async (ctx) => {
    if (!ctx.params.id.match(/^did\:/)) {
        return ctx.status = 404;
    }
    const did = ctx.params.id
    const item = await ats.db.did.findOne({ did })
    item.env = ((item.src === "https://plc.directory")
    ? "bsky"
    : (item.src === "https://plc.bsky-sandbox.dev")
        ? "sbox"
        : null);
    ctx.response.body = item
  })
  .get("/pds/:host", async (ctx) => {
    const host = ctx.params.host
    const item = await ats.db.pds.findOne({ url: `https://${host}` })
    item.host = item.url.replace(/^https?:\/\//, "");
    item.env = (ats.BSKY_OFFICIAL_PDS.includes(item.url) &&
        item.plcs.includes("https://plc.directory"))
    ? "bsky"
    : (item.plcs.includes("https://plc.bsky-sandbox.dev")
        ? "sandbox"
        : null);
    ctx.response.body = item
  })
  .get("/", ctx => {
    ctx.response.body = "ATScan API"
  })

app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());
app.listen({ port: HTTP_PORT });

console.log(`ATScan API started at port ${HTTP_PORT}`);
