import {
  ComAtprotoSyncSubscribeRepos,
  subscribeRepos,
  //SubscribeReposMessage,
} from "npm:atproto-firehose";
import { ATScan } from "./lib/atscan.js";

import * as atprotoApi from "npm:@atproto/api";
const { AppBskyActorProfile } = atprotoApi.default;

const ats = new ATScan({ enableQueues: true });
ats.debug = true;
await ats.init();

const client = subscribeRepos(`wss://bsky.social`, { decodeRepoOps: true });
client.on("message", (m) => {
  if (ComAtprotoSyncSubscribeRepos.isHandle(m)) {
    console.log("handle", m);
  }
  if (ComAtprotoSyncSubscribeRepos.isCommit(m)) {
    //console.log(m)
    m.ops.forEach(async (op) => {
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
  }
});
