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

      if (!row.nip || !row.nama || !row.password || !row.role) {
        errors.push({ baris, pesan: "NIP, Nama, Password, dan Role wajib diisi" });
        continue;
      }

      const validRoles = ["user", "admin", "superadmin", "reviewer"];
      if (!validRoles.includes(row.role.trim().toLowerCase())) {
        errors.push({ baris, pesan: `Role tidak valid: ${row.role}` });
        continue;
      }

      const existing = await prisma.user.findUnique({
        where: { nip: row.nip.trim() },
      });

      if (existing) {
        skipped++;
        continue;
      }

      let area: string | null = null;
      if (row.bagian && row.section) {
        const section = await prisma.section.findFirst({
          where: {
            bagian: row.bagian.trim(),
            section: row.section.trim(),
          },
        });
        if (!section) {
          errors.push({ baris, pesan: `Bagian/Section tidak ditemukan: ${row.bagian} - ${row.section}` });
          continue;
        }
        area = String(section.id);
      }

      try {
        await prisma.user.create({
          data: {
            nip: row.nip.trim(),
            nama: row.nama.trim(),
            password: row.password,
            role: row.role.trim().toLowerCase(),
            group: row.group?.trim() || null,
            area,
          },
        });
        success++;
      } catch {
        errors.push({ baris, pesan: "Gagal menyimpan user" });
      }
    }

    return NextResponse.json({ success, skipped, errors });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
