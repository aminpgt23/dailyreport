import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

async function resolvePicIds(picIds: number[]): Promise<number[]> {
  const result: number[] = [];
  for (const id of picIds) {
    if (id === -1) {
      let nsUser = await prisma.user.findFirst({ where: { nama: "NS" }, select: { id: true } });
      if (!nsUser) {
        nsUser = await prisma.user.create({
          data: { nip: "NS", nama: "NS", role: "user", password: "" },
          select: { id: true },
        });
      }
      result.push(nsUser.id);
    } else {
      result.push(id);
    }
  }
  return result;
}

export async function POST(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authUser.role === "reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { date, kategori, noEjoWo, assetNumber, deskripsi, statusAkhir, actions, picIds } =
      await request.json();

    if (!date || !kategori || !assetNumber || !deskripsi || !statusAkhir) {
      return NextResponse.json(
        { error: "Tanggal, kategori, asset number, deskripsi, dan status wajib diisi" },
        { status: 400 }
      );
    }

    if (!actions || actions.length === 0) {
      return NextResponse.json(
        { error: "Minimal 1 action perbaikan" },
        { status: 400 }
      );
    }

    if (!picIds || picIds.length === 0) {
      return NextResponse.json(
        { error: "Minimal 1 PIC" },
        { status: 400 }
      );
    }

    const resolvedPicIds = await resolvePicIds(picIds);

    const report = await prisma.report.create({
      data: {
        date: new Date(date),
        kategori,
        noEjoWo: noEjoWo || null,
        assetNumber,
        deskripsi,
        statusAkhir,
        createdBy: authUser.userId,
        actions: {
          create: actions.map((a: { jamMulai: string; jamSelesai: string; deskripsi: string }) => ({
            jamMulai: new Date(`${date}T${a.jamMulai}:00`),
            jamSelesai: new Date(`${date}T${a.jamSelesai}:00`),
            deskripsi: a.deskripsi,
          })),
        },
        reportPICs: {
          create: resolvedPicIds.map((userId: number) => ({ userId })),
        },
      },
      include: {
        actions: true,
        reportPICs: { include: { user: { select: { id: true, nip: true, nama: true } } } },
        creator: { select: { id: true, nip: true, nama: true } },
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Create report error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const section = searchParams.get("section");
  const bagian = searchParams.get("bagian");
  const assetNumber = searchParams.get("assetNumber");

  const where: Record<string, unknown> = {};
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
  if (date) {
    const d = new Date(date);
    where.date = {
      gte: new Date(d.setHours(0, 0, 0, 0)),
      lt: new Date(d.setHours(23, 59, 59, 999)),
    };
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
  if (assetNumber) {
    where.assetNumber = assetNumber;
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      actions: true,
      reportPICs: { include: { user: { select: { id: true, nip: true, nama: true } } } },
      creator: { select: { id: true, nip: true, nama: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports });
}
