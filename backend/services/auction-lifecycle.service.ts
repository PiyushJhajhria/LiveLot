import prisma from "../prisma.js";

type LifecycleDatabase = {
  $executeRawUnsafe(query: string): Promise<number>;
};

export const AUCTION_LIFECYCLE_SWEEP_SQL = `
  UPDATE public.auctions
  SET status = CASE
    WHEN end_time <= NOW() THEN 'ENDED'
    ELSE 'ACTIVE'
  END
  WHERE
    (
      status IN ('UPCOMING', 'ACTIVE')
      AND end_time IS NOT NULL
      AND end_time <= NOW()
    )
    OR
    (
      status = 'UPCOMING'
      AND start_time <= NOW()
      AND end_time IS NOT NULL
      AND end_time > NOW()
    )
`;

/**
 * Applies all due lifecycle transitions in one PostgreSQL statement.
 * The database clock is the source of truth, and the WHERE clause makes
 * repeated or concurrent sweeps safe.
 */
export async function sweepAuctionLifecycle(
  database: LifecycleDatabase = prisma,
): Promise<number> {
  return database.$executeRawUnsafe(AUCTION_LIFECYCLE_SWEEP_SQL);
}

export interface AuctionLifecycleWorkerOptions {
  database?: LifecycleDatabase;
  intervalMs?: number;
  onError?: (error: unknown) => void;
}

export interface AuctionLifecycleWorker {
  stop(): void;
}

const DEFAULT_INTERVAL_MS = 30_000;

export function startAuctionLifecycleWorker({
  database = prisma,
  intervalMs = DEFAULT_INTERVAL_MS,
  onError = (error) => console.error("Auction lifecycle sweep failed", error),
}: AuctionLifecycleWorkerOptions = {}): AuctionLifecycleWorker {
  let running = false;

  const runSweep = async () => {
    // Avoid overlapping sweeps in one server process. PostgreSQL's guarded
    // update also keeps concurrent processes safe.
    if (running) return;

    running = true;
    try {
      await sweepAuctionLifecycle(database);
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  };

  // Catch up immediately after a process restart, then keep the stored
  // lifecycle status close to the database clock.
  void runSweep();
  const timer = setInterval(() => void runSweep(), intervalMs);
  timer.unref();

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
