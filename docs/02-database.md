# Database Design

## Users Table

| Column | Type | Description |
|----------|----------|----------|
| id | UUID | Primary Key |
| name | VARCHAR(100) | User name |
| email | VARCHAR(255) | Unique email |
| password_hash | VARCHAR(255) | Hashed password |
| created_at | TIMESTAMP | Account creation time |

---

## Auctions Table

| Column | Type | Description |
|----------|----------|----------|
| id | UUID | Primary Key |
| title | VARCHAR(255) | Auction title |
| description | TEXT | Item description |
| starting_price | DECIMAL(10,2) | Initial price |
| current_price | DECIMAL(10,2) | Current highest bid |
| status | VARCHAR(20) | DRAFT/LIVE/ENDED |
| start_time | TIMESTAMP | Auction start |
| end_time | TIMESTAMP | Auction end |
| seller_id | UUID | User who created auction |
| winner_id | UUID | Winning bidder |
| created_at | TIMESTAMP | Creation timestamp |

---

## Bids Table

| Column | Type | Description |
|----------|----------|----------|
| id | UUID | Primary Key |
| auction_id | UUID | Related auction |
| user_id | UUID | Bidder |
| amount | DECIMAL(10,2) | Bid amount |
| created_at | TIMESTAMP | Bid time |

---

# Relationships

User (1) ------ (N) Auction

Auction (1) ------ (N) Bid

User (1) ------ (N) Bid

Auction belongs to one seller.

Bid belongs to one user.

Bid belongs to one auction.