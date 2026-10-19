# Backend Architecture

## Goal

Build a scalable backend architecture that separates responsibilities clearly and keeps business logic independent from routes and controllers.

---

# Project Structure

```text
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── db.ts
│   │   └── env.ts
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   │
│   │   ├── auction/
│   │   │   ├── auction.controller.ts
│   │   │   ├── auction.service.ts
│   │   │   ├── auction.routes.ts
│   │   │   └── auction.validation.ts
│   │   │
│   │   └── bid/
│   │       ├── bid.controller.ts
│   │       ├── bid.service.ts
│   │       ├── bid.routes.ts
│   │       └── bid.validation.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   │
│   ├── sockets/
│   │   └── auction.socket.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   └── bcrypt.ts
│   │
│   ├── app.ts
│   │
│   └── server.ts
│
├── prisma/
│   └── schema.prisma
│
├── .env
├── package.json
└── tsconfig.json
```

---

# Layered Architecture

```text
Client
 │
 ▼
Routes
 │
 ▼
Controllers
 │
 ▼
Services
 │
 ▼
Prisma ORM
 │
 ▼
PostgreSQL
```

---

# Responsibilities

## Routes

Responsible for:

- Defining API endpoints
- Connecting endpoints to controllers

Example:

```text
POST /auth/register
POST /auth/login

GET /auctions
POST /auctions

POST /auctions/:id/bid
```

Routes should contain almost no business logic.

---

## Controllers

Responsible for:

- Receiving request
- Calling service layer
- Returning response

Example:

```text
Request
↓
Validate Input
↓
Call Service
↓
Return Response
```

Controllers should stay small.

---

## Services

Responsible for:

- Business logic
- Validation rules
- Database operations
- Transactions

Examples:

- Register user
- Login user
- Create auction
- Place bid
- Determine winner

Most project complexity should live here.

---

## Prisma ORM

Responsible for:

- Database queries
- Model relationships
- Transactions

Example:

```text
Create User

Find Auction

Insert Bid

Update Current Price
```

---

## PostgreSQL

Responsible for:

- Persistent storage
- Transactions
- Row locking
- Data consistency

Stores:

- Users
- Auctions
- Bids

---

# Authentication Flow

```text
User Login
      │
      ▼
Controller
      │
      ▼
Auth Service
      │
      ▼
Verify Password
      │
      ▼
Generate JWT
      │
      ▼
Return Token
```

---

# Auction Creation Flow

```text
Seller
   │
   ▼
Create Auction Request
   │
   ▼
Auction Controller
   │
   ▼
Auction Service
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
```

---

# Bid Placement Flow

```text
User Places Bid
        │
        ▼
Bid Controller
        │
        ▼
Bid Service
        │
        ▼
Validate Rules
        │
        ▼
Begin Transaction
        │
        ▼
Lock Auction Row
        │
        ▼
Insert Bid
        │
        ▼
Update Current Price
        │
        ▼
Commit Transaction
        │
        ▼
Emit Socket Event
```

---

# Socket Architecture

Purpose:

Provide real-time updates without page refresh.

Events:

```text
joinAuction

leaveAuction

bidPlaced

outbid

auctionEnded
```

Flow:

```text
User Places Bid
        │
        ▼
Server Accepts Bid
        │
        ▼
Socket Event Emitted
        │
        ▼
All Connected Users Updated
```

---

# Middleware

## Authentication Middleware

Responsibilities:

- Verify JWT
- Extract user information
- Protect private routes

Protected Routes:

```text
POST /auctions

POST /auctions/:id/bid

GET /me
```

---

## Validation Middleware

Responsibilities:

- Validate request body
- Validate query params
- Reject invalid data

---

## Error Middleware

Responsibilities:

- Catch server errors
- Return consistent error responses

Example:

```json
{
  "success": false,
  "message": "Auction not found"
}
```

---

# Design Principles

## Single Responsibility Principle

Each file should have one clear purpose.

Examples:

- Auth Service → Authentication
- Auction Service → Auctions
- Bid Service → Bidding

---

## Separation of Concerns

Routes should not contain business logic.

Controllers should not contain database logic.

Services should contain business logic.

---

## Scalability

New features should be easy to add.

Future modules:

- Notifications
- Payments
- Analytics
- Admin Dashboard

should fit into the existing structure without major refactoring.

---

# Key Interview Discussion Topics

This architecture demonstrates:

- Backend Architecture
- Separation of Concerns
- JWT Authentication
- PostgreSQL Design
- Prisma ORM
- WebSockets
- Transactions
- Concurrency Handling
- Scalable Project Structure