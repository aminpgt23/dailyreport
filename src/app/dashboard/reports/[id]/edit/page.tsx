"use client";

import { useState, useEffect, FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";

interface User {
  id: number;
  nip: string;
  nama: string;
}

function toCapitalize(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

interface ActionItem {
  jamMulai: string;
  jamSelesai: string;
  deskripsi: string;
}

const categories = [
  "EJO / WO",
  "Preventive Maintenance",
  "Added Schedule",
  "Improvement",
  "Administration",
  "Other",
];

function toTimeStr(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

export default function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<{ assetNumber: string }[]>([]);
  const [date, setDate] = useState("");
  const [kategori, setKategori] = useState(categories[0]);
  const [noEjoWo, setNoEjoWo] = useState("");
  const [assetNumber, setAssetNumber] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [statusAkhir, setStatusAkhir] = useState("0%");
  const [progress, setProgress] = useState(0);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [picIds, setPicIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, usersRes, assetsRes, reportRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/users"),
          fetch("/api/assets"),
          fetch(`/api/reports/${id}`),
        ]);

        let mergedUsers: { id: number; nip: string; nama: string }[] = [];
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          mergedUsers = usersData.users.filter((u: any) => u.role !== "reviewer");
        }
        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          setAssets(assetsData.assets);
        }

        if (reportRes.ok) {
          const reportData = await reportRes.json();
          const r = reportData.report;
          setDate(r.date.slice(0, 10));
          setKategori(r.kategori);
          setNoEjoWo(r.noEjoWo || "");
          setAssetNumber(r.assetNumber);
          setDeskripsi(r.deskripsi);
          setStatusAkhir(r.statusAkhir);
          if (r.statusAkhir.endsWith("%")) {
            setProgress(parseInt(r.statusAkhir));
          }
          setActions(
            r.actions.map((a: ActionItem & { jamMulai: string; jamSelesai: string }) => ({
              jamMulai: toTimeStr(a.jamMulai),
              jamSelesai: toTimeStr(a.jamSelesai),
              deskripsi: a.deskripsi,
            }))
          );
          setPicIds(r.reportPICs.map((p: { user: { id: number } }) => p.user.id));
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.user?.group === "4G3S") {
              for (const pic of r.reportPICs) {
                if (
                  pic.user.nama === "NS" &&
                  !mergedUsers.some((u: { id: number }) => u.id === pic.user.id)
                ) {
                  mergedUsers.push({ id: pic.user.id, nip: pic.user.nip, nama: "NS" });
                }
              }
              if (!mergedUsers.some((u: { id: number }) => u.id === -1)) {
                mergedUsers.push({ id: -1, nip: "", nama: "NS" });
              }
            }
          }
        }
        setUsers(mergedUsers);
      } catch {
        setError("Gagal memuat data");
      } finally {
        setInitialLoading(false);
      }
    }
    fetchData();
  }, [id]);

  function addAction() {
    setActions([...actions, { jamMulai: "08:00", jamSelesai: "09:00", deskripsi: "" }]);
  }

  function removeAction(index: number) {
    setActions(actions.filter((_, i) => i !== index));
  }

  function updateAction(index: number, field: keyof ActionItem, value: string) {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (picIds.length === 0) {
      setError("Pilih minimal 1 PIC");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          kategori,
          noEjoWo,
          assetNumber,
          deskripsi,
          statusAkhir,
          actions,
          picIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal menyimpan laporan");
        return;
      }

      router.push(`/dashboard/reports/${id}`);
    } catch {
      setError("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return <p className="text-gray-500 dark:text-gray-400">Memuat data...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Laporan</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Kategori Pekerjaan</label>
            <select
              value={kategori}
              onChange={(e) => {
                const v = e.target.value;
                setKategori(v);
                if (v === "Other" || v === "Administration") {
                  setAssetNumber("-");
                }
                if (v !== "EJO / JO") {
                  setNoEjoWo("-");
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
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">No. EJO / JO</label>
            <input
              type="text"
              value={noEjoWo}
              onChange={(e) => setNoEjoWo(e.target.value.toUpperCase())}
              disabled={kategori !== "EJO / JO"}
              className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase dark:border-gray-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Number</label>
            {kategori === "Other" || kategori === "Administration" ? (
              <input
                type="text"
                value="-"
                disabled
                className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
              />
            ) : (
              <SearchableSelect
                options={assets.map((a) => ({ value: a.assetNumber, label: a.assetNumber }))}
                value={assetNumber}
                onChange={setAssetNumber}
                placeholder="Cari asset number..."
                required
              />
            )}
          </div>
        </div>

        <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi Pekerjaan</label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(toCapitalize(e.target.value))}
            rows={3}
            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600"
            required
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Action Perbaikan</label>
            <button
              type="button"
              onClick={addAction}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              + Tambah Action
            </button>
          </div>
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div key={index} className="rounded-lg border bg-gray-50 dark:bg-gray-900 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Action #{index + 1}</span>
                  {actions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAction(index)}
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
                      onChange={(e) => updateAction(index, "jamMulai", e.target.value)}
                      className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Jam Selesai</label>
                    <input
                      type="time"
                      value={action.jamSelesai}
                      onChange={(e) => updateAction(index, "jamSelesai", e.target.value)}
                      className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Deskripsi</label>
                    <input
                      type="text"
                      value={action.deskripsi}
                      onChange={(e) => updateAction(index, "deskripsi", toSentenceCase(e.target.value))}
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
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">PIC (Person In Charge)</label>
          <SearchableSelect
            multi
            options={users.map((u) => ({ value: String(u.id), label: `${u.nama} (${u.nip})` }))}
            value={picIds.join(",")}
            onChange={(v) => setPicIds(v ? v.split(",").map(Number) : [])}
            placeholder="Cari PIC..."
          />
          {users.length === 0 && (
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Tidak ada user tersedia. Tambah user di menu Kelola Akun.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status Akhir</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusAkhir("OK")}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                statusAkhir === "OK"
                  ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200"
                  : "border-gray-300 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              }`}
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setStatusAkhir("B.OK")}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                statusAkhir === "B.OK"
                  ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                  : "border-gray-300 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              }`}
            >
              B.OK
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-lg border px-3 py-1.5 text-sm cursor-default ${
                  statusAkhir.endsWith("%")
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    : "border-gray-300 text-gray-600 dark:text-gray-300 dark:border-gray-600"
                }`}
              >
                {statusAkhir.endsWith("%") ? statusAkhir : "0%"}
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={statusAkhir.endsWith("%") ? parseInt(statusAkhir) : progress}
                onChange={(e) => {
                  const v = e.target.value;
                  setProgress(Number(v));
                  setStatusAkhir(v + "%");
                }}
                className="w-24"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Yakin ingin menghapus laporan ini?")) return;
              try {
                const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
                if (res.ok) router.push("/dashboard/reports");
              } catch {
                // silent
              }
            }}
            className="rounded-lg border border-red-300 dark:border-red-800 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
          >
            Hapus
          </button>
        </div>
      </form>
    </div>
  );
}
