"use client";

import { useState, useEffect } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import Pagination from "@/components/Pagination";

interface MachineReport {
  id: number;
  tanggal: string;
  assetNumber: string;
  deskripsi: string;
  kategori: string;
  pelapor: string;
  status: string;
  actionPerbaikan: string | null;
  pelaksana: string | null;
  tanggalPelaksanaan: string | null;
  area: string;
  user: { id: number; nip: string; nama: string };
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthStart(m: string): string {
  return `${m}-01`;
}

function monthEnd(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return `${m}-${String(last).padStart(2, "0")}`;
}

function toCapitalize(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function MachinePage() {
  const PER_PAGE = 10;
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterArea, setFilterArea] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [data, setData] = useState<MachineReport[]>([]);
  const [totalData, setTotalData] = useState(0);
  const [totalOK, setTotalOK] = useState(0);
  const [totalBOK, setTotalBOK] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [assetOptions, setAssetOptions] = useState<{ value: string; label: string }[]>([]);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [currentUser, setCurrentUser] = useState({ nama: "" });
  const [userRole, setUserRole] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MachineReport | null>(null);

  const [formTanggal, setFormTanggal] = useState(todayStr);
  const [formAsset, setFormAsset] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formKategori, setFormKategori] = useState("Normal");
  const [formPelapor, setFormPelapor] = useState("");
  const [formArea, setFormArea] = useState("");

  const [editStatus, setEditStatus] = useState("B.OK");
  const [editAction, setEditAction] = useState("");
  const [editPelaksana, setEditPelaksana] = useState("");
  const [editTanggal, setEditTanggal] = useState("");

  const [saving, setSaving] = useState(false);

  const isReviewer = userRole === "reviewer";

  const displayedData = filterStatus ? data.filter((item) => item.status === filterStatus) : data;

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: monthStart(filterMonth),
        endDate: monthEnd(filterMonth),
        page: String(page),
        perPage: String(PER_PAGE),
      });
      if (filterArea) params.set("area", filterArea);
      if (filterAsset) params.set("assetNumber", filterAsset);
      const res = await fetch(`/api/machine?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result.reports);
        setTotalData(result.stats.total);
        setTotalOK(result.stats.totalOK);
        setTotalBOK(result.stats.totalBOK);
        setTotalPages(result.pagination.totalPages);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterArea, filterAsset, page]);

  useEffect(() => {
    async function fetchMeta() {
      const [assetsRes, usersRes, meRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/users"),
        fetch("/api/auth/me"),
      ]);
      if (assetsRes.ok) {
        const assets = await assetsRes.json();
        const items = Array.isArray(assets) ? assets : assets.assets || [];
        setAssetOptions(items.map((a: any) => ({ value: a.assetNumber, label: `${a.assetNumber} (${a.area})` })));
        const areas = [...new Set<string>(items.map((a: any) => a.area).filter(Boolean))].sort();
        setAreaOptions(areas);
      }
      if (usersRes.ok) {
        const users = await usersRes.json();
        const userList = users.users || users;
        setUserOptions(userList
          .filter((u: any) => userRole === "superadmin" || u.role === "user" || u.role === "admin")
          .map((u: any) => ({ value: u.nama, label: `${u.nama} (${u.nip})` }))
        );
      }
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUser(me.user);
        setUserRole(me.user?.role || "");
        setFormPelapor(me.user?.nama || "");
      }
    }
    fetchMeta();
  }, []);

  function resetCreateForm() {
    setFormTanggal(todayStr());
    setFormAsset("");
    setFormDeskripsi("");
    setFormKategori("Normal");
    setFormPelapor(currentUser.nama || "");
    setFormArea("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/machine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: formTanggal,
          assetNumber: formAsset,
          deskripsi: formDeskripsi,
          kategori: formKategori,
          pelapor: formPelapor,
          area: formArea,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        resetCreateForm();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan");
      }
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(item: MachineReport) {
    setEditing(item);
    setEditStatus(item.status);
    setEditAction(item.actionPerbaikan || "");
    setEditPelaksana(item.pelaksana || "");
    setEditTanggal(item.tanggalPelaksanaan ? item.tanggalPelaksanaan.split("T")[0] : "");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (editTanggal && editTanggal < editing.tanggal.split("T")[0]) {
      alert("Tanggal pelaksanaan tidak boleh lebih kecil dari tanggal temuan");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/machine/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          actionPerbaikan: editAction || null,
          pelaksana: editPelaksana || null,
          tanggalPelaksanaan: editTanggal || null,
        }),
      });
      if (res.ok) {
        setEditing(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengupdate");
      }
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin hapus data ini?")) return;
    try {
      const res = await fetch(`/api/machine/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch {
      alert("Gagal menghapus");
    }
  }

  function toggleStatus(status: string) {
    setFilterStatus((prev) => (prev === status ? "" : status));
    setPage(1);
  }

  function handleExportExcel() {
    const params = new URLSearchParams({
      startDate: monthStart(filterMonth),
      endDate: monthEnd(filterMonth),
    });
    if (filterArea) params.set("area", filterArea);
    if (filterAsset) params.set("assetNumber", filterAsset);
    if (filterStatus) params.set("status", filterStatus);
    window.open(`/api/machine/export?${params}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Machine</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bulan</label>
            <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Area</label>
            <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
          >
            <option value="">Semua</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Number</label>
          <SearchableSelect
            options={[{ value: "", label: "Semua" }, ...assetOptions]}
            value={filterAsset}
            onChange={(v) => {
              setFilterAsset(v);
              if (v) {
                const matched = assetOptions.find((a) => a.value === v);
                if (matched) {
                  const area = matched.label.match(/\((.+)\)$/)?.[1] || "";
                  setFilterArea(area);
                }
              } else {
                setFilterArea("");
              }
            }}
            placeholder="Cari Asset..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Temuan</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{totalData}</p>
        </div>
        <button
          onClick={() => toggleStatus("OK")}
          className={`rounded-xl border p-5 text-left shadow-sm transition ${
            filterStatus === "OK" ? "border-green-500 ring-2 ring-green-200" : "bg-white dark:bg-gray-800"
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Status OK</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">{totalOK}</p>
        </button>
        <button
          onClick={() => toggleStatus("B.OK")}
          className={`rounded-xl border p-5 text-left shadow-sm transition ${
            filterStatus === "B.OK" ? "border-red-500 ring-2 ring-red-200" : "bg-white dark:bg-gray-800"
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Status B.OK</p>
          <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">{totalBOK}</p>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{displayedData.length} data</p>
        <div className="flex items-center gap-2">
          {filterStatus && (
            <button
              onClick={() => { setFilterStatus(""); setPage(1); }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Export Excel
          </button>
          {!isReviewer && (
            <button
              onClick={() => { resetCreateForm(); setShowCreate(true); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Tambah Temuan
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Memuat...</p>
      ) : displayedData.length === 0 ? (
        <div className="rounded-xl border bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          Tidak ada data
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800 text-center font-bold">
              <tr>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">No</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Tanggal</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Asset Number</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Deskripsi</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Kategori</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Pelapor</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Action Perbaikan</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Pelaksana</th>
                <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Tgl Pelaksanaan</th>
                {!isReviewer && <th className="px-3 py-2 text-gray-900 dark:text-gray-100">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {displayedData.map((item, index) => (
                <tr key={item.id} className="border-b dark:border-gray-700 text-center hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{formatDDMMYYYY(item.tanggal)}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.assetNumber}</td>
                  <td className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">{item.deskripsi}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.kategori === "High" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" :
                      item.kategori === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200" :
                      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                    }`}>
                      {item.kategori}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.pelapor}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === "OK" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.actionPerbaikan || "-"}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.pelaksana || "-"}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                    {item.tanggalPelaksanaan ? formatDDMMYYYY(item.tanggalPelaksanaan) : "-"}
                  </td>
                  {!isReviewer && (
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          title="Update"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50"
                          title="Hapus"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Tambah Temuan</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Number</label>
                <SearchableSelect
                  options={assetOptions}
                  value={formAsset}
                  onChange={(v) => {
                    setFormAsset(v);
                    const matched = assetOptions.find((a) => a.value === v);
                    if (matched) {
                      const area = matched.label.match(/\((.+)\)$/)?.[1] || "";
                      setFormArea(area);
                    }
                  }}
                  placeholder="Cari Asset..."
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi Temuan Abnormal</label>
                <textarea
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(toCapitalize(e.target.value))}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Kategori Temuan</label>
                <select
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value)}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                >
                  <option value="Normal">Normal</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pelapor</label>
                <input
                  type="text"
                  value={formPelapor}
                  onChange={(e) => setFormPelapor(toCapitalize(e.target.value))}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                  required
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Update Temuan</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label>
                <input
                  type="date"
                  value={editing.tanggal.split("T")[0]}
                  className="w-full rounded-lg border bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-500"
                  disabled
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Number</label>
                <input
                  type="text"
                  value={editing.assetNumber}
                  className="w-full rounded-lg border bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-500"
                  disabled
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi Temuan Abnormal</label>
                <textarea
                  value={editing.deskripsi}
                  className="w-full rounded-lg border bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-500"
                  rows={3}
                  disabled
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Kategori Temuan</label>
                <input
                  type="text"
                  value={editing.kategori}
                  className="w-full rounded-lg border bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-500"
                  disabled
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pelapor</label>
                <input
                  type="text"
                  value={editing.pelapor}
                  className="w-full rounded-lg border bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-500"
                  disabled
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                >
                  <option value="B.OK">B.OK</option>
                  <option value="OK">OK</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Action Perbaikan</label>
                <textarea
                  value={editAction}
                  onChange={(e) => setEditAction(toSentenceCase(e.target.value))}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pelaksana</label>
                <SearchableSelect
                  options={userOptions}
                  value={editPelaksana}
                  onChange={setEditPelaksana}
                  placeholder="Cari Pelaksana..."
                  multi
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  min={editing.tanggal.split("T")[0]}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
