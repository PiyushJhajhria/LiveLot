import assert from "node:assert/strict";
import test from "node:test";
import {
  AUCTION_LIFECYCLE_SWEEP_SQL,
  startAuctionLifecycleWorker,
  sweepAuctionLifecycle,
} from "./services/auction-lifecycle.service.js";

test("lifecycle sweep uses one database-clock guarded update", async () => {
  let executedSql = "";
  const updatedRows = await sweepAuctionLifecycle({
    async $executeRawUnsafe(sql) {
      executedSql = sql;
      return 3;
    },
  });

  assert.equal(updatedRows, 3);
  assert.match(executedSql, /NOW\(\)/);
  assert.match(executedSql, /status IN \('UPCOMING', 'ACTIVE'\)/);
  assert.match(executedSql, /status = 'UPCOMING'/);
  assert.match(executedSql, /end_time IS NOT NULL/);
  assert.doesNotMatch(executedSql, /CANCELLED/);
});

test("worker starts with a sweep and prevents overlapping sweeps", async () => {
  let calls = 0;
  let finishSweep: (() => void) | undefined;
  const firstSweep = new Promise<void>((resolve) => {
    finishSweep = resolve;
  });

  const worker = startAuctionLifecycleWorker({
    intervalMs: 1,
    database: {
      async $executeRawUnsafe() {
        calls += 1;
        await firstSweep;
        return 0;
      },
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls, 1);

  finishSweep?.();
  worker.stop();
});
