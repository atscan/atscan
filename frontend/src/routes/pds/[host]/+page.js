export async function load({ params, fetch }) {
	const itemResp = await fetch(`https://api.atscan.net/pds/${params.host}`);
	const didsResp = await fetch(`https://api.atscan.net/did?q=pds:${params.host}&limit=10`, {
		headers: { 'x-ats-wrapped': 'true' }
	});
	return {
		item: await itemResp.json(),
		dids: await didsResp.json()
	};
}
