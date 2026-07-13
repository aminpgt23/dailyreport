"use client";

import { useState, useEffect, FormEvent } from "react";
import Pagination from "@/components/Pagination";

interface Section {
  id: number;
  bagian: string;
  section: string;
}

const sectionOptions = [
  "Material",
  "Building / GM",
  "Curing",
  "FI",
  "Workshop",
  "Administration",
  "4G3S",
];

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [bagian, setBagian] = useState("");
  const [section, setSection] = useState(sectionOptions[0]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  async function fetchSections() {
    try {
      const res = await fetch("/api/sections");
      if (res.ok) {
        const data = await res.json();
        const sorted = [...data.sections].sort((a: Section, b: Section) =>
          a.section.localeCompare(b.section) || a.bagian.localeCompare(b.bagian)
        );
        setSections(sorted);
        setPage(1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSections();
  }, []);

  function openCreate() {
    setEditingId(null);
    setBagian("");
    setSection(sectionOptions[0]);
    setError("");
    setShowModal(true);
  }

  function openEdit(sec: Section) {
    setEditingId(sec.id);
    setBagian(sec.bagian);
    setSection(sec.section);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const url = editingId ? `/api/sections/${editingId}` : "/api/sections";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bagian, section }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }

      setShowModal(false);
      fetchSections();
    } catch {
      setError("Terjadi kesalahan");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus bagian ini?")) return;

    try {
      const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
      if (res.ok) fetchSections();
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Section Management</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Bagian
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">ID</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">Bagian</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">Section</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sections.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Belum ada data section
                </td>
              </tr>
            ) : (
              sections.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((sec) => (
                <tr key={sec.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">{sec.id}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">{sec.bagian}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{sec.section}</td>
                  <td className="space-x-2 px-4 py-3 text-center">
                    <button
                      onClick={() => openEdit(sec)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sec.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
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
        <Pagination page={page} totalPages={Math.ceil(sections.length / PER_PAGE)} onChange={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? "Edit Bagian" : "Tambah Bagian"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bagian
                </label>
                <input
                  type="text"
                  value={bagian}
                  onChange={(e) => setBagian(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  {sectionOptions.map((opt) => (
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
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
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
