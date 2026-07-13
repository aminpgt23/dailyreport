"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";
import Pagination from "@/components/Pagination";

interface Report {
  id: number;
  date: string;
  kategori: string;
  assetNumber: string;
  deskripsi: string;
  statusAkhir: string;
  creator: { nip: string; nama: string };
  reportPICs: { user: { nip: string; nama: string } }[];
}

interface PicStat {
  nip: string;
  nama: string;
  total: number;
  selesai: number;
  persentase: number;
  group?: string;
}

interface ShiftData {
  totalHariIni: number;
  selesai: number;
  belumSelesai: number;
  reports: Report[];
  picStats: PicStat[];
}

export default function ShiftPage() {
  const PER_PAGE = 10;
  const [picPage, setPicPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"" | "selesai" | "belum">("");
  const [filterPicNip, setFilterPicNip] = useState("");
  const [userRole, setUserRole] = useState("");
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [bagianOptions, setBagianOptions] = useState<{ value: string; label: string }[]>([]);
  const [filterSection, setFilterSection] = useState("");
  const [filterBagian, setFilterBagian] = useState("");

  async function fetchShiftData() {
    setLoading(true);
    setPicPage(1);
    setReportPage(1);
    try {
      const params = new URLSearchParams({ date });
      if (filterSection) params.set("section", filterSection);
      if (filterBagian) params.set("bagian", filterBagian);
      const res = await fetch(`/api/shift?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchShiftData();
  }, [date, filterSection, filterBagian]);

  useEffect(() => {
    setReportPage(1);
  }, [filterStatus, filterPicNip]);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Detail Monitoring</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
          />
        </div>
        {(userRole === "admin" || userRole === "superadmin" || userRole === "reviewer") && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
              <select
                value={filterSection}
                onChange={(e) => { setFilterSection(e.target.value); setFilterBagian(""); }}
                className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
              >
                <option value="">Semua</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bagian</label>
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
          </>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Memuat...</p>
      ) : !data ? (
        <div className="rounded-xl border bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          Tidak ada data
        </div>
      ) : (
        <div className="contents">
          {(() => {
            const filteredReports = data.reports.filter((r) => {
              if (filterStatus === "selesai" && !(r.statusAkhir === "OK" || r.statusAkhir === "100%")) return false;
              if (filterStatus === "belum" && (r.statusAkhir === "OK" || r.statusAkhir === "100%")) return false;
              if (filterPicNip && !r.reportPICs.some((p) => p.user.nip === filterPicNip)) return false;
              return true;
            });

            return (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border bg-white dark:bg-gray-800 p-5 shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Pekerjaan</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{data.totalHariIni}</p>
                  </div>
                  <div
                    className={`cursor-pointer rounded-xl border bg-white dark:bg-gray-800 p-5 shadow-sm transition hover:shadow-md ${
                      filterStatus === "selesai" ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setFilterStatus((prev) => (prev === "selesai" ? "" : "selesai"))}
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selesai</p>
                    <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
                      {data.selesai}
                    </p>
                  </div>
                  <div
                    className={`cursor-pointer rounded-xl border bg-white dark:bg-gray-800 p-5 shadow-sm transition hover:shadow-md ${
                      filterStatus === "belum" ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setFilterStatus((prev) => (prev === "belum" ? "" : "belum"))}
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">Belum Selesai</p>
                    <p className="mt-1 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {data.belumSelesai}
                    </p>
                  </div>
                </div>

                {data.picStats.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Produktivitas per Pekerja
                    </h2>
                    <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-800 shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Nama</th>
                            <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Group</th>
                            <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Total</th>
                            <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Selesai</th>
                            <th className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.picStats.slice((picPage - 1) * PER_PAGE, picPage * PER_PAGE).map((stat) => (
                            <tr
                              key={stat.nip}
                              className={`cursor-pointer border-b dark:border-gray-700 last:border-0 transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                filterPicNip === stat.nip ? "bg-blue-50 dark:bg-blue-900/50" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                              }`}
                              onClick={() => setFilterPicNip((prev) => (prev === stat.nip ? "" : stat.nip))}
                            >
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{stat.nama}</td>
                              <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{stat.group || "-"}</td>
                              <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{stat.total}</td>
                              <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{stat.selesai}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div
                                      className={`h-full rounded-full ${
                                        stat.persentase >= 80
                                          ? "bg-green-500"
                                          : stat.persentase >= 50
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                      }`}
                                      style={{ width: `${stat.persentase}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {stat.persentase}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <Pagination page={picPage} totalPages={Math.ceil(data.picStats.length / PER_PAGE)} onChange={setPicPage} />
                    </div>
                  </div>
                )}

                {(filterStatus || filterPicNip) && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => { setFilterStatus(""); setFilterPicNip(""); }}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Reset Filter
                    </button>
                  </div>
                )}

                {filteredReports.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Daftar Pekerjaan ({filteredReports.length})
                    </h2>
                    <div className="space-y-2">
                      {filteredReports.slice((reportPage - 1) * PER_PAGE, reportPage * PER_PAGE).map((report) => (
                        <Link
                          key={report.id}
                          href={`/dashboard/reports/${report.id}`}
                          className="block rounded-lg border border-gray-200 bg-white p-3 transition hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                {report.assetNumber} — {report.deskripsi}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {report.kategori} |{" "}
                                {report.reportPICs.map((p) => p.user.nama).join(", ")}
                              </p>
                            </div>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: report.statusAkhir === "OK" || report.statusAkhir === "100%"
                                  ? "#dcfce7"
                                  : report.statusAkhir === "B.OK"
                                    ? "#fee2e2"
                                    : `hsl(${Math.round(parseInt(report.statusAkhir) * 1.2)}, 70%, 85%)`,
                                color: report.statusAkhir === "OK" || report.statusAkhir === "100%"
                                  ? "#166534"
                                  : report.statusAkhir === "B.OK"
                                    ? "#991b1b"
                                    : `hsl(${Math.round(parseInt(report.statusAkhir) * 1.2)}, 70%, 25%)`,
                              }}
                            >
                              {report.statusAkhir}
                            </span>
                          </div>
                        </Link>
                      ))}
                      <Pagination page={reportPage} totalPages={Math.ceil(filteredReports.length / PER_PAGE)} onChange={setReportPage} />
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
