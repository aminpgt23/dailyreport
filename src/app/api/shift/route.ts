import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const today = searchParams.get("today") === "1";
  const section = searchParams.get("section");
  const bagian = searchParams.get("bagian");

  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const where: Record<string, unknown> = {
    date: { gte: startOfDay, lte: endOfDay },
  };

  if (authUser.role === "admin" || authUser.role === "superadmin" || authUser.role === "reviewer") {
    if (bagian) {
      let bagianName = bagian;
      let secIds: string[] = [];
      if (/^\d+$/.test(bagian)) {
        const sec = await prisma.section.findUnique({ where: { id: Number(bagian) } });
        if (sec) {
          bagianName = sec.bagian;
          secIds = [bagian];
        }
      } else {
        const secs = await prisma.section.findMany({ where: { bagian } });
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
      where.createdBy = { in: userIds.map((u) => u.id) };
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
              OR: [{ area: b }, { area: { startsWith: b + "||" } }],
            })),
          ],
        },
        select: { id: true },
      });
      where.createdBy = { in: userIds.map((u) => u.id) };
    }
  } else {
    where.reportPICs = { some: { userId: authUser.userId } };
  }

  const allReports = await prisma.report.findMany({
    where,
    include: {
      actions: true,
      reportPICs: { include: { user: { select: { id: true, nip: true, nama: true, group: true } } } },
      creator: { select: { id: true, nip: true, nama: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  function isSelesai(status: string) {
    return status === "OK" || status === "100%";
  }

  const totalHariIni = allReports.length;
  const selesai = allReports.filter((r) => isSelesai(r.statusAkhir)).length;
  const belumSelesai = totalHariIni - selesai;

  const picStats: Record<string, { nama: string; total: number; selesai: number; group?: string }> = {};
  for (const report of allReports) {
    for (const pic of report.reportPICs) {
      if (!picStats[pic.user.nip]) {
        picStats[pic.user.nip] = {
          nama: pic.user.nama,
          total: 0,
          selesai: 0,
          group: pic.user.group || undefined,
        };
      }
      picStats[pic.user.nip].total++;
      if (isSelesai(report.statusAkhir)) {
        picStats[pic.user.nip].selesai++;
      }
    }
  }

  if (today) {
    return NextResponse.json({ totalHariIni, selesai, belumSelesai });
  }

  return NextResponse.json({
    totalHariIni,
    selesai,
    belumSelesai,
    reports: allReports,
    picStats: Object.entries(picStats)
      .filter(([nip]) => nip !== "NS" && !nip.toLowerCase().includes("dummy"))
      .map(([nip, data]) => ({
        nip,
        ...data,
        persentase: data.total > 0 ? Math.round((data.selesai / data.total) * 100) : 0,
      })),
  });
}
