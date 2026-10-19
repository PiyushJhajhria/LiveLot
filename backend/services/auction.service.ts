import prisma from "../prisma.js";
import type { CreateAuctionInput } from "../validators/auction.validators.js";

const imageSelect = { id: true, auction_id: true, url: true, public_id: true, sort_order: true, is_cover: true, created_at: true } as const;

function withImages<T extends { auction_images: unknown[] }>(auction: T) {
  const { auction_images, ...base } = auction;
  const images = auction_images;
  return { ...base, images, coverImage: images.find((image) => (image as { is_cover?: boolean }).is_cover) ?? null };
}

export async function listAuctions() {
  return prisma.auctions.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      starting_price: true,
      current_price: true,
      seller_id: true,
      created_at: true,
      start_time: true,
      end_time: true,
      status: true,
      auction_images: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: imageSelect },
    },
  }).then((auctions) => auctions.map(withImages));
}

export async function getAuctionById(id: string) {
  return prisma.auctions.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      starting_price: true,
      current_price: true,
      seller_id: true,
      created_at: true,
      start_time: true,
      end_time: true,
      status: true,
      auction_images: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: imageSelect },
    },
  }).then((auction) => auction ? withImages(auction) : null);
}

export async function createAuction(sellerId: string, input: CreateAuctionInput) {
  return prisma.auctions.create({
    data: {
      title: input.title,
      description: input.description,
      starting_price: input.startingPrice,
      current_price: input.startingPrice,
      end_time: input.endTime,
      status: "UPCOMING",
      // Identity comes from the verified token, never from the request body.
      seller_id: sellerId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      starting_price: true,
      current_price: true,
      seller_id: true,
      created_at: true,
      start_time: true,
      end_time: true,
      status: true,
      auction_images: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: imageSelect },
    },
  }).then((auction) => auction ? withImages(auction) : null);
}

export async function cancelAuction(auctionId: string, sellerId: string) {
  // Put ownership and lifecycle rules inside the database update itself.
  // If either condition is false, no row changes.
  const result = await prisma.auctions.updateMany({
    where: {
      id: auctionId,
      seller_id: sellerId,
      status: "UPCOMING",
    },
    data: { status: "CANCELLED" },
  });

  if (result.count === 1) {
    return { kind: "cancelled" } as const;
  }

  // Distinguish a missing/other user's auction from an owned auction whose
  // lifecycle no longer permits cancellation.
  const auction = await prisma.auctions.findUnique({
    where: { id: auctionId },
    select: { seller_id: true, status: true },
  });

  if (!auction || auction.seller_id !== sellerId) {
    return { kind: "not-found" } as const;
  }

  return { kind: "conflict", status: auction.status } as const;
}
