import * as _ from "lodash";

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, url }) {
  const q = url.searchParams.get('q')
  const res = await fetch('https://api.atscan.net/did' + (q ? `?q=${q}` : ''));
  const did = _.orderBy(await res.json(), ["time"], [
    "desc",
  ]);
  return { 
    did
  };
}
