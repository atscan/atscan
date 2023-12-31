.PHONY: all

all: plc-crawl

plc-daemon:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/plc-crawler.js daemon

plc-init:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/plc-crawler.js init

plc-crawl:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/plc-crawler.js

index:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys --allow-ffi ./backend/indexer.js

index-daemon:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/indexer.js daemon

api-ws:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys ./backend/api-ws.js

repo-crawler:
	deno run --unstable --allow-net --allow-read --allow-write --allow-env --allow-sys --allow-ffi ./backend/repo-crawler.js

repo-worker:
	deno run --unstable --allow-net --allow-read --allow-write --allow-env --allow-ffi --allow-sys ./backend/repo-worker.js

firehose:
	deno run --unstable --allow-net --allow-read --allow-env --allow-sys --allow-ffi ./backend/firehose.js

tick:
	deno run --unstable --allow-net --allow-read --allow-env ./backend/tick.js

fe-rebuild:
	cd frontend && npm run build
	rm -rf frontend/prod-build
	cp -r frontend/build frontend/prod-build
	pm2 restart atscan-fe

be-restart:
	pm2 restart atscan-api atscan-indexer atscan-pds-crawler atscan-plc-crawler

install:
	deno install --unstable -A -f -n ats ./cli/ats.js
	deno install --unstable -A -f -n ats-repo ./cli/ats-repo.js

did-snapshot:
	deno run -A ./backend/did-snapshot.js
	tree /corn/atscan-db/snapshots/public/did

typesense-init:
	deno run --unstable --allow-net --allow-read ./backend/typesense-init.js

format:
	cd backend && deno fmt **.js
	cd frontend && npm run format

fmt: format

rebuild: be-restart fe-rebuild

start:
	pm2 start pm2.config.js

test:
	deno test --unstable --allow-read ./backend/test.js

