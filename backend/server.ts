import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { initializeSocket } from "./socket.ts";
import {
  startAuctionLifecycleWorker,
  type AuctionLifecycleWorker,
} from "./services/auction-lifecycle.service.js";

const PORT = Number(process.env.PORT) || 5000;

// One HTTP server serves both Express and Socket.IO.
const httpServer = createServer(app);

// Initialize Socket.IO and its auction-room handlers.
const io = initializeSocket(httpServer);
let lifecycleWorker: AuctionLifecycleWorker | undefined;
let shuttingDown = false;

httpServer.listen(PORT, () => {
  lifecycleWorker = startAuctionLifecycleWorker();
  console.log(`Auction API running at http://localhost:${PORT}`);
  console.log("Socket.IO server is ready");
});

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;

  shuttingDown = true;
  lifecycleWorker?.stop();
  console.log(`${signal} received; auction lifecycle worker stopped`);

  httpServer.close((error) => {
    if (error) {
      console.error("HTTP server shutdown failed", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
