import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

export default prisma;    // lets other backend files reuse this configured instance


/*The simplified relationship is:
- PrismaClient provides the application-facing database API.
- PrismaPg provides the PostgreSQL-specific connection integration.
- PostgreSQL executes the database queries. */