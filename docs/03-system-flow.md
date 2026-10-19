# System Flow & Architecture

---

# High Level Architecture

```text
                    ┌────────────────────┐
                    │     React App      │
                    │  (Frontend UI)     │
                    └─────────┬──────────┘
                              │
                    HTTP APIs │ JWT
                              │
                              ▼
                  ┌──────────────────────┐
                  │  Node.js + Express   │
                  │      Backend         │
                  └───────┬───────┬──────┘
                          │       │
                          │       │ Socket.IO
                          │       │
                          ▼       ▼
                ┌──────────────────────┐
                │      PostgreSQL      │
                │  Auctions / Users    │
                │       / Bids         │
                └──────────────────────┘

                              ▲
                              │
                              │ Real-Time Events
                              │
                    ┌─────────┴─────────┐
                    │ Connected Users   │
                    └───────────────────┘
```

---

# Request Flow

```text
User Action
     │
     ▼
React Frontend
     │
     ▼
Express Route
     │
     ▼
Service Layer
     │
     ▼
Prisma ORM
     │
     ▼
PostgreSQL
```

---

# Registration Flow

```text
User
 │
 ▼
Enter Name/Email/Password
 │
 ▼
POST /register
 │
 ▼
Validate Input
 │
 ▼
Check Existing User
 │
 ▼
Hash Password
 │
 ▼
Store User
 │
 ▼
Success Response
```

---

# Login Flow

```text
User
 │
 ▼
Enter Credentials
 │
 ▼
POST /login
 │
 ▼
Find User
 │
 ▼
Compare Password
 │
 ▼
Generate JWT
 │
 ▼
Return Token
 │
 ▼
Frontend Stores JWT
```

---

# Create Auction Flow

```text
Seller
 │
 ▼
Fill Auction Form
 │
 ▼
POST /auctions
 │
 ▼
Validate Data
 │
 ▼
Create Auction
 │
 ▼
Status = SCHEDULED
 │
 ▼
Store in Database
 │
 ▼
Auction Created
```

---

# Place Bid Flow

```text
User Places Bid
        │
        ▼
POST /auctions/:id/bid
        │
        ▼
Authenticate User
        │
        ▼
Fetch Auction
        │
        ▼
Validate Rules
        │
        ▼
Auction LIVE ?
        │
        ├── No → Reject
        │
        ▼
Bid > Current Price ?
        │
        ├── No → Reject
        │
        ▼
User != Seller ?
        │
        ├── No → Reject
        │
        ▼
BEGIN TRANSACTION
        │
        ▼
LOCK AUCTION ROW
        │
        ▼
Insert Bid
        │
        ▼
Update Current Price
        │
        ▼
COMMIT
        │
        ▼
Emit Socket Event
        │
        ▼
All Users Updated
```

---

# Concurrent Bidding Flow

```text
Current Price = ₹5000


User A                    User B
  │                         │
  ▼                         ▼
Bid ₹6000               Bid ₹7000
  │                         │
  └──────────┬──────────────┘
             │
             ▼
      Backend Server
             │
             ▼
      Lock Auction Row
             │
      ┌──────┴──────┐
      │ Transaction │
      └──────┬──────┘
             │
             ▼
     Process First Bid
             │
             ▼
     Process Second Bid
             │
             ▼
     Consistent State
```

---

# Real-Time Socket Flow

```text
User Places Bid
       │
       ▼
Backend Accepts Bid
       │
       ▼
Socket.IO Event
       │
       ▼
auction:bidUpdated
       │
       ▼
┌─────────┬─────────┬─────────┐
│ User A  │ User B  │ User C  │
└────┬────┴────┬────┴────┬────┘
     │         │         │
     ▼         ▼         ▼
 UI Updated Instantly
```

---

# Auction End Flow

```text
Auction End Time Reached
            │
            ▼
Background Job Runs
            │
            ▼
Find Highest Bid
            │
            ▼
Update winner_id
            │
            ▼
Status = ENDED
            │
            ▼
Emit auctionEnded Event
            │
            ▼
Notify All Users
            │
            ▼
Winner Displayed
```

---

# Final System Architecture

## Frontend

- React
- Vite
- Tailwind CSS
- React Query
- Socket.IO Client

## Backend

- Express.js
- JWT Authentication
- Auction Service
- Bid Service
- Socket.IO Server
- Prisma ORM

## Database

- PostgreSQL
- Users Table
- Auctions Table
- Bids Table

## Infrastructure

- Docker
- Render / Railway
- Neon PostgreSQL

---

# Key Engineering Concepts Demonstrated

- Database Design
- REST API Design
- Authentication & Authorization
- WebSockets
- Real-Time Systems
- PostgreSQL Transactions
- Row Locking
- Concurrency Handling
- State Machines
- Docker
- Deployment
- Backend Architecture
- System Design Fundamentals