.PHONY: all

all: plc-crawl

plc-daemon:
	deno run --unstable --allow-net ./backend/plc-crawler.js daemon

plc-init:
	deno run --unstable --allow-net ./backend/plc-crawler.js init

plc-crawl:
	deno run --unstable --allow-net ./backend/plc-crawler.js

index:
	deno run --unstable --allow-net --allow-read ./backend/indexer.js

index-daemon:
	deno run --unstable --allow-net --allow-read ./backend/indexer.js daemon

test:
	deno test --unstable --allow-read ./backend/test.js

