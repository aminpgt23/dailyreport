import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbPath = path.resolve(process.cwd(), "dev.db");

const adapter = new PrismaLibSql({
  url: `file:${dbPath}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const dummyUsers = await prisma.user.findMany({
    where: { nip: { startsWith: "DUMMY" } },
    select: { id: true },
  });

  if (dummyUsers.length === 0) {
    console.log("No dummy data found.");
    return;
  }

  const userIds = dummyUsers.map((u) => u.id);

  console.log(`Deleting ${userIds.length} dummy users and related data...`);

  const deletedMR = await prisma.machineReport.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`  MachineReports deleted: ${deletedMR.count}`);

  const deletedReports = await prisma.report.deleteMany({
    where: { createdBy: { in: userIds } },
  });
  console.log(`  Reports deleted: ${deletedReports.count} (cascaded to Actions & ReportPICs)`);

  const deletedAssets = await prisma.asset.deleteMany({
    where: { assetNumber: { startsWith: "DUMMY-" } },
  });
  console.log(`  Assets deleted: ${deletedAssets.count}`);

  const deletedUsers = await prisma.user.deleteMany({
    where: { nip: { startsWith: "DUMMY" } },
  });
  console.log(`  Users deleted: ${deletedUsers.count}`);

  console.log("Unseed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
