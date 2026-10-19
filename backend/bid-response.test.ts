import assert from "node:assert/strict";
import test from "node:test";
import { buildSuccessfulBidResponse } from "./controllers/bid.controller.js";

test("successful bid response exposes result and preserves existing fields", () => {
    assert.deepEqual(
        buildSuccessfulBidResponse("auction-uuid", "125.50", "125.50"),
        {
            result: "Bid accepted",
            message: "Bid accepted",
            auctionId: "auction-uuid",
            amount: "125.50",
            currentPrice: "125.50",
        }
    );
});
