# Real-Time Auction Platform - Requirements

## 1. Project Goal

Build a real-time auction platform where sellers can create auctions and bidders can place bids. The system should provide instant bid updates, ensure fair bidding, prevent invalid bids, and automatically determine the winner when the auction ends.

---

# 2. Actors

## Seller

A seller can:

- Register
- Login
- Create auctions
- View auctions created by them
- View bid history
- View winner after auction completion

A seller cannot:

- Bid on their own auction
- Modify a LIVE auction
- Delete an auction after bids have been placed

---

## Bidder

A bidder can:

- Register
- Login
- Browse auctions
- View auction details
- Place bids
- View bid history
- Receive outbid notifications
- View auction results

A bidder cannot:

- Bid below the current highest bid
- Bid after the auction ends
- Bid on their own auction

---

# 3. Auction Lifecycle

Auction States:

DRAFT → SCHEDULED → LIVE → ENDED → SETTLED

## DRAFT

- Auction created
- Seller can edit details
- Not visible publicly

## SCHEDULED

- Auction has future start time
- Waiting to become LIVE

## LIVE

- Auction accepts bids
- Publicly visible
- Real-time updates enabled

## ENDED

- Auction duration expired
- No further bids allowed
- Winner determined

## SETTLED

- Winner recorded
- Auction finalized

---

# 4. Core Features

## Authentication

- User Registration
- User Login
- JWT Authentication
- Protected Routes
- Password Hashing

## Auction Management

- Create Auction
- View Auction
- Browse Auctions
- View Auction Details

## Bidding

- Place Bid
- Validate Bid Amount
- Store Bid History
- Update Highest Bid

## Real-Time Features

- Instant Bid Updates
- Live Auction Status Updates
- Outbid Notifications
- Auction End Notifications

---

# 5. Auction Rules

- Bid amount must be greater than the current highest bid.
- Auction must be in LIVE state.
- Auction must not be expired.
- Seller cannot bid on their own auction.
- Every valid bid must be stored in bid history.
- Highest valid bid becomes the current highest bid.
- Winner is determined automatically when auction ends.

---

# 6. Core Problems Being Solved

## Real-Time Communication

Without WebSockets, users must repeatedly refresh the page to see new bids.

Solution:
- WebSockets using Socket.IO

## Fair Bidding

When multiple users bid at nearly the same time, the system must process bids correctly and fairly.

## Data Consistency

Current highest bid must always match bid history.

## Automatic Winner Selection

Winner should be selected automatically when the auction expires.

---

# 7. Edge Cases

- Two users bid simultaneously.
- User refreshes page during auction.
- User disconnects and reconnects.
- Auction expires while a bid request is being processed.
- User submits the same bid multiple times.
- Invalid requests are sent to the server.
- Seller attempts to bid on own auction.
- Bid amount is lower than current highest bid.
- Auction is already ended.

---

# 8. Non-Functional Requirements

## Security

- Password Hashing
- JWT Verification
- Input Validation
- Protected Routes

## Reliability

- No valid bid should be lost.
- Bid history should remain consistent.
- Winner selection should be accurate.

## Performance

- Real-time updates should appear instantly.
- API responses should be reasonably fast.

## Scalability

System should support:

- Multiple concurrent users
- Multiple active auctions
- High bid traffic without data corruption

---

# 9. Future Enhancements

- Search and Filtering
- Categories
- Reserve Price
- Redis Caching
- Email Notifications
- Admin Dashboard
- Auction Analytics
- Payment Integration

---

# 10. Technology Stack (Planned)

## Frontend

- React
- Vite
- Tailwind CSS

## Backend

- Node.js
- Express.js

## Database

- PostgreSQL

## ORM

- Prisma

## Authentication

- JWT
- bcrypt

## Real-Time Communication

- Socket.IO

## Deployment

- Docker
- Railway / Render
- Neon PostgreSQL

---

# 11. Interview Discussion Topics

This project demonstrates:

- Database Design
- REST API Design
- Authentication & Authorization
- WebSockets
- Concurrency Handling
- Transaction Management
- State Machines
- Deployment
- System Design Fundamentals