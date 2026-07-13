import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role === "reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { tanggal, assetNumber, deskripsi, kategori, pelapor, area } =
      await request.json();

    if (!tanggal || !assetNumber || !deskripsi || !kategori || !pelapor) {
      return NextResponse.json(
        { error: "Tanggal, asset number, deskripsi, kategori, dan pelapor wajib diisi" },
        { status: 400 }
      );
    }

    const report = await prisma.machineReport.create({
      data: {
        tanggal: new Date(tanggal),
        assetNumber,
        deskripsi,
        kategori,
        pelapor,
        area: area || "",
        userId: authUser.userId,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Create machine report error:", error);
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
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const area = searchParams.get("area");
  const assetNumber = searchParams.get("assetNumber");
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "50")));

  const where: Record<string, unknown> = {};

  if (startDate) {
    where.tanggal = {
      ...(where.tanggal as Record<string, unknown> || {}),
      gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
    };
  }
  if (endDate) {
    where.tanggal = {
      ...(where.tanggal as Record<string, unknown> || {}),
      lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  }
  if (area) {
    where.area = area;
  }
  if (assetNumber) {
    where.assetNumber = assetNumber;
  }
  if (status) {
    where.status = status;
  }

  const [reports, total] = await Promise.all([
    prisma.machineReport.findMany({
      where,
      include: {
        user: { select: { id: true, nip: true, nama: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.machineReport.count({ where }),
  ]);

  const allStatuses = await prisma.machineReport.findMany({
    where,
    select: { status: true },
  });
  const totalOK = allStatuses.filter((r) => r.status === "OK").length;
  const totalBOK = allStatuses.filter((r) => r.status === "B.OK").length;

  return NextResponse.json({
    reports,
    stats: { total, totalOK, totalBOK },
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}
