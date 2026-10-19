import type { Express } from "express";
import prisma from "../prisma.js";
import { destroyImage, uploadImage } from "./cloudinary.service.js";
import { MAX_IMAGES_PER_AUCTION } from "../middleware/image-upload.middleware.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNATURES: Array<{ type: string; matches: (bytes: Buffer) => boolean }> = [
  { type: "image/jpeg", matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", matches: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { type: "image/gif", matches: (b) => b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a" },
  { type: "image/webp", matches: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export function validateAuctionImageFile(file: Express.Multer.File) {
  const signature = SIGNATURES.find((candidate) => candidate.matches(file.buffer));
  if (!signature || signature.type !== file.mimetype) throw new Error("Each file must contain a supported JPEG, PNG, GIF, or WebP image");
}

function assertUuid(value: string) {
  if (!UUID_PATTERN.test(value)) throw new Error("ID must be a valid UUID");
}

async function cleanupUploaded(publicIds: string[]) {
  await Promise.all(publicIds.map(async (publicId) => {
    try { await destroyImage(publicId); }
    catch (error) { console.error("Cloudinary cleanup failed for uploaded image", { publicId, error: error instanceof Error ? error.message : "unknown error" }); }
  }));
}

const imageSelect = { id: true, auction_id: true, url: true, public_id: true, sort_order: true, is_cover: true, created_at: true } as const;

export async function listAuctionImages(auctionId: string) {
  return prisma.auction_images.findMany({ where: { auction_id: auctionId }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: imageSelect });
}

export async function uploadImages(auctionId: string, sellerId: string, files: Express.Multer.File[], rawCoverIndex: unknown) {
  assertUuid(auctionId);
  if (!files.length) throw new Error("At least one image is required");
  if (files.length > MAX_IMAGES_PER_AUCTION) throw new Error(`An auction can contain at most ${MAX_IMAGES_PER_AUCTION} images`);
  files.forEach(validateAuctionImageFile);
  const coverIndex = rawCoverIndex === undefined || rawCoverIndex === "" ? null : Number(rawCoverIndex);
  if (coverIndex !== null && (!Number.isInteger(coverIndex) || coverIndex < 0 || coverIndex >= files.length)) throw new Error("coverIndex must identify one uploaded image");

  const auction = await prisma.auctions.findUnique({ where: { id: auctionId }, select: { seller_id: true } });
  if (!auction || auction.seller_id !== sellerId) return { kind: "not-found" as const };

  const uploaded: Array<{ url: string; public_id: string }> = [];
  try {
    for (const file of files) {
      const result = await uploadImage(file.buffer, `livelot/auctions/${auctionId}`);
      uploaded.push({ url: result.secure_url, public_id: result.public_id });
    }

    const images = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId}::uuid FOR UPDATE`;
      const count = await tx.auction_images.count({ where: { auction_id: auctionId } });
      if (count + uploaded.length > MAX_IMAGES_PER_AUCTION) throw new Error(`An auction can contain at most ${MAX_IMAGES_PER_AUCTION} images`);
      const existingCover = await tx.auction_images.findFirst({ where: { auction_id: auctionId, is_cover: true }, select: { id: true } });
      for (let index = 0; index < uploaded.length; index += 1) {
        await tx.auction_images.create({ data: { auction_id: auctionId, url: uploaded[index].url, public_id: uploaded[index].public_id, sort_order: count + index, is_cover: coverIndex === index || (coverIndex === null && !existingCover && index === 0) } });
      }
      return tx.auction_images.findMany({ where: { auction_id: auctionId }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: imageSelect });
    });
    return { kind: "uploaded" as const, images };
  } catch (error) {
    await cleanupUploaded(uploaded.map((image) => image.public_id));
    throw error;
  }
}

export async function setCoverImage(auctionId: string, imageId: string, sellerId: string) {
  assertUuid(auctionId); assertUuid(imageId);
  const auction = await prisma.auctions.findUnique({ where: { id: auctionId }, select: { seller_id: true } });
  if (!auction || auction.seller_id !== sellerId) return { kind: "not-found" as const };
  const image = await prisma.auction_images.findUnique({ where: { id: imageId }, select: { auction_id: true } });
  if (!image || image.auction_id !== auctionId) return { kind: "not-found" as const };
  const images = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId}::uuid FOR UPDATE`;
    await tx.auction_images.updateMany({ where: { auction_id: auctionId, is_cover: true }, data: { is_cover: false } });
    await tx.auction_images.update({ where: { id: imageId }, data: { is_cover: true } });
    return tx.auction_images.findMany({ where: { auction_id: auctionId }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: imageSelect });
  });
  return { kind: "updated" as const, images };
}
