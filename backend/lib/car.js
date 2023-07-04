import * as repo from "npm:@atproto/repo@0.1.0";

const {
  MemoryBlockstore,
  readCarWithRoot,
  verifyCheckout,
  verifyFullHistory,
} = repo.default;

const colsDefs = {
  "app.bsky.actor.profile": { ignore: true },
  "app.bsky.feed.like": { key: "like" },
  "app.bsky.feed.post": { key: "post" },
  "app.bsky.feed.repost": { key: "repost" },
  "app.bsky.graph.follow": { key: "follow" },
  "app.bsky.feed.generator": { key: "generator" },
  "app.bsky.graph.block": { key: "block" },
  "app.bsky.graph.list": { key: "list" },
  "app.bsky.graph.listitem": { key: "listitem" },
};

export async function readRaw(data) {
  const { root, blocks } = await readCarWithRoot(data);
  return {
    root,
    blocks,
  };
}

export async function read(data, did, signingKey, job = null) {
  const { root, blocks } = await readRaw(data);

  if (job) {
    await job.log(`read done: ${did}`);
    await job.updateProgress(35);
  }

  const storage = new MemoryBlockstore(blocks);
  const checkout = await verifyCheckout(storage, root, did, signingKey);
  if (job) {
    await job.log(`checkout done: ${did}`);
    await job.updateProgress(60);
  }

  const history = await verifyFullHistory(storage, root, did, signingKey);
  if (job) {
    await job.log(`fullHistory done: ${did}`);
    await job.updateProgress(90);
  }

  return {
    root,
    blocks,
    storage,
    checkout,
    history,
  };
}

export async function inspect(data, did, signingKey) {
  const { root, checkout, history } = await read(...arguments);

  const collections = Object.fromEntries(
    Object.keys(checkout.contents).map((collection) => {
      if (!colsDefs[collection]) {
        throw new Error(`Unknown collection: ${collection}`);
      }
      if (colsDefs[collection].ignore) {
        return undefined;
      }
      return [
        colsDefs[collection].key,
        Object.keys(checkout.contents[collection]).length,
      ];
    }).filter((i) => i),
  );
  const _profile = checkout.contents["app.bsky.actor.profile"]?.self;
  const profile = _profile
    ? JSON.parse(
      JSON.stringify(checkout.contents["app.bsky.actor.profile"].self),
    )
    : null;

  return {
    did,
    signingKey,
    size: data.length,
    root: root.toString(),
    commits: history.length, //.map((h) => h.commit.toString()),
    profile,
    collections,
    time: new Date(),
  };
}
