"use client";

import { useCallback, useEffect, useState } from "react";

export interface Customer {
  id: number;
  name: string;
  nameEn: string | null;
  address: string;
  taxId: string | null;
  branch: string | null;
}

interface FormState {
  name: string;
  nameEn: string;
  address: string;
  taxId: string;
  branch: string;
}

const EMPTY: FormState = { name: "", nameEn: "", address: "", taxId: "", branch: "" };

export function CustomerManager() {
  const [items, setItems] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null); // null = ปิด, 0 = เพิ่มใหม่
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      setItems((await res.json()) as Customer[]);
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  function startNew() {
    setEditingId(0);
    setForm(EMPTY);
    setError(null);
  }

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      nameEn: c.nameEn ?? "",
      address: c.address ?? "",
      taxId: c.taxId ?? "",
      branch: c.branch ?? "",
    });
    setError(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("ต้องระบุชื่อลูกค้า");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || null,
        address: form.address.trim(),
        taxId: form.taxId.trim() || null,
        branch: form.branch.trim() || null,
      });
      const res = await fetch(
        editingId === 0 ? "/api/customers" : `/api/customers/${editingId}`,
        {
          method: editingId === 0 ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.issues?.[0]?.message ?? "บันทึกไม่สำเร็จ");
      }
      setEditingId(null);
      setForm(EMPTY);
      await load(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Customer) {
    if (!confirm(`ลบลูกค้า "${c.name}" ?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? "ลบไม่สำเร็จ");
      }
      if (editingId === c.id) setEditingId(null);
      await load(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  const field = "w-full rounded border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาลูกค้า"
          className="w-64 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-slate-500">{items.length} รายการ</span>
        <button
          type="button"
          onClick={startNew}
          className="ml-auto h-9 rounded bg-slate-900 px-3 text-sm font-semibold text-white"
        >
          + เพิ่มลูกค้า
        </button>
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {editingId !== null ? (
        <div className="rounded border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {editingId === 0 ? "เพิ่มลูกค้าใหม่" : "แก้ไขลูกค้า"}
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">
              <span className="block text-slate-500">ชื่อลูกค้า / Customer</span>
              <input
                autoFocus
                className={field}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500">ชื่อภาษาอังกฤษ</span>
              <input
                className={field}
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block text-slate-500">ที่อยู่ / Address</span>
              <textarea
                rows={2}
                className={field}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500">เลขประจำตัวผู้เสียภาษี</span>
              <input
                className={field}
                value={form.taxId}
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500">สาขา</span>
              <input
                className={field}
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-9 rounded bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="h-9 rounded border border-slate-300 px-3 text-sm"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="w-12 px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">ชื่อลูกค้า</th>
              <th className="px-3 py-2 font-semibold">ที่อยู่</th>
              <th className="w-40 px-3 py-2 font-semibold">เลขผู้เสียภาษี</th>
              <th className="w-28 px-3 py-2 font-semibold">สาขา</th>
              <th className="w-32 px-3 py-2 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  กำลังโหลด...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  ไม่พบลูกค้า
                </td>
              </tr>
            ) : (
              items.map((c, i) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div>{c.name}</div>
                    {c.nameEn ? (
                      <div className="text-xs text-slate-500">{c.nameEn}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{c.address || "-"}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{c.taxId || "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{c.branch || "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="mr-2 text-sm text-sky-700 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
