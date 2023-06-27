import { ATScan } from "./lib/atscan.js";

const ats = new ATScan();
await ats.init();

function main () {

    const streams = {}
    streams.did = ats.db.did.watch()

    streams.did.on('change', (ev) => {
        console.log(ev)
    })
}

main()