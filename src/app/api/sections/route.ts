import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sections = await prisma.section.findMany({
    orderBy: { section: "asc" },
  });

  return NextResponse.json({ sections });
}

export async function POST(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let bagian = "", section = "";
  try {
    const body = await request.json();
    bagian = body.bagian || "";
    section = body.section || "";

    if (!bagian || !section) {
      return NextResponse.json(
        { error: "Bagian dan Section wajib diisi" },
        { status: 400 }
      );
    }

    const sec = await prisma.section.create({
      data: { bagian, section },
    });

    return NextResponse.json({ section: sec }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: `Bagian "${bagian}" sudah ada di Section "${section}"` },
        { status: 409 }
      );
    }
    console.error("Create section error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
