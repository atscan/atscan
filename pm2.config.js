module.exports = {
  apps: [{
    name: "atscan-plc-crawler",
    script: "./backend/plc-crawler.js",
    args: "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env --allow-sys",
  }, {
    name: "atscan-pds-crawler",
    script: "./backend/pds-crawler.js",
    args: "daemon",
    interpreter: "mullvad-exclude",
    interpreterArgs: "deno run --unstable --allow-net --allow-read --allow-env --allow-sys",
  }, {
    name: "atscan-indexer",
    script: "./backend/indexer.js",
    args: "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env --allow-sys",
  }, {
    name: "atscan-firehose",
    script: "./backend/firehose.js",
    args: "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env --allow-sys --allow-ffi",
  }, {
    name: "atscan-fe-dev",
    interpreter: "mullvad-exclude",
    interpreterArgs: "npm run dev",
    env: {
      HOST: "127.0.0.1",
      PORT: 4010,
    }
  }, {
    name: "atscan-fe",
    script: "./frontend/prod-build/index.js",
    interpreter: "mullvad-exclude",
    interpreterArgs: "node",
    env: {
      HOST: "127.0.0.1",
      PORT: 4000,
    }
  }, {
    name: "atscan-api-master",
    script: "./backend/api.js",
    //args : "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env --allow-sys",
    env: {
      PORT: 6677
    }
  }, {
    name: "atscan-api-slave",
    script: "./backend/api.js",
    //args : "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env --allow-sys",
    env: {
      PORT: 6678
    }
  }, {
    name: "atscan-api-blob",
    script: "./backend/api-blob.js",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-write --allow-env --allow-sys",
  }, {
    name: "atscan-worker",
    script: "./backend/repo-worker.js",
    interpreter: "mullvad-exclude",
    interpreterArgs: "deno run --unstable --allow-net --allow-read --allow-write --allow-env --allow-ffi --allow-sys ./backend/repo-worker.js",
    instances: 6,
  }, {
    name: "atscan-tick-sandbox",
    script: "./backend/tick.js",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env"
  }, {
    name: "atscan-tick-bluesky",
    script: "./backend/tick.js",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env",
    env: {
      ATSCAN_TICK_ENV: 'BLUESKY'
    }
  }, {
    name: "bull-ui",
    script: "index.js",
    cwd: "./backend/bull-ui"
  }],
};
