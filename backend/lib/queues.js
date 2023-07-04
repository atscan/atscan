import { Queue } from "npm:bullmq";

export async function makeQueues(ats) {
  const connection = ats.redisConnectionOptions();

  return {
    //repoInspect: new Queue("repo-inspect", { connection }),
    repoSnapshot: new Queue("repo-snapshot", { connection }),
  };
}
