-- Baseline for the existing auction_system database.
-- This migration is resolved as already applied on the existing database.
-- It is intentionally complete for fresh environments.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

CREATE TABLE "public"."auctions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "starting_price" DECIMAL(12,2) NOT NULL,
    "current_price" DECIMAL(12,2) NOT NULL,
    "seller_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auctions_starting_price_check" CHECK ("starting_price" > 0),
    CONSTRAINT "auctions_check" CHECK ("current_price" >= "starting_price"),
    CONSTRAINT "auctions_status_check" CHECK ("status" IN ('UPCOMING', 'ACTIVE', 'ENDED', 'CANCELLED'))
);
ALTER TABLE "public"."auctions" ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "public"."bids" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auction_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bids_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bids_amount_check" CHECK ("amount" > 0)
);
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Existing bidding functions are included in the baseline so fresh databases retain
-- the same locking and validation behavior as the current application.
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid, p_user_id uuid, p_amount numeric)
RETURNS text LANGUAGE plpgsql AS $function$
DECLARE v_current_price numeric; v_status varchar(20); v_end_time timestamptz; v_seller_id uuid;
BEGIN
    SELECT current_price, status, end_time, seller_id INTO v_current_price, v_status, v_end_time, v_seller_id FROM auctions WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'Auction not found'; END IF;
    IF v_status <> 'ACTIVE' THEN RETURN 'Auction is not active'; END IF;
    IF v_end_time IS NULL OR NOW() >= v_end_time THEN RETURN 'Auction has ended'; END IF;
    IF p_user_id = v_seller_id THEN RETURN 'Seller cannot bid on own auction'; END IF;
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999999.99 THEN RETURN 'Bid amount is outside the allowed range'; END IF;
    IF p_amount <> ROUND(p_amount, 2) THEN RETURN 'Bid amount must have at most two decimal places'; END IF;
    IF p_amount < v_current_price + 0.01 THEN RETURN 'Bid must be at least 0.01 above current price'; END IF;
    INSERT INTO bids (auction_id, user_id, amount) VALUES (p_auction_id, p_user_id, p_amount);
    UPDATE auctions SET current_price = p_amount WHERE id = p_auction_id;
    RETURN 'Bid accepted';
END;
$function$;

CREATE OR REPLACE FUNCTION public.place_bid_v2(p_auction_id uuid, p_user_id uuid, p_amount numeric)
RETURNS TABLE(result text, current_price numeric) LANGUAGE plpgsql AS $function$
DECLARE v_current_price numeric; v_status varchar(20); v_start_time timestamptz; v_end_time timestamptz; v_seller_id uuid;
BEGIN
    SELECT a.current_price, a.status, a.start_time, a.end_time, a.seller_id INTO v_current_price, v_status, v_start_time, v_end_time, v_seller_id FROM auctions AS a WHERE a.id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'Auction not found'::text, NULL::numeric; RETURN; END IF;
    IF v_status <> 'ACTIVE' THEN RETURN QUERY SELECT 'Auction is not active'::text, v_current_price; RETURN; END IF;
    IF v_start_time IS NULL OR NOW() < v_start_time THEN RETURN QUERY SELECT 'Auction has not started'::text, v_current_price; RETURN; END IF;
    IF v_end_time IS NULL OR NOW() >= v_end_time THEN RETURN QUERY SELECT 'Auction has ended'::text, v_current_price; RETURN; END IF;
    IF p_user_id = v_seller_id THEN RETURN QUERY SELECT 'Seller cannot bid on own auction'::text, v_current_price; RETURN; END IF;
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999999.99 THEN RETURN QUERY SELECT 'Bid amount is outside the allowed range'::text, v_current_price; RETURN; END IF;
    IF p_amount <> ROUND(p_amount, 2) THEN RETURN QUERY SELECT 'Bid amount must have at most two decimal places'::text, v_current_price; RETURN; END IF;
    IF p_amount < v_current_price + 0.01 THEN RETURN QUERY SELECT 'Bid must be at least 0.01 above current price'::text, v_current_price; RETURN; END IF;
    INSERT INTO bids (auction_id, user_id, amount) VALUES (p_auction_id, p_user_id, p_amount);
    UPDATE auctions AS a SET current_price = p_amount WHERE a.id = p_auction_id RETURNING a.current_price INTO v_current_price;
    RETURN QUERY SELECT 'Bid accepted'::text, v_current_price;
END;
$function$;
