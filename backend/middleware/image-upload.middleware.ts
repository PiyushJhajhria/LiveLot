import multer from "multer";
import type { NextFunction, Request, Response } from "express";

export const MAX_IMAGES_PER_AUCTION = 6;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_IMAGES_PER_AUCTION, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) callback(null, true);
    else callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  },
});

export function uploadAuctionImages(req: Request, res: Response, next: NextFunction) {
  upload.array("images", MAX_IMAGES_PER_AUCTION)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE" ? "Each image must be 5 MB or smaller" : "Upload up to 6 image files using the images field";
      res.status(400).json({ error: message });
      return;
    }
    res.status(400).json({ error: "Could not read image upload" });
  });
}
