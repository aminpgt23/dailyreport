import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "Parameter start dan end wajib diisi" },
      { status: 400 }
    );
  }

  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  const where: Record<string, unknown> = {
    date: { gte: startDate, lte: endDate },
  };
  if (authUser.role !== "admin" && authUser.role !== "superadmin") {
    where.reportPICs = { some: { userId: authUser.userId } };
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      actions: true,
      reportPICs: { include: { user: { select: { nip: true, nama: true } } } },
      creator: { select: { nip: true, nama: true } },
    },
    orderBy: { date: "asc" },
  });

  const rows = reports.map((r, i) => {
    const actionStr = r.actions
      .map(
        (a, j) =>
          `${j + 1}. ${a.deskripsi} (${formatTime(a.jamMulai)}-${formatTime(a.jamSelesai)})`
      )
      .join("; ");

    return {
      No: i + 1,
      Tanggal: r.date.toISOString().slice(0, 10),
      Kategori: r.kategori,
      "No EJO/WO": r.noEjoWo || "",
      "Asset Number": r.assetNumber,
      Deskripsi: r.deskripsi,
      "Action Perbaikan": actionStr,
      PIC: r.reportPICs.map((p) => p.user.nama).join(", "),
      Pelapor: r.creator.nama,
      "Status Akhir": r.statusAkhir,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 4 },
    { wch: 12 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
    { wch: 40 },
    { wch: 50 },
    { wch: 30 },
    { wch: 16 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Laporan");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan_${start}_${end}.xlsx"`,
    },
  });
}

function formatTime(iso: string | Date): string {
  return new Date(iso).toTimeString().slice(0, 5);
}
