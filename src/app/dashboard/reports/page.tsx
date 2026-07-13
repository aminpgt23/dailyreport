"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";
import Pagination from "@/components/Pagination";

interface Action {
  id: number;
  jamMulai: string;
  jamSelesai: string;
  deskripsi: string;
}

interface Report {
  id: number;
  date: string;
  kategori: string;
  assetNumber: string;
  deskripsi: string;
  statusAkhir: string;
  createdAt: string;
  noEjoWo: string | null;
  creator: { nip: string; nama: string };
  reportPICs: { user: { nip: string; nama: string } }[];
  actions: Action[];
}

interface ActionItem {
  jamMulai: string;
  jamSelesai: string;
  deskripsi: string;
}

const categories = [
  "EJO / JO",
  "Preventive Maintenance",
  "Added Schedule",
  "Improvement",
  "Administration",
  "Other",
];

function formatTime(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

function toCapitalize(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const areaOrder = ["Material", "Building", "Curing", "FI", "Other"];

function isCompleted(status: string) {
  return status === "OK" || status === "100%";
}

function generateBulkText(reports: Report[], assetAreaMap: Record<string, string>): string {
  const groupBok: Report[] = [];
  const areaGroups: Record<string, Report[]> = {};
  for (const r of reports) {
    if (isCompleted(r.statusAkhir)) {
      const area = assetAreaMap[r.assetNumber] || "Other";
      if (!areaGroups[area]) areaGroups[area] = [];
      areaGroups[area].push(r);
    } else {
      groupBok.push(r);
    }
  }

  const parts: string[] = [];

  if (groupBok.length > 0) {
    parts.push("*Job B.OK*");
    groupBok.forEach((r, i) => {
      const lines: string[] = [];
      lines.push(`${i + 1}. ${r.assetNumber} ${r.deskripsi} ${r.statusAkhir}`);
      r.actions.forEach((a) => {
        lines.push(
          `> ${a.deskripsi} (${formatTime(a.jamMulai)} - ${formatTime(a.jamSelesai)})`
        );
      });
      const picNames = r.reportPICs.map((p) => p.user.nama).join(", ");
      if (picNames) lines.push(`- by ${picNames}`);
      parts.push(lines.join("\n"));
    });
  }

  for (const area of areaOrder) {
    const group = areaGroups[area];
    if (!group || group.length === 0) continue;
    if (parts.length > 0) parts.push("");
    parts.push(`*${area}*`);
    group.forEach((r, i) => {
      const lines: string[] = [];
      lines.push(`${i + 1}. ${r.assetNumber} ${r.deskripsi} ${r.statusAkhir}`);
      r.actions.forEach((a) => {
        lines.push(
          `> ${a.deskripsi} (${formatTime(a.jamMulai)} - ${formatTime(a.jamSelesai)})`
        );
      });
      const picNames = r.reportPICs.map((p) => p.user.nama).join(", ");
      if (picNames) lines.push(`- by ${picNames}`);
      parts.push(lines.join("\n"));
    });
  }
  return parts.join("\n");
}

export default function ReportsPage() {
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [filterSection, setFilterSection] = useState("");
  const [filterBagian, setFilterBagian] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [bagianOptions, setBagianOptions] = useState<{ value: string; label: string }[]>([]);
  const [assetOptions, setAssetOptions] = useState<{ value: string; label: string }[]>([]);
  const [userRole, setUserRole] = useState("");
  const [userSection, setUserSection] = useState("");
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [fUsers, setFUsers] = useState<{ id: number; nip: string; nama: string }[]>([]);
  const [fAssets, setFAssets] = useState<{ assetNumber: string }[]>([]);
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fKategori, setFKategori] = useState(categories[0]);
  const [fNoEjoWo, setFNoEjoWo] = useState("");
  const [fAssetNumber, setFAssetNumber] = useState("");
  const [fDeskripsi, setFDeskripsi] = useState("");
  const [fStatusAkhir, setFStatusAkhir] = useState("0%");
  const [fProgress, setFProgress] = useState(0);
  const [fActions, setFActions] = useState<ActionItem[]>([
    { jamMulai: "08:00", jamSelesai: "09:00", deskripsi: "" },
  ]);
  const [fPicIds, setFPicIds] = useState<number[]>([]);
  const [fError, setFError] = useState("");
  const [fLoading, setFLoading] = useState(false);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [sRes, aRes, meRes] = await Promise.all([
          fetch("/api/sections"),
          fetch("/api/assets"),
          fetch("/api/auth/me"),
        ]);

        let sectionData: { id: number; bagian: string; section: string }[] = [];
        if (sRes.ok) {
          const sData = await sRes.json();
          sectionData = sData.sections;
          const unique = [
            ...new Set(sectionData.map((s) => s.section)),
          ] as string[];
          setSectionOptions(unique.sort());

          setBagianOptions([
            { value: "", label: "Semua" },
            ...sectionData.map((s) => ({
              value: String(s.id),
              label: `${s.bagian} (${s.section})`,
            })),
          ]);
        }
        if (aRes.ok) {
          const aData = await aRes.json();
          setAssetOptions(
            aData.assets.map((a: { assetNumber: string }) => ({
              value: a.assetNumber,
              label: a.assetNumber,
            }))
          );
        }
        if (meRes.ok) {
          const meData = await meRes.json();
          const role = meData.user?.role || "";
          setUserRole(role);

          if (role === "user" && sectionData.length > 0) {
            const userArea = meData.user?.area || "";
            let matchedBagian: (typeof sectionData)[0] | undefined;
            if (/^\d+$/.test(userArea)) {
              matchedBagian = sectionData.find((s) => String(s.id) === userArea);
            } else if (userArea.includes("||")) {
              const parts = userArea.split("||");
              matchedBagian = sectionData.find(
                (s) => s.bagian === parts[0] && s.section === parts[1]
              );
              if (!matchedBagian) {
                matchedBagian = sectionData.find((s) => s.bagian === parts[0]);
              }
            } else {
              matchedBagian = sectionData.find((s) => s.bagian === userArea);
            }
            if (matchedBagian) {
              setUserSection(matchedBagian.section);
              setFilterSection(matchedBagian.section);
            }
          }
        }
      } catch {
        // silent
      }
    }
    fetchMeta();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      if (filterSection) params.set("section", filterSection);
      if (filterBagian) params.set("bagian", filterBagian);
      if (filterAsset) params.set("assetNumber", filterAsset);

      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setPage(1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [filterDate, filterSection, filterBagian, filterAsset]);

  async function openCreate() {
    setFDate(new Date().toISOString().slice(0, 10));
    setFKategori(categories[0]);
    setFNoEjoWo("");
    setFAssetNumber("");
    setFDeskripsi("");
    setFStatusAkhir("0%");
    setFProgress(0);
    setFActions([{ jamMulai: "08:00", jamSelesai: "09:00", deskripsi: "" }]);
    setFPicIds([]);
    setFError("");
    setFLoading(false);
    setShowCreate(true);

    try {
      const [meRes, usersRes, assetsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users"),
        fetch("/api/assets"),
      ]);
      let users: { id: number; nip: string; nama: string }[] = [];
      if (usersRes.ok) {
        const data = await usersRes.json();
        users = data.users;
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user?.group === "4G3S") {
          const nsId = -1;
          if (!users.some((u) => u.id === nsId)) {
            users.push({ id: nsId, nip: "", nama: "NS" });
          }
        }
      }
      setFUsers(users.filter((u: any) => u.role !== "reviewer"));
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setFAssets(data.assets);
      }
    } catch {
      // silent
    }
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setFError("");
    setFLoading(true);

    if (fPicIds.length === 0) {
      setFError("Pilih minimal 1 PIC");
      setFLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: fDate,
          kategori: fKategori,
          noEjoWo: fNoEjoWo,
          assetNumber: fAssetNumber,
          deskripsi: fDeskripsi,
          statusAkhir: fStatusAkhir,
          actions: fActions,
          picIds: fPicIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFError(data.error || "Gagal menyimpan laporan");
        return;
      }

      setShowCreate(false);
      fetchReports();
    } catch {
      setFError("Terjadi kesalahan server");
    } finally {
      setFLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  async function handleCopyAll() {
    let assetAreaMap: Record<string, string> = {};
    try {
      const res = await fetch("/api/assets");
      if (res.ok) {
        const data = await res.json();
        for (const a of data.assets) {
          assetAreaMap[a.assetNumber] = a.area;
        }
      }
    } catch {
      // silent
    }
    await copyToClipboard(generateBulkText(reports, assetAreaMap));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExportPdf() {
    if (!filterDate) return;
    setPdfLoading(true);
    try {
      const mhRes = await fetch(`/api/manhour?start=${filterDate}&end=${filterDate}&groupBased=1`);
      const mhData = await mhRes.json();

      let manhours = mhData.manhours || [];
      if (filterBagian) {
        manhours = manhours.filter((mh: any) => mh.area === filterBagian);
      } else if (filterSection) {
        const sectionIds = bagianOptions
          .filter((b) => b.label.endsWith(`(${filterSection})`))
          .map((b) => b.value);
        manhours = manhours.filter((mh: any) => sectionIds.includes(mh.area));
      }

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      const bagianLabel = bagianOptions.find((b) => b.value === filterBagian)?.label || "All";
      const formattedDate = new Date(filterDate).toLocaleDateString("id-ID", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });

      const tableData = reports.map((r, i) => [
        String(i + 1),
        r.kategori,
        r.noEjoWo || "-",
        r.assetNumber,
        r.deskripsi,
        r.actions
          .map((a) => `${a.deskripsi} (${formatTime(a.jamMulai)}-${formatTime(a.jamSelesai)})`)
          .join("\n"),
        r.reportPICs.map((p) => p.user.nama).join(", "),
        r.statusAkhir,
      ]);

      const didDrawPage = (data: any) => {
        doc.setFontSize(7);
        doc.text(
          `Page ${data.pageNumber}`,
          doc.internal.pageSize.width - 10,
          doc.internal.pageSize.height - 8,
          { align: "right" }
        );
      };

      const headRow = (content: string, colSpan: number, opts: Record<string, any> = {}) => ({
        content,
        colSpan,
        styles: { fillColor: [255, 255, 255] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], lineColor: [255, 255, 255] as [number, number, number], ...opts },
      });

      const colHeaderStyles = { halign: "center" as const, fontStyle: "bold" as const, fontSize: 8, fillColor: [0, 0, 0] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], lineColor: [0, 0, 0] as [number, number, number] };

      autoTable(doc, {
        startY: 5,
        head: [
          [headRow("Maintenance Daily Report", 8, { halign: "center", fontStyle: "bold", fontSize: 14, textColor: [0, 0, 0] })],
          [headRow(`Dept.      :  Maintenance TBR`, 8, { halign: "left", fontSize: 10 })],
          [headRow(`Section    :  ${filterSection || "All"}`, 8, { halign: "left", fontSize: 10 })],
          [headRow(`Bagian     :  ${bagianLabel}`, 8, { halign: "left", fontSize: 10 })],
          [headRow(`Tanggal    :  ${formattedDate}`, 8, { halign: "left", fontSize: 10 })],
          [
            { content: "No.", styles: colHeaderStyles },
            { content: "Kategori", styles: colHeaderStyles },
            { content: "No. EJO/WO", styles: colHeaderStyles },
            { content: "Asset Number", styles: colHeaderStyles },
            { content: "Deskripsi Pekerjaan", styles: colHeaderStyles },
            { content: "Action Perbaikan", styles: colHeaderStyles },
            { content: "PIC", styles: colHeaderStyles },
            { content: "Status", styles: colHeaderStyles },
          ],
        ],
        body: tableData,
        showHead: "everyPage",
        headStyles: {
          fontStyle: "normal",
          halign: "left",
          fillColor: [255, 255, 255] as [number, number, number],
          textColor: [0, 0, 0] as [number, number, number],
          lineColor: [255, 255, 255] as [number, number, number],
        },
        bodyStyles: { fontSize: 7, lineColor: [0, 0, 0] as [number, number, number] },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 32 },
          2: { cellWidth: 26 },
          3: { cellWidth: 32 },
          4: { cellWidth: 50 },
          5: { cellWidth: 70 },
          6: { cellWidth: 32 },
          7: { halign: "center", cellWidth: 17 },
        },
        margin: { left: 10, right: 10 },
        didDrawPage,
      });

      let y = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Man Hour per PIC", 10, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      const picNames = new Set<string>();
      reports.forEach((r) => r.reportPICs.forEach((p) => picNames.add(p.user.nama)));

      const mhRows = manhours
        .filter((mh: any) => picNames.has(mh.nama))
        .map((mh: any) => [
          mh.nama,
          mh.totalJam,
          `${mh.persentase}%`,
        ]);

      autoTable(doc, {
        startY: y,
        head: [["Nama", "Total Jam", "Persentase"]],
        body: mhRows,
        headStyles: { halign: "center", fontStyle: "bold", fontSize: 8, fillColor: [0, 0, 0] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], lineColor: [0, 0, 0] as [number, number, number] },
        bodyStyles: { fontSize: 7, lineColor: [0, 0, 0] as [number, number, number] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: 25, halign: "center" },
        },
        margin: { left: 10, right: 10 },
        didDrawPage,
      });

      const sectionStr = filterSection || "All";
      const bagianStr = filterBagian
        ? (bagianOptions.find((b) => b.value === filterBagian)?.label || "").replace(/\s*\(.+\)$/, "")
        : "All";
      const dateStr = filterDate.replace(/-/g, "");
      doc.save(`${sectionStr}-${bagianStr}-${dateStr}.pdf`);
    } catch {
      // silent
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Laporan</h1>
        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            disabled={reports.length === 0}
            className="rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? "✅ Tercopy!" : "📋 Copy All"}
          </button>
          <button
            onClick={() => {
              const link = document.createElement("a");
              link.href = `/api/reports/export?start=${filterDate}&end=${filterDate}`;
              link.click();
            }}
            disabled={!filterDate}
            className="rounded-lg border dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading || reports.length === 0 || !filterDate}
            className="rounded-lg border dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pdfLoading ? "Memproses..." : "Export PDF"}
          </button>
          {userRole !== "reviewer" && (
            <button
              onClick={openCreate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Buat Laporan
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal <span className="text-xs text-gray-400 dark:text-gray-500">(kosongkan untuk cari semua)</span></label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
          <select
            value={filterSection}
            onChange={(e) => {
              setFilterSection(e.target.value);
              setFilterBagian("");
            }}
            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600"
            disabled={userRole === "user"}
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
            options={
              filterSection
                ? bagianOptions.filter((b) => !b.value || b.label.endsWith(`(${filterSection})`))
                : bagianOptions
            }
            value={filterBagian}
            onChange={(v) => {
              setFilterBagian(v);
              if (v) {
                const matched = bagianOptions.find((b) => b.value === v);
                if (matched) {
                  const sec = matched.label.match(/\((.+)\)$/)?.[1] || "";
                  if (userRole !== "user") setFilterSection(sec);
                }
              } else if (userRole === "user" && userSection) {
                setFilterSection(userSection);
              }
            }}
            placeholder="Cari Bagian..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Number</label>
          <SearchableSelect
            options={assetOptions}
            value={filterAsset}
            onChange={setFilterAsset}
            placeholder="Cari Asset Number..."
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Memuat...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          Belum ada laporan untuk filter ini
        </div>
      ) : (
        <div className="space-y-3">
          {reports.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((report) => (
            <Link
              key={report.id}
              href={`/dashboard/reports/${report.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {report.assetNumber} — {report.deskripsi}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {report.kategori} | {report.creator.nama}
                  </p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    PIC: {report.reportPICs.map((p) => p.user.nama).join(", ")}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
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
          <Pagination page={page} totalPages={Math.ceil(reports.length / PER_PAGE)} onChange={setPage} />
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 dark:bg-black/60 px-4 py-8">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Buat Laporan</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kategori Pekerjaan
                  </label>
                  <select
                    value={fKategori}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFKategori(v);
                      if (v === "Other" || v === "Administration") {
                        setFAssetNumber("-");
                      }
                      if (v !== "EJO / JO") {
                        setFNoEjoWo("-");
                      }
                    }}
                    className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    No. EJO / JO
                  </label>
                  <input
                    type="text"
                    value={fNoEjoWo}
                    onChange={(e) => setFNoEjoWo(e.target.value.toUpperCase())}
                    disabled={fKategori !== "EJO / JO"}
                    className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase dark:border-gray-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Asset Number
                  </label>
                  {fKategori === "Other" || fKategori === "Administration" ? (
                    <input
                      type="text"
                      value="-"
                      disabled
                      className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
                    />
                  ) : (
                    <SearchableSelect
                      options={fAssets.map((a) => ({ value: a.assetNumber, label: a.assetNumber }))}
                      value={fAssetNumber}
                      onChange={setFAssetNumber}
                      placeholder="Cari asset number..."
                      required
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deskripsi Pekerjaan
                </label>
                <textarea
                  value={fDeskripsi}
                  onChange={(e) => setFDeskripsi(toCapitalize(e.target.value))}
                  rows={3}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600"
                  required
                />
              </div>
              
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Action Perbaikan
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFActions([...fActions, { jamMulai: "08:00", jamSelesai: "09:00", deskripsi: "" }])
                    }
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    + Tambah Action
                  </button>
                </div>
                <div className="space-y-3">
                  {fActions.map((action, index) => (
                    <div key={index} className="rounded-lg border bg-gray-50 dark:bg-gray-900 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Action #{index + 1}
                        </span>
                        {fActions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFActions(fActions.filter((_, i) => i !== index))}
                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Jam Mulai</label>
                          <input
                            type="time"
                            value={action.jamMulai}
                            onChange={(e) => {
                              const updated = [...fActions];
                              updated[index] = { ...updated[index], jamMulai: e.target.value };
                              setFActions(updated);
                            }}
                            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Jam Selesai</label>
                          <input
                            type="time"
                            value={action.jamSelesai}
                            onChange={(e) => {
                              const updated = [...fActions];
                              updated[index] = { ...updated[index], jamSelesai: e.target.value };
                              setFActions(updated);
                            }}
                            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Deskripsi</label>
                          <input
                            type="text"
                            value={action.deskripsi}
                            onChange={(e) => {
                              const updated = [...fActions];
                              updated[index] = { ...updated[index], deskripsi: toSentenceCase(e.target.value) };
                              setFActions(updated);
                            }}
                            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                            placeholder="Deskripsi action"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  PIC (Person In Charge)
                </label>
                <SearchableSelect
                  multi
                  options={fUsers.map((u) => ({ value: String(u.id), label: `${u.nama} (${u.nip})` }))}
                  value={fPicIds.join(",")}
                  onChange={(v) => setFPicIds(v ? v.split(",").map(Number) : [])}
                  placeholder="Cari PIC..."
                />
                {fUsers.length === 0 && (
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    Tidak ada user tersedia. Tambah user di menu Kelola Akun.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status Akhir
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFStatusAkhir("OK")}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      fStatusAkhir === "OK"
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200"
                        : "border-gray-300 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    }`}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setFStatusAkhir("B.OK")}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      fStatusAkhir === "B.OK"
                        ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                        : "border-gray-300 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    }`}
                  >
                    B.OK
                  </button>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg border px-3 py-1.5 text-sm cursor-default ${
                        fStatusAkhir.endsWith("%")
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          : "border-gray-300 text-gray-600 dark:text-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {fStatusAkhir.endsWith("%") ? fStatusAkhir : "0%"}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fStatusAkhir.endsWith("%") ? parseInt(fStatusAkhir) : fProgress}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFProgress(Number(v));
                        setFStatusAkhir(v + "%");
                      }}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>

              {fError && <p className="text-sm text-red-600 dark:text-red-400">{fError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={fLoading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fLoading ? "Menyimpan..." : "Simpan Laporan"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
