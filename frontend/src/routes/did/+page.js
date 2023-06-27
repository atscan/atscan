import * as _ from "lodash";

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, url }) {
  let q = url.searchParams.get('q')
  const res = await fetch('https://api.atscan.net/did' + (q ? `?q=${q}` : ''), {
    headers: { 'x-ats-wrapped': 'true' }
  });
  const json = await res.json()
  const totalCount = json.count
  const did = _.orderBy(json.items, ["time"], [
    "desc",
  ]);
  let onlySandbox = false
  if (q?.match(/env:sbox/)) {
    onlySandbox = true
    q = q.replace('env:sbox', '').trim()
  }

  return { 
    did,
    totalCount,
    q,
    onlySandbox
  };
}
