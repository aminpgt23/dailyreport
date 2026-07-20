"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface User {
  id: number;
  nip: string;
  nama: string;
  role: string;
  group: string | null;
  area: string | null;
}

const icons: Record<string, ReactNode> = {
  dashboard: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  laporan: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  detail: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  machine: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  asset: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  section: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  akun: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/login");
      }
    }
    fetchUser();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  let navLinks: { key: string; href: string; label: string }[];

  if (user?.role === "mymc") {
    navLinks = [
      { key: "machine", href: "/dashboard/machine", label: "My Machine" },
    ];
  } else {
    navLinks = [
      { key: "dashboard", href: "/dashboard", label: "Dashboard" },
      { key: "laporan", href: "/dashboard/reports", label: "Laporan" },
      { key: "detail", href: "/dashboard/detail", label: "Detail" },
      { key: "machine", href: "/dashboard/machine", label: "My Machine" },
    ];

    if (user?.role === "admin" || user?.role === "superadmin") {
      navLinks.push(
        { key: "asset", href: "/dashboard/assets", label: "Asset" },
        { key: "section", href: "/dashboard/sections", label: "Section" },
        { key: "akun", href: "/dashboard/users", label: "Akun" }
      );
    }
  }

  const initial = user?.nama?.charAt(0)?.toUpperCase() || "?";
  const roleLabel = user?.role === "superadmin" ? "Super Admin" : user?.role === "admin" ? "Admin" : user?.role === "reviewer" ? "Reviewer" : user?.role === "mymc" ? "MyMC" : "User";

  const expanded = !collapsed || isHovered;

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — fixed */}
      <aside
        onMouseEnter={() => { if (collapsed) setIsHovered(true); }}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 shadow-lg transition-all duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${expanded ? "w-64" : "w-16"} lg:translate-x-0`}
      >
        {/* User avatar / info — top most, h-16 sejajar header */}
        <div className={`flex h-16 items-center border-b dark:border-gray-700 ${expanded ? "gap-3 px-5" : "justify-center"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-sm font-bold text-blue-700 dark:text-blue-200">
            {initial}
          </div>
          {expanded && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{user?.nama}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${expanded ? "px-3 py-4" : "px-1 py-4"}`}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeSidebar}
                className={`mb-1 flex items-center rounded-lg text-sm font-medium transition ${
                  expanded
                    ? "gap-3 px-3 py-2.5"
                    : "justify-center px-0 py-3"
                } ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
                title={!expanded ? link.label : undefined}
              >
                <span className={isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-400 dark:text-gray-500"}>
                  {icons[link.key]}
                </span>
                {expanded && link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className={`border-t dark:border-gray-700 ${expanded ? "px-3 py-3" : "px-1 py-3"}`}>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center rounded-lg text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/30 ${
              expanded ? "gap-3 px-3 py-2.5" : "justify-center px-0 py-3"
            }`}
            title={!expanded ? "Logout" : undefined}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {expanded && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main area — padding-left matches sidebar width */}
      <div
        className={`transition-all duration-300 ${
          expanded ? "lg:pl-64" : "lg:pl-16"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b dark:border-gray-700 bg-white dark:bg-gray-900 px-4 shadow-sm">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setSidebarOpen(!sidebarOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Maintenance Daily Report
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
