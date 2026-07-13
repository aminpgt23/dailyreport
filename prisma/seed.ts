import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import bcrypt from "bcryptjs";

const dbPath = path.resolve(process.cwd(), "dev.db");

const adapter = new PrismaLibSql({
  url: `file:${dbPath}`,
});

const prisma = new PrismaClient({ adapter });

const firstNames = [
  "Ahmad", "Budi", "Citra", "Dwi", "Eko", "Fitri", "Gunawan", "Hendra",
  "Indah", "Joko", "Kurnia", "Lestari", "Mulyadi", "Nurul", "Oscar",
  "Purnomo", "Rahmat", "Sari", "Tri", "Utami", "Vina", "Wahyudi",
  "Yanti", "Zainal", "Agus", "Bayu", "Cahyo", "Dian", "Edi", "Fajar",
  "Gilang", "Hari", "Intan", "Joko", "Kiki", "Lilis", "Mega", "Nanda",
  "Oki", "Putri", "Rizky", "Sinta", "Teguh", "Umar", "Vega", "Wulan",
  "Yoga", "Zahra", "Adi", "Bagus", "Cindy", "Danu", "Elok",
];

const roles = ["user", "user", "user", "user", "user", "user", "user", "user", "admin", "reviewer"];
const groups = ["Non Shift", "4G3S"];
const areas = ["Material", "Building", "Curing", "FI", "Other"];
const categories = ["Normal", "Medium", "High"];
const reportCategories = [
  "EJO / JO", "Preventive Maintenance", "Added Schedule", "Improvement", "Administration", "Other",
];
const deskripsiTemplates = [
  "Perbaikan {} rusak", "Penggantian {} aus", "Inspeksi {} berkala", "Kalibrasi {}",
  "Overhaul {}", "Pelumasan {} komponen", "Pembersihan {}", "Pengetesan {}",
  "Pengelasan {} retak", "Penyesuaian {} parameter",
];
const partNames = [
  "bearing", "belt conveyor", "gear box", "motor listrik", "pompa hidrolik",
  "roller chain", "coupling", "seal", "valve", "sensor",
  "limit switch", "breaker", "kontaktor", "relay", "transformer",
  "blower", "compressor", "cylinder", "piston", "nozzle",
];
const assetPrefixes = ["PUMP", "MOTOR", "FAN", "CONV", "COMP", "HTR", "MIX", "PRESS", "DRY", "COOL"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function main() {
  const existingDummy = await prisma.user.findFirst({ where: { nip: { startsWith: "DUMMY" } } });
  if (existingDummy) {
    console.log("Dummy data already exists, skipping seed.");
    return;
  }

  const password = await bcrypt.hash("admin123", 10);
  const dummyPass = await bcrypt.hash("123", 10);

  await prisma.user.upsert({
    where: { nip: "admin" },
    update: {},
    create: { nip: "admin", nama: "Administrator", role: "admin", group: "IT", area: "Head Office", password },
  });

  const sections = await prisma.section.findMany();
  if (sections.length === 0) {
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
    const created = await prisma.section.findMany();
    sections.push(...created);
  }

  // ── 200 Users ──
  console.log("Creating 200 dummy users...");
  const dummyUsers: {
    nip: string; nama: string; role: string; group: string;
    area: string; password: string;
  }[] = [];
  const usedNames = new Set<string>();
  for (let i = 1; i <= 200; i++) {
    let nama: string;
    do {
      nama = `${pick(firstNames)} ${pick(firstNames)}`;
    } while (usedNames.has(nama));
    usedNames.add(nama);
    dummyUsers.push({
      nip: `DUMMY${String(i).padStart(3, "0")}`,
      nama,
      role: pick(roles),
      group: pick(groups),
      area: String(pick(sections).id),
      password: dummyPass,
    });
  }
  await prisma.user.createMany({ data: dummyUsers });
  const allDummyUsers = await prisma.user.findMany({ where: { nip: { startsWith: "DUMMY" } } });

  // ── 250 Assets ──
  console.log("Creating 250 dummy assets...");
  const dummyAssets: { assetNumber: string; area: string }[] = [];
  for (let i = 1; i <= 250; i++) {
    dummyAssets.push({
      assetNumber: `DUMMY-${pick(assetPrefixes)}-${String(i).padStart(4, "0")}`,
      area: pick(areas),
    });
  }
  await prisma.asset.createMany({ data: dummyAssets });
  const allDummyAssets = await prisma.asset.findMany({
    where: { assetNumber: { startsWith: "DUMMY-" } },
  });

  // ── 200 Machine Reports (Jul 2026) ──
  console.log("Creating 200 dummy machine reports...");
  const machineReports: {
    tanggal: Date; assetNumber: string; deskripsi: string;
    kategori: string; pelapor: string; status: string;
    area: string; userId: number;
  }[] = [];
  for (let i = 0; i < 200; i++) {
    const day = randInt(1, 28);
    const asset = pick(allDummyAssets);
    const user = pick(allDummyUsers);
    const tgl = new Date(`2026-07-${String(day).padStart(2, "0")}T08:00:00`);
    machineReports.push({
      tanggal: tgl,
      assetNumber: asset.assetNumber,
      deskripsi: `Dummy: ${pick(deskripsiTemplates).replace("{}", pick(partNames))}`,
      kategori: pick(categories),
      pelapor: user.nama,
      status: Math.random() > 0.4 ? "OK" : "B.OK",
      area: asset.area,
      userId: user.id,
    });
  }
  await prisma.machineReport.createMany({ data: machineReports });

  // ── 200 Daily Reports (Jul 2026) ──
  console.log("Creating 200 dummy daily reports with actions & PICs...");
  for (let i = 0; i < 200; i++) {
    const day = randInt(1, 28);
    const tgl = new Date(`2026-07-${String(day).padStart(2, "0")}T00:00:00`);
    const creator = pick(allDummyUsers);
    const asset = pick(allDummyAssets);
    const cat = pick(reportCategories);
    const statusRand = Math.random();
    const statusAkhir = statusRand > 0.7 ? "OK" : statusRand > 0.4 ? "B.OK" : `${randInt(10, 90)}%`;

    const report = await prisma.report.create({
      data: {
        date: tgl,
        kategori: cat,
        noEjoWo: cat === "EJO / JO" ? `WO-${String(randInt(1000, 9999))}` : null,
        assetNumber: cat === "Other" || cat === "Administration" ? "-" : asset.assetNumber,
        deskripsi: `Dummy: ${pick(deskripsiTemplates).replace("{}", pick(partNames))}`,
        statusAkhir,
        createdBy: creator.id,
        actions: {
          create: Array.from({ length: randInt(1, 3) }, (_, ai) => {
            const startHour = randInt(7, 15);
            const duration = randInt(1, 3);
            return {
              jamMulai: new Date(`2026-07-${String(day).padStart(2, "0")}T${String(startHour).padStart(2, "0")}:00:00`),
              jamSelesai: new Date(`2026-07-${String(day).padStart(2, "0")}T${String(startHour + duration).padStart(2, "0")}:00:00`),
              deskripsi: `Action: ${pick(deskripsiTemplates).replace("{}", pick(partNames))}`,
            };
          }),
        },
        reportPICs: {
          create: [...new Set(Array.from({ length: randInt(1, 2) }, () => pick(allDummyUsers).id))]
            .map((userId) => ({ userId })),
        },
      },
    });
  }

  console.log("Seed selesai! Dummy data created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
