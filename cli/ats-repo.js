
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { inspect, read } from "../backend/lib/car.js";

await new Command()
    .name("ats-repo")
    .action(() => { console.log("Please specify command or use `-h`") })
    .command("car-inspect,ci", "Inspect CAR file")
    .option("--did <val:string>", "DID", { required: true })
    .option("--signing-key <val:string>", "Signing key", { required: true })
    .arguments("<file:string>", 'Input CAR file')
    .example("Inspect CAR file", "ats r ci --did did:plc:ixko5wwzamist35uptkjae7p --signing-key did:key:zQ3shXv3xDNbJfYiMtyNT3E6buJtgKwQTYpoJu6NJDU2EHyVj backend/db/repos/test.car")
    .action(async ({ did, signingKey }, file) => {
        const out = await inspect(await Deno.readFile(file), did, signingKey)
        console.log(JSON.stringify(out, null, 2))
    })
    .command("remote-car-inspect,rci", "Inspect remote CAR file")
    .option('--checkout,-c', "Read checkout data")
    .option('--debug', "Debug")
    .arguments("<did:string>", 'DID')
    .action(async ({ debug, checkout }, did) => {
        // get did info
        const didRes = await fetch('https://api.atscan.net/'+did)
        if (!didRes.ok) {
            console.error(`Error: ${didRes.status} ${didRes.statusText}`)
            return;
        }
        const didInfo = await didRes.json()
        const signingKey = didInfo.revs[didInfo.revs.length-1].operation.verificationMethods.atproto
        // fetch remote repo
        const repo = await fetch(`${didInfo.pds[0]}/xrpc/com.atproto.sync.getRepo?did=${did}`)
        const data = new Uint8Array(await repo.arrayBuffer())
        // load and validate repo
        let out;
        if (debug) {
            out = await read(data, did, signingKey)
        } else if (checkout) {
            const resp = await read(data, did, signingKey)
            delete resp.checkout.newCids
            out = resp.checkout
        } else {
            out = await inspect(data, did, signingKey)
        }
        console.log(JSON.stringify(out, null, 2))
    })
    .example("Inspect remote CAR", "ats r rci did:plc:naichbdds7i7cwbzwzvjraxm")
    .example("Get all current data", "ats r rci did:plc:naichbdds7i7cwbzwzvjraxm -c")
    .parse(Deno.args)