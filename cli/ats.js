
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
//import { inspect } from "./lib/car.js";

await new Command()
    .name("ats")
    .description("CLI for ATScan")
    .meta("deno", Deno.version.deno)
    .meta("v8", Deno.version.v8)
    .version("0.1.0")
    .usage("<command>")
    .action(() => { console.log("Please specify command or use `-h`") })
    .command("repo,r", "Repository tools").executable()
    .parse(Deno.args)

//import * as bsky from "npm:@atproto/api";
//import "https://deno.land/std@0.192.0/dotenv/load.ts";
/*const { BskyAgent } = bsky.default;
const agent = new BskyAgent({ service: "https://bsky.social" });

await agent.login({
  identifier: Deno.env.get("BLUESKY_USERNAME"),
  password: Deno.env.get("BLUESKY_PASSWORD"),
});*/

/*const p = await agent.getProfiles({
  actors: ["did:plc:b5rrmme6ncenhe4lq53y7lpf", "tree.fail"],
});*/
//console.log(p);