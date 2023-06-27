module.exports = {
  apps: [{
    name: "atscan-plc-crawler",
    script: "./backend/plc-crawler.js",
    args: "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env",
  }, {
    name: "atscan-pds-crawler",
    script: "./backend/pds-crawler.js",
    args: "daemon",
    interpreter: "mullvad-exclude",
    interpreterArgs: "deno run --unstable --allow-net --allow-read --allow-env",
  }, {
    name: "atscan-indexer",
    script: "./backend/indexer.js",
    args: "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable --allow-net --allow-read --allow-env",
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
    script: "./frontend/build/index.js",
    interpreter: "mullvad-exclude",
    interpreterArgs: "node",
    env: {
      HOST: "127.0.0.1",
      PORT: 4000,
    }
  }, {
    name: "atscan-api",
    script: "./backend/api.js",
    //args : "daemon",
    interpreter: "deno",
    interpreterArgs: "run --unstable -A",
    watch: true,
  }],
};
