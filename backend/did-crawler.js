import * as bsky from "npm:@atproto/api@0.3.13";
import "https://deno.land/std@0.192.0/dotenv/load.ts";

const { BskyAgent } = bsky.default;
const agent = new BskyAgent({ service: "https://bsky.social" });

await agent.login({
  identifier: Deno.env.get("BLUESKY_USERNAME"),
  password: Deno.env.get("BLUESKY_PASSWORD"),
});

const p = await agent.getProfiles({
  actors: ["did:plc:b5rrmme6ncenhe4lq53y7lpf", "tree.fail"],
});
console.log(p);
