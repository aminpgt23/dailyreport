"use client";

import { useState, useEffect } from "react";
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
      try {
        const today = getToday();
        const res = await fetch(`/api/manhour?start=${today}&end=${today}&groupBased=1`);
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
  }, []);

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
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Man Hour Hari Ini ({getToday()})
        </h2>
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
