export async function load({ params, fetch, parent }) {
	const { config } = await parent();

	const itemResp = await fetch(`${config.api}/pds/${params.host}`);
	const didsResp = await fetch(`${config.api}/dids?q=pds:${params.host}&limit=10`, {
		headers: { 'x-ats-wrapped': 'true' }
	});
	return {
		item: await itemResp.json(),
		dids: await didsResp.json()
	};
}
