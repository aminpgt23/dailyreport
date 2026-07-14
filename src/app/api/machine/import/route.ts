import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

function parseDate(value: string): Date | null {
  if (!value) return null;

  // Excel serial number (e.g. 45478)
  if (/^\d+$/.test(value.trim())) {
    const serial = Number(value.trim());
    if (serial > 0 && serial < 100000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      epoch.setUTCDate(epoch.getUTCDate() + serial);
      return epoch;
    }
  }

  // DD/MM/YYYY or D/M/YYYY
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // ISO YYYY-MM-DD or other parseable format
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;

  return null;
}

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

      if (!row.tanggal || !row.assetNumber || !row.deskripsi || !row.kategori || !row.pelapor) {
        errors.push({ baris, pesan: "Tanggal, Asset Number, Deskripsi, Kategori, dan Pelapor wajib diisi" });
        continue;
      }

      const tanggal = parseDate(row.tanggal);
      if (!tanggal) {
        errors.push({ baris, pesan: `Format tanggal tidak valid: "${row.tanggal}"` });
        continue;
      }

      let tanggalPelaksanaan: Date | null = null;
      if (row.tanggalPelaksanaan) {
        tanggalPelaksanaan = parseDate(row.tanggalPelaksanaan);
        if (!tanggalPelaksanaan) {
          errors.push({ baris, pesan: `Format tanggal pelaksanaan tidak valid: "${row.tanggalPelaksanaan}"` });
          continue;
        }
      }

      try {
        await prisma.machineReport.create({
          data: {
            tanggal,
            assetNumber: row.assetNumber.trim(),
            deskripsi: row.deskripsi.trim(),
            kategori: row.kategori.trim(),
            pelapor: row.pelapor.trim(),
            area: row.area ? row.area.trim() : "",
            status: row.status ? row.status.trim() : "B.OK",
            actionPerbaikan: row.actionPerbaikan ? row.actionPerbaikan.trim() : null,
            pelaksana: row.pelaksana ? row.pelaksana.trim() : null,
            tanggalPelaksanaan,
            userId: authUser.userId,
          },
        });
        success++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal menyimpan data";
        errors.push({ baris, pesan: msg });
      }
    }

    return NextResponse.json({ success, skipped, errors });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
