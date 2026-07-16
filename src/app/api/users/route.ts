import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const filterRole = searchParams.get("role") || "";
  const filterGroup = searchParams.get("group") || "";
  const filterArea = searchParams.get("area") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "10")));

  const where: Record<string, unknown> = {};
  if (user.role === "superadmin") {
    // no filter — all users
  } else {
    where.role = { in: ["user", "admin", "reviewer"] };
  }

  if (search) {
    where.OR = [
      { nip: { contains: search } },
      { nama: { contains: search } },
    ];
  }
  if (filterRole) where.role = filterRole;
  if (filterGroup) where.group = filterGroup;
  if (filterArea) where.area = filterArea;

  const skip = (page - 1) * perPage;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        nip: true,
        nama: true,
        role: true,
        group: true,
        area: true,
        createdAt: true,
      },
      orderBy: { nama: "asc" },
      skip,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}

export async function POST(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  if (!authUser || (authUser.role !== "admin" && authUser.role !== "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { nip, nama, role, group, area, password } = await request.json();

    if (!nip || !nama || !role || !password) {
      return NextResponse.json(
        { error: "NIP, Nama, Role, dan Password wajib diisi" },
        { status: 400 }
      );
    }

    if (authUser.role !== "superadmin" && !["user", "reviewer"].includes(role)) {
      return NextResponse.json({ error: "Anda tidak diizinkan membuat role ini" }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { nip } });
    if (existing) {
      return NextResponse.json(
        { error: "NIP sudah terdaftar" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { nip, nama, role, group: group || null, area: area || null, password: hashed },
      select: { id: true, nip: true, nama: true, role: true, group: true, area: true },
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
