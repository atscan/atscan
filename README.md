# ATScan

> *Open-source [AT Protocol](https://atproto.com/) ecosystem explorer*

This is a monorepo containing the backend and frontend of ATScan.

The current version is hosted at [atscan.net](https://atscan.net). You can follow us on Bluesky as [@atscan.net](https://bsky.app/profile/did:plc:ft3tl5dxjn4psdk6asenqn3r).

## Our software

- [broadsky](https://github.com/atscan/broadsky) (Go) - Bridge Streaming Wire Protocol (v0) to NATS and other protocols
- [blobd](https://github.com/atscan/blobd) (Go) - AT Protocol Blob-serving HTTP Server in Go

## Technology stack

### Infrastructure
- [NATS](https://nats.io/) socket messaging
- [MongoDB](https://www.mongodb.com/) database
- [InfluxDB](https://github.com/influxdata/influxdb) time series platform
- [Redis](https://redis.io/) in-memory data store

### Backend
- [Deno](https://deno.land/) JavaScript runtime
- [oak](https://github.com/oakserver/oak) HTTP middleware framework
- [Ajv](https://ajv.js.org/) JSON Schema validator
- [BullMQ](https://bullmq.io/) job processing

### Frontend
- [Node.js](https://nodejs.org/en) JavaScript runtime
- [SvelteKit](https://kit.svelte.dev/) JavaScript UI framework
- [Tailwind](https://tailwindcss.com/) CSS framework
- [Skeleton](https://www.skeleton.dev/) UI toolkit
- [Apache ECharts](https://echarts.apache.org/en/index.html) visualization library
- [date-fns](https://date-fns.org/) date library
- [Numbro](https://numbrojs.com/) number library
- [Minidenticons](https://github.com/laurentpayot/minidenticons) identicon generator

## Authors
- Tree (GitHub: [@burningtree](https://github.com/burningtree), Bluesky: [@tree.fail](https://bsky.app/profile/did:plc:524tuhdhh3m7li5gycdn6boe))

## License
MIT