import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/api/reports",
  "/api/assets",
  "/api/shift",
  "/api/manhour",
  "/api/users",
  "/api/machine",
];

const adminPaths = ["/api/users"];
const reviewerRestricted = [
  "/dashboard/reports/create",
  "/api/reports/export",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(token ? "/dashboard" : "/login", request.url));
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isApi = pathname.startsWith("/api");

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (isProtected && !token) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (adminPaths.some((p) => pathname.startsWith(p)) && payload.role !== "admin" && payload.role !== "superadmin" && request.method !== "GET") {
        if (isApi) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      if (payload.role === "reviewer") {
        const isEditPath = /^\/dashboard\/reports\/\d+\/edit$/.test(pathname);
        const isCreatePath = pathname === "/dashboard/reports/create";
        const isExportPath = pathname === "/api/reports/export";
        const isApiCreate = pathname === "/api/reports" && request.method === "POST";

        if (isEditPath || isCreatePath || isExportPath || isApiCreate) {
          if (isApi) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
          return NextResponse.redirect(new URL("/dashboard/reports", request.url));
        }
      }
    } catch {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/api/:path*"],
};
