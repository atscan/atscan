import * as _ from "lodash";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
  const res = await fetch("https://api.atscan.net/plc");
  const plc = _.orderBy(await res.json(), ["code"], [
    "asc",
  ]);
  return { plc };
}
