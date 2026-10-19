import assert from "node:assert/strict";
import test from "node:test";
import { MAX_IMAGES_PER_AUCTION } from "./middleware/image-upload.middleware.js";
import { uploadImages, validateAuctionImageFile } from "./services/auction-image.service.js";

function file(mimetype: string, bytes: number[]) {
  return { mimetype, buffer: Buffer.from(bytes) } as Express.Multer.File;
}

test("accepts an image whose bytes match its declared type", () => {
  assert.doesNotThrow(() => validateAuctionImageFile(file("image/png", [137, 80, 78, 71, 13, 10, 26, 10])));
});

test("rejects a spoofed image MIME type", () => {
  assert.throws(
    () => validateAuctionImageFile(file("image/png", [0, 1, 2, 3])),
    /supported JPEG, PNG, GIF, or WebP/
  );
});

test("uses a six-image limit consistently in the upload middleware", () => {
  assert.equal(MAX_IMAGES_PER_AUCTION, 6);
});

test("rejects more than six images before any upload work begins", async () => {
  const validPng = file("image/png", [137, 80, 78, 71, 13, 10, 26, 10]);
  await assert.rejects(
    uploadImages("123e4567-e89b-42d3-a456-426614174000", "123e4567-e89b-42d3-a456-426614174001", Array.from({ length: 7 }, () => validPng), null),
    /at most 6 images/
  );
});
