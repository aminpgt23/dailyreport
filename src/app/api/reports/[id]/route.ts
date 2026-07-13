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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id: Number(id) },
      include: {
        actions: true,
        reportPICs: { include: { user: { select: { id: true, nip: true, nama: true } } } },
        creator: { select: { id: true, nip: true, nama: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authUser.role === "reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
      const { date, kategori, noEjoWo, assetNumber, deskripsi, statusAkhir, actions, picIds } =
      await request.json();

    const existing = await prisma.report.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    const resolvedPicIds = await resolvePicIds(picIds);

    const report = await prisma.$transaction(async (tx) => {
      await tx.action.deleteMany({ where: { reportId: Number(id) } });
      await tx.reportPIC.deleteMany({ where: { reportId: Number(id) } });

      return tx.report.update({
        where: { id: Number(id) },
        data: {
          date: new Date(date),
          kategori,
          noEjoWo: noEjoWo || null,
          assetNumber,
          deskripsi,
          statusAkhir,
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
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Update report error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authUser.role === "reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const existing = await prisma.report.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    await prisma.report.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete report error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
