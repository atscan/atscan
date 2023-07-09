import { ATScan } from "./lib/atscan.js";
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { join } from "https://deno.land/std@0.192.0/path/posix.ts";
import { exists } from "https://deno.land/std@0.193.0/fs/exists.ts";
import { ensureDir } from "https://deno.land/std@0.192.0/fs/ensure_dir.ts";
import { Sha256 } from "https://deno.land/std@0.119.0/hash/sha256.ts";
//import imageDecode from "https://deno.land/x/wasm_image_decoder@v0.0.7/mod.js";
//import wasm_image_loader from 'npm:@saschazar/wasm-image-loader';
//import wasm_webp from 'npm:@saschazar/wasm-webp';
//import wasm_webp_options from 'npm:@saschazar/wasm-webp/options';

//const imageLoader = await wasm_image_loader();
//const webp = await wasm_webp();

//import * as zstd from "https://deno.land/x/zstd_wasm/deno/zstd.ts";
//await zstd.init();

const ats = new ATScan();
await ats.init();
ats.startDaemon();

const HTTP_PORT = ats.env.PORT || 6680;
const app = new Application();
const router = new Router();

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

router
  .get("/:did/:cid", async (ctx) => {
    const { did, cid } = ctx.params;
    if (!cid || !cid.startsWith("baf")) {
      return ctx.status = 404;
    }
    const item = await ats.db.did.findOne({ did });
    if (!item || !item.pds) {
      return ctx.status = 404;
    }

    let index = null;
    let body = null;
    const blobDir = join(ats.env.ATSCAN_DB_PATH, "blob", did);
    await ensureDir(blobDir);
    const cacheIndexFn = join(blobDir, `${cid}.json`);
    const cacheFn = join(blobDir, `${cid}.blob`);

    if (!await exists(cacheIndexFn)) {
      const src = `${
        item.pds[0]
      }/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
      const blobRes = await fetch(src);
      if (!blobRes.ok) {
        return ctx.status = 404;
      }
      body = new Uint8Array(await blobRes.arrayBuffer());
      //const compressed = zstd.compress(body);
      index = {
        src,
        did,
        cid,
        hash: new Sha256().update(body).hex(),
        time: new Date(),
        size: body.length,
        //sizeCompressed: compressed.length,
        headers: {
          "content-length": blobRes.headers.get("content-length"),
          "content-type": blobRes.headers.get("content-type"),
        },
      };
      await Deno.writeTextFile(cacheIndexFn, JSON.stringify(index, null, 2));
      await Deno.writeFile(cacheFn, body);
    } else {
      index = JSON.parse(await Deno.readTextFile(cacheIndexFn));
      //body = zstd.decompress(await Deno.readFile(cacheFn));
      body = await Deno.readFile(cacheFn);
    }

    for (const headerKey of Object.keys(index.headers)) {
      ctx.response.headers.set(headerKey, index.headers[headerKey]);
    }
    ctx.response.body = body;
    //perf(ctx);
  });

app.use(oakCors()); // Enable CORS for All Routes
app.use(async (ctx, next) => {
  ctx.perf = performance.now();
  await next();
});
app.use(router.routes());

app.listen({ port: HTTP_PORT });

console.log(`ATScan API started at port ${HTTP_PORT}`);
