export async function load({ fetch, parent }) {
	const { config } = await parent();

	const plcRes = await fetch(`${config.api}/plc`);
	return {
		plc: await plcRes.json()
	};
}
