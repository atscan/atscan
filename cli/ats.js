
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