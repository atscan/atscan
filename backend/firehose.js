import {
  ComAtprotoSyncSubscribeRepos,
  subscribeRepos,
  //SubscribeReposMessage,
} from "npm:atproto-firehose";

import * as atprotoApi from "npm:@atproto/api";
const { AppBskyActorProfile } = atprotoApi.default;

const client = subscribeRepos(`wss://bsky.social`, { decodeRepoOps: true });
client.on("message", (m) => {
  if (ComAtprotoSyncSubscribeRepos.isHandle(m)) {
    console.log("handle", m);
  }
  if (ComAtprotoSyncSubscribeRepos.isCommit(m)) {
    //console.log(m)
    m.ops.forEach((op) => {
      console.log(op.payload?.$type);
      if (!op.payload) {
        console.log(m);
      }
      if (op.payload?.$type === "app.bsky.actor.profile") {
        if (AppBskyActorProfile.isRecord(op.payload)) {
          console.log(`Profile updated: ${m.repo}`);
        }
      }
    });
  }
  if (ComAtprotoSyncSubscribeRepos.isHandle(m)) {
    console.log("handle update", m);
  }
  if (ComAtprotoSyncSubscribeRepos.isMigrate(m)) {
    console.log("migrate update", m);
  }
  if (ComAtprotoSyncSubscribeRepos.isTombstone(m)) {
    console.log("tombstone update", m);
  }
  if (ComAtprotoSyncSubscribeRepos.isInfo(m)) {
    console.log("info update", m);
  }
});
