
export async function load({ params }) {
    const res = await fetch(`https://api.atscan.net/pds/${params.host}`);
    return {
        item: res.json()
    }
}