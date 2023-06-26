import * as _ from "lodash";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
  const res = await fetch("https://api.atscan.net/pds");
  const pds = _.orderBy(await res.json(), ["env", "inspect.current.ms"], [
    "asc",
    "asc",
  ]);
  return { 
    pds,
    plc: await (await fetch("https://api.atscan.net/plc")).json()
  };
}
