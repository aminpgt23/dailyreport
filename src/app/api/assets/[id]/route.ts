import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getUserFromRequest(request);
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { assetNumber, area } = await request.json();

    const existing = await prisma.asset.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Asset tidak ditemukan" },
        { status: 404 }
      );
    }

    if (assetNumber && assetNumber !== existing.assetNumber) {
      const dup = await prisma.asset.findUnique({
        where: { assetNumber },
      });
      if (dup) {
        return NextResponse.json(
          { error: "Asset Number sudah digunakan" },
          { status: 409 }
        );
      }
    }

    const asset = await prisma.asset.update({
      where: { id: Number(id) },
      data: {
        ...(assetNumber && { assetNumber }),
        ...(area && { area }),
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Update asset error:", error);
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
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.asset.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Asset tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.asset.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete asset error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
