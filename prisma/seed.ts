import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: "report_user",
  password: "f@r1z_TH93",
  database: "daily_report",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { nip: "admin" },
    update: { role: "superadmin" },
    create: { nip: "admin", nama: "Administrator", role: "superadmin", group: "IT", area: "Head Office", password },
  });
  console.log("Admin user ready (superadmin).");

  const existing = await prisma.section.count();
  if (existing === 0) {
    const initialSections = [
      { bagian: "Produksi Material", section: "Material" },
      { bagian: "Logistik Material", section: "Material" },
      { bagian: "Konstruksi Building", section: "Building / GM" },
      { bagian: "Maintenance GM", section: "Building / GM" },
      { bagian: "Produksi Curing", section: "Curing" },
      { bagian: "Quality Curing", section: "Curing" },
      { bagian: "Inspeksi FI", section: "FI" },
      { bagian: "Dokumentasi FI", section: "FI" },
      { bagian: "Perbaikan Workshop", section: "Workshop" },
      { bagian: "Fabrication", section: "Workshop" },
      { bagian: "HRD", section: "Administration" },
      { bagian: "Keuangan", section: "Administration" },
    ];
    await prisma.section.createMany({ data: initialSections });
    console.log("Sections created.");
  } else {
    console.log("Sections already exist, skipped.");
  }

  console.log("Seed selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
