import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser || authUser.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { rows } = await request.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Data kosong" }, { status: 400 });
    }

    let success = 0;
    let skipped = 0;
    const errors: { baris: number; pesan: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const baris = i + 2;

      if (!row.assetNumber || !row.area) {
        errors.push({ baris, pesan: "Asset Number dan Area wajib diisi" });
        continue;
      }

      const existing = await prisma.asset.findUnique({
        where: { assetNumber: row.assetNumber.trim() },
      });

      if (existing) {
        skipped++;
        continue;
      }

      try {
        await prisma.asset.create({
          data: { assetNumber: row.assetNumber.trim(), area: row.area.trim() },
        });
        success++;
      } catch {
        errors.push({ baris, pesan: "Gagal menyimpan asset" });
      }
    }

    return NextResponse.json({ success, skipped, errors });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
