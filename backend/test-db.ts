import prisma from "./prisma.js";

async function main() {
  const auctions = await prisma.auctions.findMany({
    take: 5,
  });

  console.log("Database connection successful!");
  console.log(auctions);
}

main()
  .catch((error) => {
    console.error("Database test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });