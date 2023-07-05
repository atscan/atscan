import {
  ComAtprotoSyncSubscribeRepos,
  subscribeRepos,
  SubscribeReposMessage,
} from "npm:atproto-firehose";

const client = subscribeRepos(`wss://bsky.social`, { decodeRepoOps: true });
client.on("message", (m) => {
  //console.log(m)
  if (ComAtprotoSyncSubscribeRepos.isCommit(m)) {
    m.ops.forEach((op) => {
      //console.log(op.payload)
    });
  }
});
