"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";

interface Column {
  label: string;
  field: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;
  columns: Column[];
  onResult?: (result: { success: number; skipped: number; errors: { baris: number; pesan: string }[] }) => void;
}

export default function ImportModal({ show, onClose, title, endpoint, columns, onResult }: Props) {
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number; errors: { baris: number; pesan: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      const headerMap: Record<string, string> = {};
      for (const col of columns) {
        const key = Object.keys(json[0] || {}).find(
          (k) => k.toLowerCase().replace(/\s/g, "") === col.label.toLowerCase().replace(/\s/g, "")
        );
        if (key) headerMap[key] = col.field;
      }

      const mapped = json.map((row) => {
        const mappedRow: Record<string, string> = {};
        for (const key of Object.keys(row)) {
          const field = headerMap[key];
          if (field) mappedRow[field] = String(row[key] ?? "");
        }
        return mappedRow;
      });

      setRows(mapped);
      setPreview(mapped.slice(0, 5));
      setResult(null);
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult(data);
      onResult?.(data);
    } catch {
      setResult({ success: 0, skipped: 0, errors: [{ baris: 0, pesan: "Gagal terhubung ke server" }] });
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setPreview(null);
    setRows([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>

        {!result ? (
          <>
            {!preview ? (
              <div>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Pilih file Excel (.xlsx) dengan kolom: {columns.map((c) => c.label).join(", ")}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFile}
                  className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  {rows.length} data ditemukan. Preview 5 baris pertama:
                </p>
                <div className="mb-4 overflow-x-auto rounded-lg border dark:border-gray-700">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <tr>
                        {columns.map((col) => (
                          <th key={col.field} className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                          {columns.map((col) => (
                            <td key={col.field} className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {row[col.field] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {importing ? "Mengimport..." : `Import ${rows.length} Data`}
                  </button>
                  <button
                    onClick={() => { setPreview(null); setRows([]); if (fileRef.current) fileRef.current.value = ""; }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Ganti File
                  </button>
                  <button
                    onClick={handleClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-green-600 dark:text-green-400">✅ Berhasil: {result.success}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">⏭️ Dilewati (duplikat): {result.skipped}</p>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">❌ Gagal: {result.errors.length}</p>
                  <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-red-500 dark:text-red-400">
                    {result.errors.map((e, i) => (
                      <li key={i}>Baris {e.baris}: {e.pesan}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
