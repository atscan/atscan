import * as typesense from "npm:typesense";
const Typesense = typesense.default;
import { ATScan } from "./lib/atscan.js";

//import { Client, Errors, SearchClient } from "https://raw.githubusercontent.com/bradenmacdonald/typesense-deno/v1.1.3-deno/mod.ts";

const ats = new ATScan();
await ats.init();

async function loadItems(limit = 10000, offset = 0) {
  console.log("offset", offset);
  const items = await ats.db.did.find({}, {
    "revs.operation.alsoKnownAs": 1,
    did: 1,
  }).limit(limit).skip(offset).toArray();
  const arr = items.map((item) => {
    const rev = item.revs[item.revs.length - 1];
    const handle =
      rev && rev.operation?.alsoKnownAs && rev.operation?.alsoKnownAs[0]
        ? rev.operation?.alsoKnownAs[0]?.replace(/^at:\/\//, "").replaceAll(
          ".",
          " ",
        )
        : null;

    const prevHandles = item.revs.length > 1
      ? item.revs.slice(0, item.revs.length - 2).map((r) =>
        r.operation?.alsoKnownAs
          ? r.operation?.alsoKnownAs[0]?.replace(/^at:\/\//, "").replaceAll(
            ".",
            " ",
          )
          : ""
      )
      : [];
    return {
      id: item.did,
      did: item.did,
      handle,
      prevHandles,
      desc: item.repo?.profile?.description || "",
      name: item.repo?.profile?.displayName || "",
    };
  });
  //console.log(arr)
  const out = await fetch(
    `${ats.env.TYPESENSE_HOST}/collections/dids/documents/import?action=upsert`,
    {
      method: "POST",
      headers: {
        "X-TYPESENSE-API-KEY": ats.env.TYPESENSE_API_KEY,
        "Content-Type": "text/plain",
      },
      body: arr.map(JSON.stringify).join("\n"),
    },
  );
  console.log(await out.text());
}

const limit = 10000;
const total = await ats.db.did.count();
const pages = Math.ceil(total / limit);

for (let i = 0; i < pages; i++) {
  await loadItems(limit, limit * i);
}

Deno.exit(0);
