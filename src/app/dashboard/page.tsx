"use client";

import { useState, useEffect } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import Pagination from "@/components/Pagination";

interface ManHour {
  id: number;
  nip: string;
  nama: string;
  group: string | null;
  area: string | null;
  totalLaporan: number;
  totalJam: string;
  totalJamDecimal: number;
  targetMinutes: number;
  persentase: number;
}

interface BagianItem {
  id: number;
  bagian: string;
  section: string;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const PER_PAGE = 10;
  const [mhPage, setMhPage] = useState(1);
  const [stats, setStats] = useState({
    totalHariIni: 0,
    selesai: 0,
    belumSelesai: 0,
  });
  const [manhours, setManhours] = useState<ManHour[]>([]);
  const [loadingMH, setLoadingMH] = useState(true);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [bagianOptions, setBagianOptions] = useState<{ value: string; label: string }[]>([]);
  const [filterSection, setFilterSection] = useState("");
  const [filterBagian, setFilterBagian] = useState("");
  const [userRole, setUserRole] = useState("");
  const canFilter = userRole === "admin" || userRole === "superadmin" || userRole === "reviewer";

  useEffect(() => {
    async function fetchMeta() {
      const [sRes, meRes] = await Promise.all([
        fetch("/api/sections"),
        fetch("/api/auth/me"),
      ]);
      if (sRes.ok) {
        const sData = await sRes.json();
        const sectionData = sData.sections;
        setSectionOptions([...new Set<string>(sectionData.map((s: any) => s.section))].sort());
        setBagianOptions([
          { value: "", label: "Semua" },
          ...sectionData.map((s: any) => ({
            value: String(s.id),
            label: `${s.bagian} (${s.section})`,
          })),
        ]);
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        setUserRole(meData.user?.role || "");
      }
    }
    fetchMeta();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/shift?today=1");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // silent
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchManHour() {
      setLoadingMH(true);
      try {
        const today = getToday();
        const params = new URLSearchParams({ start: today, end: today, groupBased: "1" });
        if (filterSection) params.set("section", filterSection);
        if (filterBagian) params.set("bagian", filterBagian);
        const res = await fetch(`/api/manhour?${params}`);
        if (res.ok) {
          const data = await res.json();
          setManhours(data.manhours);
        }
      } catch {
        // silent
      } finally {
        setLoadingMH(false);
      }
    }
    fetchManHour();
  }, [filterSection, filterBagian]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Laporan Hari Ini</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalHariIni}</p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Selesai</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.selesai}
          </p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Belum Selesai</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.belumSelesai}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Man Hour Hari Ini ({getToday()})
          </h2>
          {canFilter && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterSection}
                onChange={(e) => { setFilterSection(e.target.value); setFilterBagian(""); }}
                className="w-36 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Semua</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="w-36">
                <SearchableSelect
                  options={filterSection ? bagianOptions.filter((b) => !b.value || b.label.endsWith(`(${filterSection})`)) : bagianOptions}
                  value={filterBagian}
                  onChange={(v) => {
                    setFilterBagian(v);
                    if (v) {
                      const matched = bagianOptions.find((b) => b.value === v);
                      if (matched) {
                        const sec = matched.label.match(/\((.+)\)$/)?.[1] || "";
                        setFilterSection(sec);
                      }
                    }
                  }}
                  placeholder="Cari Bagian..."
                />
              </div>
            </div>
          )}
        </div>
        {loadingMH ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
        ) : manhours.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data man hour</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Nama</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Group</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Total Jam</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Jam Kerja</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Utilisasi</th>
                </tr>
              </thead>
              <tbody>
                  {[...manhours]
                    .sort((a, b) => a.nama.localeCompare(b.nama))
                    .slice((mhPage - 1) * PER_PAGE, mhPage * PER_PAGE)
                    .map((mh) => (
                    <tr
                      key={mh.id}
                      className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                    >
                      <td className="px-4 py-3 font-medium dark:text-gray-300">{mh.nama}</td>
                      <td className="px-4 py-3 dark:text-gray-300">{mh.group || "-"}</td>
                      <td className="px-4 py-3 font-mono dark:text-gray-300">{mh.totalJam}</td>
                      <td className="px-4 py-3 dark:text-gray-300">
                        {mh.group === "4G3S" ? "7 jam" : "8 jam"}
                      </td>
                      <td className="px-4 py-3 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className={`h-full rounded-full ${
                                mh.persentase >= 80
                                  ? "bg-green-500"
                                  : mh.persentase >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(mh.persentase, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {mh.persentase}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <Pagination page={mhPage} totalPages={Math.ceil(manhours.length / PER_PAGE)} onChange={setMhPage} />
          </div>
        )}
      </div>
    </div>
  );
}
