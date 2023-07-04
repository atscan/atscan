const express = require("express");
const { Queue, QueueEvents } = require("bullmq");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const queues = [
  ["repo-snapshot"],
];

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: queues.map((q) => new BullMQAdapter(new Queue(q))),
  serverAdapter: serverAdapter,
});

const app = express();

app.use("/admin/queues", serverAdapter.getRouter());

app.listen(3055, () => {
  console.log("Running on 3055...");
  console.log("For the UI, open http://localhost:3055/admin/queues");
  console.log("Make sure Redis is running on port 6379 by default");
});
