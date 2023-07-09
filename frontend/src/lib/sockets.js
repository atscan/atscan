import { connect as NATSConnect, JSONCodec, StringCodec } from 'nats.ws';
import { writable } from 'svelte/store';

export let connected = writable(null);
export let nats = null;
export let codec = JSONCodec();

export async function connect() {
	nats = await NATSConnect({ servers: 'wss://nats.gwei.cz' });
	await connected.set(true);
}
