# LiveLot

## Run locally

Start the existing backend on port `5000`:

```powershell
cd D:\transist\bid\backend
npm run dev
```

Then start this static frontend on port `3000`:

```powershell
cd D:\transist\bid\frontend
npm start
```

Open `http://localhost:3000`. The frontend uses the backend's existing REST routes and Socket.IO server. The API base defaults to `http://localhost:5000`; set `window.AUCTION_API_URL` in `index.html` before `app.js` loads to use another backend.

## Data and account behavior

- Sign in uses `POST /api/auth/login`; account creation uses the existing `POST /api/auth/register` route. Registration returns a user but no token, so sign in after registering.
- Auction listings and details come from `GET /api/auctions` and `GET /api/auctions/:id`.
- Persistent bid history comes from `GET /api/auctions/:id/bids`.
- Bids use the existing authenticated `POST /api/auctions/:id/bids` endpoint.
- Live updates join through `auction:join` and listen for `bid:accepted`. Since that event has no sequence/version field, the UI refreshes authoritative auction and bid-history REST data after each event.
- Test fixture listings marked `TEST FIXTURE` or `automated API test fixture` are hidden in the frontend; no database records are deleted.
- The current API has no image/category fields, so listings use an explicitly labeled neutral visual and the available status filter.
