import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.asset.findMany({
    orderBy: { assetNumber: "asc" },
  });

  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { assetNumber, area } = await request.json();

    if (!assetNumber || !area) {
      return NextResponse.json(
        { error: "Asset Number dan Area wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.asset.findUnique({
      where: { assetNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Asset Number sudah terdaftar" },
        { status: 409 }
      );
    }

    const asset = await prisma.asset.create({
      data: { assetNumber, area },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Create asset error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
