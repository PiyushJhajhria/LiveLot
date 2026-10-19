
import prisma from "../prisma.js";

export interface PlaceBidResult {
  result: string;
  currentPrice: string | null;
}

export async function placeBid(
  auctionId: string,
  userId: string,
  amount: string
): Promise<PlaceBidResult> {
  const rows = await prisma.$queryRaw<
    { result: string; current_price: string | null }[]
  >`
    SELECT result, current_price
    FROM public.place_bid_v2(
      ${auctionId}::uuid,
      ${userId}::uuid,
      ${amount}::numeric
    )
  `;

  if (
    rows.length !== 1 ||
    typeof rows[0].result !== "string"
  ) {
    throw new Error("Unexpected response from place_bid_v2");
  }

  const price = rows[0].current_price;

  return {
    result: rows[0].result,
    currentPrice:
      price === null ? null : String(price),
  };
}
