import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import auctionRoutes from "./routes/auction.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Auction API is running",
  });
});

// Authentication endpoints:
// POST /api/auth/register
// POST /api/auth/login
app.use("/api/auth", authRoutes);

// Auction endpoints
app.use("/api/auctions", auctionRoutes);

export default app;
