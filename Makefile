.PHONY: all

all: plc-crawl

plc-daemon:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/plc-crawler.js daemon

plc-init:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/plc-crawler.js init

plc-crawl:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/plc-crawler.js

index:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/indexer.js

index-daemon:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/indexer.js daemon

api-ws:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/api-ws.js

did-crawler:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/did-crawler.js

fe-rebuild:
	cd frontend && npm run build && pm2 restart atscan-fe

format:
	cd backend && deno fmt
	cd frontend && npm run format

fmt: format

test:
	deno test --unstable --allow-read ./backend/test.js

