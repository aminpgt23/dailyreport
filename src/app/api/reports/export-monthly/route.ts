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
  const month = parseInt(searchParams.get("month") || "0");
  const year = parseInt(searchParams.get("year") || "0");
  const section = searchParams.get("section") || "";
  const bagian = searchParams.get("bagian") || "";

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Parameter month (1-12) dan year wajib diisi" },
      { status: 400 }
    );
  }

  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  const where: Record<string, unknown> = {
    date: { gte: startDate, lte: endDate },
  };

  if (authUser.role !== "admin" && authUser.role !== "superadmin" && authUser.role !== "reviewer") {
    const authUserData = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { area: true },
    });
    if (authUserData?.area) {
      const userArea = authUserData.area;
      let userBagian: string | undefined;
      if (/^\d+$/.test(userArea)) {
        const sec = await prisma.section.findUnique({ where: { id: Number(userArea) } });
        if (sec) userBagian = sec.bagian;
      } else if (userArea.includes("||")) {
        userBagian = userArea.split("||")[0];
      } else {
        userBagian = userArea;
      }
      if (userBagian) {
        const userSection = await prisma.section.findFirst({
          where: { bagian: userBagian },
          select: { section: true },
        });
        if (userSection) {
          const secs = await prisma.section.findMany({
            where: { section: userSection.section },
            select: { id: true, bagian: true },
          });
          const bagianList = secs.map((s) => s.bagian);
          const secIds = secs.map((s) => String(s.id));
          const sectionUserIds = await prisma.user.findMany({
            where: {
              OR: [
                { area: { in: secIds } },
                ...bagianList.map((b) => ({
                  OR: [{ area: b }, { area: { startsWith: b + "||" } }],
                })),
              ],
            },
            select: { id: true },
          });
          const uidList = sectionUserIds.map((u) => u.id);
          where.OR = [
            { createdBy: { in: uidList } },
            { reportPICs: { some: { userId: { in: uidList } } } },
          ];
        } else {
          where.reportPICs = { some: { userId: authUser.userId } };
        }
      } else {
        where.reportPICs = { some: { userId: authUser.userId } };
      }
    } else {
      where.reportPICs = { some: { userId: authUser.userId } };
    }
  }

  if (bagian) {
    let bagianName = bagian;
    let secIds: string[] = [];
    if (/^\d+$/.test(bagian)) {
      const sec = await prisma.section.findUnique({
        where: { id: Number(bagian) },
      });
      if (sec) {
        bagianName = sec.bagian;
        secIds = [bagian];
      }
    } else {
      const secs = await prisma.section.findMany({
        where: { bagian },
        select: { id: true },
      });
      secIds = secs.map((s) => String(s.id));
    }
    const userIds = await prisma.user.findMany({
      where: {
        OR: [
          { area: { in: secIds } },
          { area: bagianName },
          { area: { startsWith: bagianName + "||" } },
        ],
      },
      select: { id: true },
    });
    const uidList = userIds.map((u) => u.id);
    where.OR = [
      { createdBy: { in: uidList } },
      { reportPICs: { some: { userId: { in: uidList } } } },
    ];
  } else if (section) {
    const secs = await prisma.section.findMany({
      where: { section },
      select: { id: true, bagian: true },
    });
    const bagianList = secs.map((s) => s.bagian);
    const secIds = secs.map((s) => String(s.id));
    const userIds = await prisma.user.findMany({
      where: {
        OR: [
          { area: { in: secIds } },
          ...bagianList.map((b) => ({
            OR: [
              { area: b },
              { area: { startsWith: b + "||" } },
            ],
          })),
        ],
      },
      select: { id: true },
    });
    const uidList = userIds.map((u) => u.id);
    where.OR = [
      { createdBy: { in: uidList } },
      { reportPICs: { some: { userId: { in: uidList } } } },
    ];
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

  const monthName = startDate.toLocaleString("id-ID", { month: "long" });
  XLSX.utils.book_append_sheet(wb, ws, `Laporan ${monthName} ${year}`);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan_${monthName.toLowerCase()}_${year}.xlsx"`,
    },
  });
}

function formatTime(iso: string | Date): string {
  return new Date(iso).toTimeString().slice(0, 5);
}
