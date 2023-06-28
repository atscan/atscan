
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
    const did = `did:${params.id}`
    const itemRes = await fetch(`https://api.atscan.net/${did}`)
    if (!itemRes) {
        throw error(404, { message: 'Not found' });
    }

    const item = await itemRes.json()
    const pdsHost = item.pds[0].replace(/^https?:\/\//, '')
    const pdsRes = pdsHost ? await fetch(`https://api.atscan.net/pds/${pdsHost}`) : null
    return {
        item,
        pds: pdsRes ? [await pdsRes.json()] : [],
        did
    }
}