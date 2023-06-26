import * as _ from "lodash";

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
  const res = await fetch("https://api.atscan.net/did");
  const did = _.orderBy(await res.json(), ["time"], [
    "desc",
  ]);
  return { 
    did,
    plc: await (await fetch("https://api.atscan.net/plc")).json()
  };
}
