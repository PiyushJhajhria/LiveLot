# Prisma Schema Design

## Why Prisma?

Prisma provides:

- Type-safe database queries
- Relationship management
- Migrations
- Transactions
- Better developer experience

Prisma will sit between:

Application
↓
Prisma
↓
PostgreSQL

---

# ID Strategy

Decision:

Use UUID instead of INT.

Reason:

- Harder to guess IDs
- Better for distributed systems
- Industry standard
- Safer for public APIs

Example:

```text
550e8400-e29b-41d4-a716-446655440000
```

---

# User Model

Fields:

| Field | Type | Notes |
|---------|---------|---------|
| id | UUID | Primary Key |
| name | String | User name |
| email | String | Unique |
| passwordHash | String | Hashed password |
| createdAt | DateTime | Account creation |

Relationships:

One User:

- Creates many auctions
- Places many bids

---

# Auction Model

Fields:

| Field | Type | Notes |
|---------|---------|---------|
| id | UUID | Primary Key |
| title | String | Auction title |
| description | String | Item description |
| startingPrice | Decimal | Starting price |
| currentPrice | Decimal | Highest current bid |
| status | Enum | Auction state |
| startTime | DateTime | Start time |
| endTime | DateTime | End time |
| sellerId | UUID | Owner |
| winnerId | UUID? | Nullable |
| createdAt | DateTime | Creation time |

Relationships:

One Auction:

- Belongs to one seller
- Has many bids
- May have one winner

---

# Bid Model

Fields:

| Field | Type | Notes |
|---------|---------|---------|
| id | UUID | Primary Key |
| auctionId | UUID | Related auction |
| userId | UUID | Bidder |
| amount | Decimal | Bid amount |
| createdAt | DateTime | Bid timestamp |

Relationships:

One Bid:

- Belongs to one auction
- Belongs to one user

---

# Auction Status Enum

Allowed States:

```text
DRAFT
SCHEDULED
LIVE
ENDED
SETTLED
```

Reason:

Prevent invalid states.

Example:

❌ running

❌ active

❌ finished

Only predefined values allowed.

---

# Why Store currentPrice?

We already have bid history.

But:

Finding highest bid every request:

```sql
SELECT MAX(amount)
FROM bids;
```

would become expensive.

Instead:

Auction stores:

```text
currentPrice
```

for quick reads.

Bid table stores:

```text
full history
```

for auditing.

---

# Why Store winnerId?

Option 1:

Calculate winner every time.

Problem:

Repeated expensive query.

Option 2:

Store winnerId.

Benefits:

- Faster reads
- Simpler frontend
- Easier winner display

Chosen Approach:

Store winnerId after auction completion.

---

# Bid Rules

A bid is valid only if:

- Auction exists
- Auction is LIVE
- Auction not expired
- User is not seller
- Amount > currentPrice

---

# Concurrency Strategy

Problem:

Two users bid simultaneously.

Solution:

PostgreSQL Transaction

+
Row Locking

Example:

Transaction Start

↓

Lock Auction Row

↓

Validate Bid

↓

Insert Bid

↓

Update Current Price

↓

Commit

Result:

Consistent auction state.

---

# Future Tables (Not Now)

Potential future additions:

- Notifications
- Categories
- Watchlists
- Payments
- Audit Logs

Not part of MVP.