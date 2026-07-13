import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

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
    const { nip, nama, role, group, area, password } = await request.json();

    const existing = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (authUser.role !== "superadmin" && (existing.role === "admin" || existing.role === "superadmin")) {
      return NextResponse.json({ error: "Anda tidak diizinkan mengubah user ini" }, { status: 403 });
    }

    if (role && authUser.role !== "superadmin" && !["user", "reviewer"].includes(role)) {
      return NextResponse.json({ error: "Anda tidak diizinkan mengatur role ini" }, { status: 403 });
    }

    if (nip && nip !== existing.nip) {
      const nipExists = await prisma.user.findUnique({ where: { nip } });
      if (nipExists) {
        return NextResponse.json(
          { error: "NIP sudah digunakan user lain" },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (nip) data.nip = nip;
    if (nama) data.nama = nama;
    if (role) data.role = role;
    if (group !== undefined) data.group = group || null;
    if (area !== undefined) data.area = area || null;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, nip: true, nama: true, role: true, group: true, area: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update user error:", error);
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

    const existing = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (authUser.role !== "superadmin" && (existing.role === "admin" || existing.role === "superadmin")) {
      return NextResponse.json({ error: "Anda tidak diizinkan menghapus user ini" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
