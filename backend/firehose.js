import {
  ComAtprotoSyncSubscribeRepos,
  subscribeRepos,
  //SubscribeReposMessage,
} from "npm:atproto-firehose";
import { ATScan } from "./lib/atscan.js";

import * as atprotoApi from "npm:@atproto/api";
const { AppBskyActorProfile } = atprotoApi.default;

const HTTP_PORT = "6990";
const SERVER = "hex";
const BGS_HOSTNAME = "bsky.social";

const ats = new ATScan({ enableQueues: true });
ats.debug = true;
await ats.init();

import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

let totalCommits = 0;
const counters = {};

const client = subscribeRepos(`wss://${BGS_HOSTNAME}`, { decodeRepoOps: true });
client.on("message", (m) => {
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
      if (type) {
        if (!counters[op.action][type]) {
          counters[op.action][type] = 0;
        }
        counters[op.action][type]++;
      }
      if (op.payload?.$type === "app.bsky.actor.profile") {
        if (AppBskyActorProfile.isRecord(op.payload)) {
          const did = m.repo;
          const didObj = await ats.db.did.findOne({ did });
          if (!didObj) {
            return;
          }
          await ats.queues.repoSnapshot.add(did, didObj, {
            //priority: 1,
            jobId: did,
            priority: 10,
            delay: 15,
          });
          console.log(`Added to queue: ${did}`);
          //console.log(`Profile updated: ${m.repo}`);
        }
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
    ctx.response.body = Object.keys(counters).map((mod) => {
      return Object.keys(counters[mod]).map((type) => {
        const val = counters[mod][type];
        return `firehose_event{server="${SERVER}",bgs="${BGS_HOSTNAME}",mod="${mod}",type="${type}"} ${val}`;
      }).filter((v) => v.trim()).join("\n");
    }).join("\n") + "\n";
  });

app.use(router.routes());

app.listen({ port: HTTP_PORT });

console.log(`ATScan Firehose metrics API started at port ${HTTP_PORT}`);
