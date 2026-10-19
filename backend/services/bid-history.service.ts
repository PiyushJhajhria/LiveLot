import prisma from "../prisma.js";

export async function listAuctionBids(auctionId: string) {
  return prisma.bids.findMany({
    where: { auction_id: auctionId },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      auction_id: true,
      user_id: true,
      amount: true,
      created_at: true,
    },
  });
}
