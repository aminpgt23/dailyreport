import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { nip, password } = await request.json();

    if (!nip || !password) {
      return NextResponse.json(
        { error: "NIP dan password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { nip } });
    if (!user) {
      return NextResponse.json(
        { error: "NIP atau password salah" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "NIP atau password salah" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      nip: user.nip,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        nip: user.nip,
        nama: user.nama,
        role: user.role,
        group: user.group,
        area: user.area,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
