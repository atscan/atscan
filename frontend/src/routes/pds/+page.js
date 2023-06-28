import * as _ from "lodash";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
  const res = await fetch("https://api.atscan.net/pds");
  const arr = (await res.json()).map(i => {
    i.err = Boolean(i.inspect?.current?.err)
    return i
  })
  const pds = _.orderBy(arr, ["env", "err", "didsCount"], [
    "asc",
    "asc",
    "desc",
  ]);
  return { 
    pds
  };
}
