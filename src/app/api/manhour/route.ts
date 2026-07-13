import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  const userId = searchParams.get("userId");
  const groupBased = searchParams.get("groupBased") === "1";

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Periode start dan end wajib diisi" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const userWhere: Record<string, unknown> = {};
  if (authUser.role !== "admin" && authUser.role !== "superadmin" && authUser.role !== "reviewer") {
    userWhere.id = authUser.userId;
  } else {
    userWhere.role = { in: ["user", "admin"] };
    if (userId) {
      userWhere.id = Number(userId);
    }
  }

  let users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, nip: true, nama: true, group: true, area: true },
  });
  if (authUser.role === "admin" || authUser.role === "superadmin" || authUser.role === "reviewer") {
    users = users.filter((u) => u.nip !== "NS");
  }

  const userIds = users.map((u) => u.id);

  const reportPics = await prisma.reportPIC.findMany({
    where: {
      userId: { in: userIds },
      report: { date: { gte: start, lte: end } },
    },
    select: { userId: true, reportId: true },
  });

  const userReportMap: Record<number, Set<number>> = {};
  const allReportIds = new Set<number>();
  for (const rp of reportPics) {
    if (!userReportMap[rp.userId]) userReportMap[rp.userId] = new Set();
    userReportMap[rp.userId].add(rp.reportId);
    allReportIds.add(rp.reportId);
  }

  const actions = await prisma.action.findMany({
    where: { reportId: { in: [...allReportIds] } },
    select: { reportId: true, jamMulai: true, jamSelesai: true },
  });

  const reportMinutes: Record<number, number> = {};
  for (const action of actions) {
    const diffMs = new Date(action.jamSelesai).getTime() - new Date(action.jamMulai).getTime();
    const mins = Math.max(0, Math.round(diffMs / 60000));
    reportMinutes[action.reportId] = (reportMinutes[action.reportId] || 0) + mins;
  }

  const result = [];

  for (const user of users) {
    const userReportIds = userReportMap[user.id];
    const reportCount = userReportIds ? userReportIds.size : 0;
    let totalMinutes = 0;
    if (userReportIds) {
      for (const rid of userReportIds) {
        totalMinutes += reportMinutes[rid] || 0;
      }
    }

    const totalJam = Math.floor(totalMinutes / 60);
    const sisaMenit = totalMinutes % 60;
    const totalJamDecimal = parseFloat((totalMinutes / 60).toFixed(2));

    if (groupBased) {
      const targetMinutes = user.group === "4G3S" ? 420 : 480;
      const persentase = Math.min(
        100,
        parseFloat(((totalMinutes / targetMinutes) * 100).toFixed(1))
      );

      result.push({
        id: user.id,
        nip: user.nip,
        nama: user.nama,
        group: user.group,
        area: user.area,
        totalLaporan: reportCount,
        totalJam: `${totalJam}h ${sisaMenit}m`,
        totalJamDecimal,
        targetMinutes,
        persentase,
      });
    } else {
      const SHIFT_HOURS = 8;
      const persentase = Math.min(
        100,
        parseFloat(((totalJamDecimal / (SHIFT_HOURS * getWorkingDays(start, end))) * 100).toFixed(1))
      );

      result.push({
        id: user.id,
        nip: user.nip,
        nama: user.nama,
        group: user.group,
        area: user.area,
        totalLaporan: reportCount,
        totalJam: `${totalJam}h ${sisaMenit}m`,
        totalJamDecimal,
        persentase,
      });
    }
  }

  return NextResponse.json({
    manhours: result,
    periode: { start: startDate, end: endDate },
    workingDays: getWorkingDays(start, end),
  });
}

function getWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count || 1;
}
