CREATE TABLE "public"."auction_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auction_id" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auction_images_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auction_images_auction_id_sort_order_idx" ON "public"."auction_images"("auction_id", "sort_order");
CREATE UNIQUE INDEX "auction_images_one_cover_per_auction" ON "public"."auction_images"("auction_id") WHERE "is_cover" = true;
ALTER TABLE "public"."auction_images" ADD CONSTRAINT "auction_images_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
