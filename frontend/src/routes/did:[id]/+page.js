
export async function load({ params }) {
    const did = `did:${params.id}`
    const res = await fetch(`https://api.atscan.net/${did}`);
    return {
        item: res.json(),
        did
    }
}