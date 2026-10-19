import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";

let ioInstance : Server | null = null;

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error("Socket.IO server is not initialized");
  }
  return ioInstance;
}

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

export function initializeSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: FRONTEND_URL,
    },
  });
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("auction:join", (auctionId: unknown) => {
      if (
        typeof auctionId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          auctionId
        )
      ) {
        socket.emit("auction:error", {
          message: "Invalid auction ID",
        });
        return;
      }

      const room = `auction:${auctionId}`;
      socket.join(room);

      socket.emit("auction:joined", {
        auctionId,
        message: "Joined auction room successfully",
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
