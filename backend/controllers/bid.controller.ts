import { getIO } from "../socket.js";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { placeBid } from "../services/bid.service.js";
import { listAuctionBids } from "../services/bid-history.service.js";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildSuccessfulBidResponse(
    auctionId: string,
    amount: string,
    currentPrice: string | null
) {
    return {
        result: "Bid accepted",
        // Keep the existing field for clients that already consume it.
        message: "Bid accepted",
        auctionId,
        amount,
        currentPrice,
    };
}

export async function postBid(req: AuthRequest, res: Response) {
    const auctionId = req.params.id;
    const userId = req.userId;
    const rawAmount: unknown = req.body?.amount;

    if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    if (typeof auctionId !== "string" || !UUID_PATTERN.test(auctionId)) {
        res.status(400).json({ error: "Auction ID must be a valid UUID" });
        return;
    }

    // Accept a decimal string or a JSON number with at most two decimal places.
    const amount =
        typeof rawAmount === "number" && Number.isFinite(rawAmount)
            ? String(rawAmount)
            : typeof rawAmount === "string"
                ? rawAmount
                : "";

    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amount)) {
        res.status(400).json({
            error: "Amount must be positive and have at most two decimal places",
        });
        return;
    }

    if (Number(amount) <= 0 || Number(amount) > 9999999999.99) {
        res.status(400).json({ error: "Amount is outside the allowed range" });
        return;
    }

    try {

        const bidResult = await placeBid(auctionId, userId, amount);
        const result = bidResult.result;

        if (result === "Bid accepted") {
            const io = getIO();

            io.to(`auction:${auctionId}`).emit("bid:accepted", {
                auctionId,
                acceptedAmount: amount,
                currentPrice: bidResult.currentPrice,
                message: result,
            });

            res.status(201).json(
                buildSuccessfulBidResponse(
                    auctionId,
                    amount,
                    bidResult.currentPrice
                )
            );
            return;
        }

        if (result === "Auction not found") {
            res.status(404).json({ error: result });
            return;
        }

        if (
            result === "Bid amount is outside the allowed range" ||
            result === "Bid amount must have at most two decimal places"
        ) {
            res.status(400).json({ error: result });
            return;
        }

        res.status(409).json({
            error: result,
            currentPrice: bidResult.currentPrice,
        });

    } catch (error) {
        console.error("Bid placement failed:", error);
        res.status(500).json({ error: "Could not place bid" });
    }
}

export async function getAuctionBids(req: AuthRequest, res: Response) {
    const auctionId = req.params.id;

    if (typeof auctionId !== "string" || !UUID_PATTERN.test(auctionId)) {
        res.status(400).json({ error: "Auction ID must be a valid UUID" });
        return;
    }

    try {
        const bids = await listAuctionBids(auctionId);
        res.json({ bids });
    } catch (error) {
        console.error("Bid history retrieval failed:", error);
        res.status(500).json({ error: "Could not load bid history" });
    }
}
