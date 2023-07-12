import {
  ComAtprotoSyncSubscribeRepos,
  subscribeRepos,
} from "npm:atproto-firehose";

import * as atprotoApi from "npm:@atproto/api";

const HTTP_PORT = Deno.env.get("ATSCAN_FIREHOSE_PORT") || "6990";
const SERVER = Deno.env.get("ATSCAN_FIREHOSE_SERVER") || "hex";
const BGS_HOSTNAME = Deno.env.get("ATSCAN_FIREHOSE_BGS_HOSTNAME") ||
  "bsky.social";
const TICK_REPO = Deno.env.get("ATSCAN_FIREHOSE_TICK_REPO") ||
  "did:plc:pzovq4a22hpji6pfzofgk7gc";
const TICK_ARRAY_SIZE = parseInt(
  Deno.env.get("ATSCAN_FIREHOSE_TICK_ARRAY_SIZE") || 5,
);
//const TICK_POST_PATH = Deno.env.get('ATSCAN_FIREHOSE_TICK_POST') || 'app.bsky.feed.post/3k2bwjgozws2q';

import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

let totalCommits = 0;
const counters = {};
const postLatency = [];

const client = subscribeRepos(`wss://${BGS_HOSTNAME}`, { decodeRepoOps: true });
client.on("message", (m) => {
  const receivedTime = new Date();
  if (ComAtprotoSyncSubscribeRepos.isHandle(m)) {
    console.log("handle", m);
  }
  if (ComAtprotoSyncSubscribeRepos.isCommit(m)) {
    m.ops.forEach(async (op) => {
      if (!counters[op.action]) {
        counters[op.action] = {};
      }
      let type = op.payload?.$type;
      if (op.action === "delete") {
        const delMatch = op.path.match(/^([^\/]+)\//);
        if (delMatch) {
          type = delMatch[1];
        }
      }
      if (
        m.repo === TICK_REPO && op.path.startsWith("app.bsky.feed.post/") &&
        op.action === "create"
      ) {
        const postDate = new Date(op.payload.createdAt);
        const latency = receivedTime - postDate;
        if (postLatency.length >= TICK_ARRAY_SIZE) {
          postLatency.shift();
        }
        postLatency.push(latency);
        console.log(JSON.stringify(postLatency));
      }
      if (type) {
        if (!counters[op.action][type]) {
          counters[op.action][type] = 0;
        }
        counters[op.action][type]++;
      }
    });
    totalCommits++;
  }
});

router
  .get("/counters", (ctx) => {
    ctx.response.body = counters;
  })
  .get("/_metrics", (ctx) => {
    const avgLatency = postLatency.reduce((ps, a) => ps + a, 0) /
      postLatency.length;
    ctx.response.body = Object.keys(counters).map((mod) => {
      return Object.keys(counters[mod]).map((type) => {
        const val = counters[mod][type];
        return `firehose_event{server="${SERVER}",bgs="${BGS_HOSTNAME}",mod="${mod}",type="${type}"} ${val}`;
      }).filter((v) => v.trim()).join("\n");
    }).join("\n") + "\n" +
      `post_latency{server="${SERVER}",bgs="${BGS_HOSTNAME}"} ${avgLatency}` +
      "\n";
  });

app.use(router.routes());

app.listen({ port: HTTP_PORT });

console.log(`ATScan Firehose metrics API started at port ${HTTP_PORT}`);
