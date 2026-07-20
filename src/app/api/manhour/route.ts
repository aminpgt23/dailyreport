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
  const section = searchParams.get("section") || "";
  const bagian = searchParams.get("bagian") || "";
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

  if ((authUser.role === "admin" || authUser.role === "superadmin" || authUser.role === "reviewer") && (section || bagian)) {
    let filterUserIds: number[] = [];
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
      const uids = await prisma.user.findMany({
        where: {
          OR: [
            { area: { in: secIds } },
            { area: bagianName },
            { area: { startsWith: bagianName + "||" } },
          ],
        },
        select: { id: true },
      });
      filterUserIds = uids.map((u) => u.id);
    } else if (section) {
      const secs = await prisma.section.findMany({
        where: { section },
        select: { id: true, bagian: true },
      });
      const bagianList = secs.map((s) => s.bagian);
      const secIds = secs.map((s) => String(s.id));
      const uids = await prisma.user.findMany({
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
      filterUserIds = uids.map((u) => u.id);
    }
    if (filterUserIds.length > 0) {
      if (userId) {
        const uid = Number(userId);
        userWhere.id = filterUserIds.includes(uid) ? uid : -1;
      } else {
        userWhere.id = { in: filterUserIds };
      }
    } else {
      userWhere.id = -1;
    }
  }

  let users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, nip: true, nama: true, group: true, area: true },
  });
  if (authUser.role === "admin" || authUser.role === "superadmin" || authUser.role === "reviewer") {
    users = users.filter((u) => u.nip !== "NS" && !u.nip.toLowerCase().includes("dummy"));
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

  const reportActions: Record<number, Array<{ jamMulai: Date; jamSelesai: Date }>> = {};
  for (const action of actions) {
    if (!reportActions[action.reportId]) reportActions[action.reportId] = [];
    reportActions[action.reportId].push({ jamMulai: action.jamMulai, jamSelesai: action.jamSelesai });
  }

  const result = [];

  for (const user of users) {
    const userReportIds = userReportMap[user.id];
    const reportCount = userReportIds ? userReportIds.size : 0;

    const intervals: Array<{ start: number; end: number }> = [];
    if (userReportIds) {
      for (const rid of userReportIds) {
        const acts = reportActions[rid] || [];
        for (const act of acts) {
          intervals.push({
            start: new Date(act.jamMulai).getTime(),
            end: new Date(act.jamSelesai).getTime(),
          });
        }
      }
    }

    intervals.sort((a, b) => a.start - b.start);

    let totalMinutes = 0;
    if (intervals.length > 0) {
      let curStart = intervals[0].start;
      let curEnd = intervals[0].end;
      for (let i = 1; i < intervals.length; i++) {
        if (intervals[i].start <= curEnd) {
          curEnd = Math.max(curEnd, intervals[i].end);
        } else {
          totalMinutes += Math.max(0, Math.round((curEnd - curStart) / 60000));
          curStart = intervals[i].start;
          curEnd = intervals[i].end;
        }
      }
      totalMinutes += Math.max(0, Math.round((curEnd - curStart) / 60000));
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
