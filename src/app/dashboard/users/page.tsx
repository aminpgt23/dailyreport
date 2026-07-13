"use client";

import { useState, useEffect, FormEvent } from "react";
import Pagination from "@/components/Pagination";
import ImportModal from "@/components/ImportModal";

interface User {
  id: number;
  nip: string;
  nama: string;
  role: string;
  group: string | null;
  area: string | null;
}

interface UserForm {
  nip: string;
  nama: string;
  role: string;
  group: string;
  area: string;
  password: string;
}

interface BagianItem {
  id: number;
  bagian: string;
  section: string;
}

const emptyForm: UserForm = {
  nip: "",
  nama: "",
  role: "user",
  group: "",
  area: "",
  password: "",
};

function areaToLabel(area: string, list: BagianItem[]): string {
  if (!area) return "";
  const id = Number(area);
  const item = list.find((b) => b.id === id);
  if (item) return `${item.bagian} (${item.section})`;
  const old = list.find((b) => b.bagian === area);
  if (old) return `${old.bagian} (${old.section})`;
  return area;
}

function areaToBagian(area: string, list: BagianItem[]): string {
  if (!area) return "";
  const id = Number(area);
  const item = list.find((b) => b.id === id);
  if (item) return item.bagian;
  return area;
}

function areaToSection(area: string, list: BagianItem[]): string {
  if (!area) return "";
  const id = Number(area);
  const item = list.find((b) => b.id === id);
  if (item) return item.section;
  const old = list.find((b) => b.bagian === area);
  if (old) return old.section;
  return "-";
}

export default function UsersPage() {
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [bagianList, setBagianList] = useState<BagianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showImport, setShowImport] = useState(false);
  const isAdmin = userRole === "admin";
  const isSuperAdmin = userRole === "superadmin";
  const canManageAdmin = isSuperAdmin;

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPage(1);
      }
    } catch {
      // silent
    }
  }

  async function fetchBagian() {
    try {
      const res = await fetch("/api/sections");
      if (res.ok) {
        const data = await res.json();
        const sorted = [...data.sections].sort(
          (a: BagianItem, b: BagianItem) =>
            a.section.localeCompare(b.section) || a.bagian.localeCompare(b.bagian)
        );
        setBagianList(sorted);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchBagian();
    fetch("/api/auth/me").then((r) => r.ok && r.json()).then((d) => {
      if (d.user) setUserRole(d.user.role);
    });
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditingId(user.id);
    const area = user.area || "";
    let areaValue = area;
    if (area && !bagianList.find((b) => b.id === Number(area))) {
      const matched = bagianList.find((b) => b.bagian === area);
      if (matched) areaValue = String(matched.id);
    }
    setForm({
      nip: user.nip,
      nama: user.nama,
      role: user.role,
      group: user.group || "",
      area: areaValue,
      password: "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const url = editingId ? `/api/users/${editingId}` : "/api/users";
    const method = editingId ? "PUT" : "POST";
    const body: Record<string, string> = {
      nip: form.nip,
      nama: form.nama,
      role: form.role,
      group: form.group,
      area: form.area,
    };
    if (form.password) body.password = form.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }

      setShowModal(false);
      fetchUsers();
    } catch {
      setError("Terjadi kesalahan");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus user ini?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      }
    } catch {
      // silent
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Memuat data...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kelola Akun</h1>
        <div className="flex gap-2">
          {isSuperAdmin && (
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
            + Tambah User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">NIP</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Nama</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Role</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Group</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Bagian</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Section</th>
              <th className="px-4 py-3 text-center font-bold dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Belum ada user
                </td>
              </tr>
            ) : (
              [...users].sort((a, b) => a.nama.localeCompare(b.nama)).slice((page - 1) * PER_PAGE, page * PER_PAGE).map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                  <td className="px-4 py-3 text-center font-bold dark:text-gray-300">{user.nip}</td>
                  <td className="px-4 py-3 text-center dark:text-gray-300">{user.nama}</td>
                  <td className="px-4 py-3 text-center dark:text-gray-300">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "superadmin"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                          : user.role === "admin"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                            : user.role === "reviewer"
                              ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      }`}
                    >
                      {user.role === "superadmin" ? "Super Admin" : user.role === "admin" ? "Admin" : user.role === "reviewer" ? "Reviewer" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center dark:text-gray-300">{user.group || "-"}</td>
                  <td className="px-4 py-3 text-center dark:text-gray-300">
                    {areaToBagian(user.area || "", bagianList) || "-"}
                  </td>
                  <td className="px-4 py-3 text-center dark:text-gray-300">
                    {areaToSection(user.area || "", bagianList)}
                  </td>
                   <td className="space-x-2 px-4 py-3 text-center dark:text-gray-300">
                    <button
                      onClick={() => openEdit(user)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 transition hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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
        <Pagination page={page} totalPages={Math.ceil(users.length / PER_PAGE)} onChange={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? "Edit User" : "Tambah User"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  NIP
                </label>
                <input
                  type="text"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="reviewer">Reviewer</option>
                  {canManageAdmin && <option value="admin">Admin</option>}
                  {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Group
                </label>
                <select
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value })}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Pilih Group</option>
                  <option value="Non Shift">Non Shift</option>
                  <option value="4G3S">4G3S</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bagian
                </label>
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Pilih Bagian</option>
                  {bagianList.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.bagian} ({b.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password {editingId && "(kosongkan jika tidak diganti)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required={!editingId}
                />
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
        title="Import Akun"
        endpoint="/api/users/import"
        columns={[
          { label: "NIP", field: "nip" },
          { label: "Nama", field: "nama" },
          { label: "Password", field: "password" },
          { label: "Role", field: "role" },
          { label: "Group", field: "group" },
          { label: "Bagian", field: "bagian" },
          { label: "Section", field: "section" },
        ]}
        onResult={() => fetchUsers()}
      />
    </div>
  );
}
