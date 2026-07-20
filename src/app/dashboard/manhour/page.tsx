"use client";

import { useState, useEffect, FormEvent } from "react";
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
  persentase: number;
}

interface User {
  id: number;
  nip: string;
  nama: string;
}

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    start: monday.toISOString().slice(0, 10),
    end: friday.toISOString().slice(0, 10),
  };
}

export default function ManHourPage() {
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const weekRange = getWeekRange();
  const [startDate, setStartDate] = useState(weekRange.start);
  const [endDate, setEndDate] = useState(weekRange.end);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [manhours, setManhours] = useState<ManHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users.filter((u: User) => !u.nip.toLowerCase().includes("dummy")));
        }
      } catch {
        // silent
      }
    }
    fetchUsers();
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({ start: startDate, end: endDate });
      if (selectedUserId) params.set("userId", selectedUserId);

      const res = await fetch(`/api/manhour?${params}`);
      if (res.ok) {
        const data = await res.json();
        setManhours(data.manhours);
        setPage(1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Man Hour & Persentase</h1>

      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-4 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Tanggal Mulai
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Tanggal Akhir
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Filter Pekerja
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Semua Pekerja</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Cari"}
        </button>
      </form>

      {searched && !loading && (
        <div>
          {manhours.length === 0 ? (
            <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
              Tidak ada data untuk periode tersebut
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                Periode: {startDate} s/d {endDate}
              </p>
              <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-medium dark:text-gray-300">Nama</th>
                      <th className="px-4 py-3 font-medium dark:text-gray-300">Group</th>
                      <th className="px-4 py-3 font-medium dark:text-gray-300">Area</th>
                      <th className="px-4 py-3 font-medium dark:text-gray-300">Laporan</th>
                      <th className="px-4 py-3 font-medium dark:text-gray-300">Total Jam</th>
                      <th className="px-4 py-3 font-medium dark:text-gray-300">Utilisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manhours.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((mh) => (
                      <tr
                        key={mh.id}
                        className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                      >
                        <td className="px-4 py-3 font-medium dark:text-gray-300">{mh.nama}</td>
                        <td className="px-4 py-3 dark:text-gray-300">{mh.group || "-"}</td>
                        <td className="px-4 py-3 dark:text-gray-300">{mh.area || "-"}</td>
                        <td className="px-4 py-3 dark:text-gray-300">{mh.totalLaporan}</td>
                        <td className="px-4 py-3 font-mono dark:text-gray-300">{mh.totalJam}</td>
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
                <Pagination page={page} totalPages={Math.ceil(manhours.length / PER_PAGE)} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
