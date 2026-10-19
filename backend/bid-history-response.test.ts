import assert from "node:assert/strict";
import test from "node:test";
import { getAuctionBids } from "./controllers/bid.controller.js";

test("bid history rejects malformed auction IDs before database access", async () => {
    let statusCode = 0;
    let payload: unknown;
    const response = {
        status(code: number) {
            statusCode = code;
            return this;
        },
        json(value: unknown) {
            payload = value;
            return this;
        },
    };

    await getAuctionBids({ params: { id: "not-a-uuid" } } as never, response as never);

    assert.equal(statusCode, 400);
    assert.deepEqual(payload, { error: "Auction ID must be a valid UUID" });
});
