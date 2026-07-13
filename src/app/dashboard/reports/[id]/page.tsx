"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Action {
  id: number;
  jamMulai: string;
  jamSelesai: string;
  deskripsi: string;
}

interface PIC {
  id: number;
  user: { id: number; nip: string; nama: string };
}

interface Report {
  id: number;
  date: string;
  kategori: string;
  noEjoWo: string | null;
  assetNumber: string;
  deskripsi: string;
  statusAkhir: string;
  createdAt: string;
  creator: { nip: string; nama: string };
  actions: Action[];
  reportPICs: PIC[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function generateClipboardText(report: Report): string {
  const lines: string[] = [];
  lines.push(`${report.assetNumber} ${report.deskripsi} ${report.statusAkhir}`);
  report.actions.forEach((a) => {
    lines.push(`> ${a.deskripsi} (${formatTime(a.jamMulai)} - ${formatTime(a.jamSelesai)})`);
  });
  const picNames = report.reportPICs.map((p) => p.user.nama).join(", ");
  if (picNames) lines.push(`- by ${picNames}`);
  return lines.join("\n");
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [rRes, meRes] = await Promise.all([
          fetch(`/api/reports/${id}`),
          fetch("/api/auth/me"),
        ]);
        if (rRes.ok) {
          const rData = await rRes.json();
          setReport(rData.report);
        }
        if (meRes.ok) {
          const meData = await meRes.json();
          setUserRole(meData.user?.role || "");
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

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

  async function handleCopy() {
    if (!report) return;
    await copyToClipboard(generateClipboardText(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Memuat...</p>;
  }

  if (!report) {
    return (
      <div className="rounded-xl border bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
        Laporan tidak ditemukan
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
        <div className="flex gap-2">
          {userRole !== "reviewer" && (
            <>
              <Link
                href={`/dashboard/reports/${report.id}/edit`}
                className="rounded-lg border dark:border-gray-600 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Edit
              </Link>
              <button
                onClick={async () => {
                  if (!confirm("Yakin ingin menghapus laporan ini?")) return;
                  try {
                    const res = await fetch(`/api/reports/${report.id}`, {
                      method: "DELETE",
                    });
                    if (res.ok) router.push("/dashboard/reports");
                  } catch {
                    // silent
                  }
                }}
                className="rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
              >
                Hapus
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{report.assetNumber}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(report.date)}
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
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

        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Kategori:</span>{" "}
            <span className="text-gray-900 dark:text-gray-100">{report.kategori}</span>
          </div>
          {report.noEjoWo && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">No EJO/WO:</span>{" "}
              <span className="text-gray-900 dark:text-gray-100">{report.noEjoWo}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500 dark:text-gray-400">Pelapor:</span>{" "}
            <span className="text-gray-900 dark:text-gray-100">{report.creator.nama}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">PIC:</span>{" "}
            <span className="text-gray-900 dark:text-gray-100">
              {report.reportPICs.map((p) => p.user.nama).join(", ")}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Deskripsi</h3>
          <p className="text-sm text-gray-900 dark:text-gray-100">{report.deskripsi}</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Action Perbaikan
          </h3>
          <div className="space-y-2">
            {report.actions.map((action, i) => (
              <div
                key={action.id}
                className="rounded-lg border bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <span className="font-medium text-gray-500 dark:text-gray-400">#{i + 1}</span>{" "}
                <span className="text-gray-900 dark:text-gray-100">{action.deskripsi}</span>{" "}
                <span className="text-gray-400 dark:text-gray-500">
                  ({formatTime(action.jamMulai)} -{" "}
                  {formatTime(action.jamSelesai)})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="w-full rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50"
      >
        {copied ? "✅ Tercopy!" : "📋 Copy to Clipboard"}
      </button>

      <div className="rounded-xl border bg-gray-50 dark:bg-gray-900 p-4">
        <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Preview Format:</p>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
          {generateClipboardText(report)}
        </pre>
      </div>
    </div>
  );
}
