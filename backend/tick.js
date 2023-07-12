import * as atprotoApi from "npm:@atproto/api";
import "https://deno.land/std@0.193.0/dotenv/load.ts";
import { Interval } from "./lib/interval.js";

const ENV = Deno.env.get("ATSCAN_TICK_ENV") || "SANDBOX";
const options = {
  identifier: Deno.env.get(`ATSCAN_TICK_${ENV}_HANDLE`),
  password: Deno.env.get(`ATSCAN_TICK_${ENV}_PASSWORD`),
};
const TICK_INTERVAL = parseInt(
  Deno.env.get(`ATSCAN_TICK_${ENV}_INTERVAL`) || 1000,
);
const TICK_PDS = Deno.env.get(`ATSCAN_TICK_${ENV}_PDS`) || "test-pds.gwei.cz";
const TICK_REPO = Deno.env.get(`ATSCAN_TICK_${ENV}_REPO`) ||
  "did:plc:pzovq4a22hpji6pfzofgk7gc";
//const TICK_POST = Deno.env.get(`ATSCAN_TICK_${ENV}_POST`) || '3k2bwjgozws2q';

const agent = new atprotoApi.default.BskyAgent({
  service: `https://${TICK_PDS}`,
});
await agent.login(options);
console.log(`Logged in as "${options.identifier}" [pds=${TICK_PDS}] ...`);
console.log(`Ticking in interval: ${TICK_INTERVAL}ms ..`);
const repo = TICK_REPO;
//const rkey = TICK_POST;

/*const resp = await agent.getTimeline({ limit: 100 });
for (const { post } of resp.data.feed) {
    if (post.author.did === repo) {
        await agent.deletePost(post.uri)
    }
}*/

const interval = new Interval(async () => {
  const time = (new Date()).toISOString();
  await agent.com.atproto.repo.createRecord({
    repo,
    collection: "app.bsky.feed.post",
    //rkey,
    record: {
      $type: "app.bsky.feed.post",
      text: time,
      createdAt: time,
    },
  });
  /*await agent.app.bsky.feed.post.delete({
        repo,
        rkey,
    })*/
}, TICK_INTERVAL);

interval.run();
