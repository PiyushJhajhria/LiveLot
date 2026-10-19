
import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  getAuction,
  getAuctions,
  patchCancelAuction,
  postAuction,
} from "../controllers/auction.controller.js";
import { getAuctionBids, postBid } from "../controllers/bid.controller.js";
import { patchAuctionCover, postAuctionImages } from "../controllers/auction.controller.js";
import { uploadAuctionImages } from "../middleware/image-upload.middleware.js";

const router = Router();

router.get("/", getAuctions);
router.get("/:id", getAuction);
router.post("/", authenticateToken, postAuction);
router.patch("/:id/cancel", authenticateToken, patchCancelAuction);
router.get("/:id/bids", getAuctionBids);
router.post("/:id/bids", authenticateToken, postBid);
router.post("/:id/images", authenticateToken, uploadAuctionImages, postAuctionImages);
router.patch("/:id/images/:imageId/cover", authenticateToken, patchAuctionCover);

export default router;
