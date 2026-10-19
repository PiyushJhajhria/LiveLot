import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  cancelAuction,
  createAuction,
  getAuctionById,
  listAuctions,
} from "../services/auction.service.js";
import { validateCreateAuctionInput } from "../validators/auction.validators.js";
import { setCoverImage, uploadImages } from "../services/auction-image.service.js";
import type { Express } from "express";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getAuctions(_req: AuthRequest, res: Response) {
  try {
    const auctions = await listAuctions();
    res.json({ auctions });
  } catch (error) {
    console.error("Auction listing failed:", error);
    res.status(500).json({ error: "Could not load auctions" });
  }
}

export async function getAuction(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // Reject malformed IDs before asking PostgreSQL to cast them as UUIDs.
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    res.status(400).json({ error: "Auction ID must be a valid UUID" });
    return;
  }

  try {
    const auction = await getAuctionById(id);
    if (!auction) {
      res.status(404).json({ error: "Auction not found" });
      return;
    }

    res.json({ auction });
  } catch (error) {
    console.error("Auction retrieval failed:", error);
    res.status(500).json({ error: "Could not load auction" });
  }
}

export async function postAuction(req: AuthRequest, res: Response) {
  // The middleware must have set this after verifying the JWT.
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const validation = validateCreateAuctionInput(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    const auction = await createAuction(req.userId, validation.data);
    res.status(201).json({ auction });
  } catch (error) {
    console.error("Auction creation failed:", error);
    res.status(500).json({ error: "Could not create auction" });
  }
}

export async function patchCancelAuction(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { id } = req.params;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    res.status(400).json({ error: "Auction ID must be a valid UUID" });
    return;
  }

  try {
    const result = await cancelAuction(id, req.userId);

    if (result.kind === "not-found") {
      res.status(404).json({ error: "Auction not found" });
      return;
    }

    if (result.kind === "conflict") {
      res.status(409).json({
        error: `Auction cannot be cancelled while its status is ${result.status}`,
      });
      return;
    }

    res.json({ message: "Auction cancelled", auctionId: id, status: "CANCELLED" });
  } catch (error) {
    console.error("Auction cancellation failed:", error);
    res.status(500).json({ error: "Could not cancel auction" });
  }
}

export async function postAuctionImages(req: AuthRequest, res: Response) {
  if (!req.userId) { res.status(401).json({ error: "Authentication required" }); return; }
  const auctionId = req.params.id;
  if (typeof auctionId !== "string" || !UUID_PATTERN.test(auctionId)) { res.status(400).json({ error: "Auction ID must be a valid UUID" }); return; }
  const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
  try {
    const result = await uploadImages(auctionId, req.userId, files, req.body?.coverIndex);
    if (result.kind === "not-found") { res.status(404).json({ error: "Auction not found" }); return; }
    res.status(201).json({ images: result.images });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload images";
    const clientError = /required|supported|coverIndex|at most \d+|configured/.test(message);
    if (clientError) { res.status(400).json({ error: message }); return; }
    console.error("Auction image upload failed:", error);
    res.status(500).json({ error: "Could not upload images" });
  }
}

export async function patchAuctionCover(req: AuthRequest, res: Response) {
  if (!req.userId) { res.status(401).json({ error: "Authentication required" }); return; }
  const auctionId = req.params.id; const imageId = req.params.imageId;
  if (typeof auctionId !== "string" || !UUID_PATTERN.test(auctionId) || typeof imageId !== "string" || !UUID_PATTERN.test(imageId)) { res.status(400).json({ error: "Auction and image IDs must be valid UUIDs" }); return; }
  try {
    const result = await setCoverImage(auctionId, imageId, req.userId);
    if (result.kind === "not-found") { res.status(404).json({ error: "Auction or image not found" }); return; }
    res.json({ images: result.images });
  } catch (error) {
    console.error("Auction cover update failed:", error);
    res.status(500).json({ error: "Could not update cover image" });
  }
}
