"use client";

import { useState, useEffect, FormEvent } from "react";
import Pagination from "@/components/Pagination";
import ImportModal from "@/components/ImportModal";

interface Asset {
  id: number;
  assetNumber: string;
  area: string;
  createdAt: string;
}

const areaOptions = ["Material", "Building", "Curing", "FI", "Other"];

export default function AssetsPage() {
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assetNumber, setAssetNumber] = useState("");
  const [area, setArea] = useState(areaOptions[0]);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showImport, setShowImport] = useState(false);

  async function fetchAssets() {
    try {
      const res = await fetch("/api/assets");
      if (res.ok) {
        const data = await res.json();
        const sorted = [...data.assets].sort((a: Asset, b: Asset) =>
          a.assetNumber.localeCompare(b.assetNumber)
        );
        setAssets(sorted);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
    fetch("/api/auth/me").then((r) => r.ok && r.json()).then((d) => {
      if (d.user) setUserRole(d.user.role);
    });
  }, []);

  function openCreate() {
    setEditingId(null);
    setAssetNumber("");
    setArea(areaOptions[0]);
    setError("");
    setShowModal(true);
  }

  function openEdit(asset: Asset) {
    setEditingId(asset.id);
    setAssetNumber(asset.assetNumber);
    setArea(asset.area);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const url = editingId ? `/api/assets/${editingId}` : "/api/assets";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetNumber, area }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }

      setShowModal(false);
      fetchAssets();
    } catch {
      setError("Terjadi kesalahan");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus asset ini?")) return;

    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (res.ok) fetchAssets();
    } catch {
      // silent
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Memuat...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Asset Management</h1>
        <div className="flex gap-2">
          {userRole === "superadmin" && (
            <button
              onClick={() => setShowImport(true)}
              className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              Import Excel
            </button>
          )}
          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah Asset
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">ID</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Asset Number</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Area</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Belum ada asset
                </td>
              </tr>
            ) : (
              assets.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((asset) => (
                <tr key={asset.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                  <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">{asset.id}</td>
                  <td className="px-4 py-3 text-center font-bold dark:text-gray-300">{asset.assetNumber}</td>
                  <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">{asset.area}</td>
                  <td className="space-x-2 px-4 py-3 text-center dark:text-gray-300">
                    <button
                      onClick={() => openEdit(asset)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 transition hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 transition hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(assets.length / PER_PAGE)} onChange={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? "Edit Asset" : "Tambah Asset"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Asset Number
                </label>
                <input
                  type="text"
                  value={assetNumber}
                  onChange={(e) => setAssetNumber(e.target.value)}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Area
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {areaOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingId ? "Simpan" : "Tambah"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        title="Import Asset"
        endpoint="/api/assets/import"
        columns={[
          { label: "Asset Number", field: "assetNumber" },
          { label: "Area", field: "area" },
        ]}
        onResult={() => fetchAssets()}
      />
    </div>
  );
}
