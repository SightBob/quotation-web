"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBaht, toSatang } from "@/lib/money";

export interface Product {
  id: number;
  description: string;
  unit: string | null;
  unitPrice: number;
}

interface FormState {
  description: string;
  unit: string;
  unitPrice: string;
}

const EMPTY: FormState = { description: "", unit: "", unitPrice: "" };

export function ProductManager() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null); // null = ปิดฟอร์ม, 0 = เพิ่มใหม่
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      setItems((await res.json()) as Product[]);
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  function startNew() {
    setEditingId(0);
    setForm(EMPTY);
    setError(null);
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      description: p.description,
      unit: p.unit ?? "",
      unitPrice: (p.unitPrice / 100).toFixed(2),
    });
    setError(null);
  }

  async function save() {
    if (!form.description.trim()) {
      setError("ต้องระบุรายการ");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({
        description: form.description.trim(),
        unit: form.unit.trim() || null,
        unitPrice: toSatang(form.unitPrice),
      });
      const res = await fetch(
        editingId === 0 ? "/api/products" : `/api/products/${editingId}`,
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

  async function remove(p: Product) {
    if (!confirm(`ลบ "${p.description}" ?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      if (editingId === p.id) setEditingId(null);
      await load(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    }
  }

  const field = "w-full rounded border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหารายการสินค้า"
          className="w-64 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-slate-500">{items.length} รายการ</span>
        <button
          type="button"
          onClick={startNew}
          className="ml-auto h-9 rounded bg-slate-900 px-3 text-sm font-semibold text-white"
        >
          + เพิ่มสินค้า
        </button>
      </div>

      {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {/* add / edit form */}
      {editingId !== null ? (
        <div className="rounded border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {editingId === 0 ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}
          </h2>
          <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
            <label className="text-sm">
              <span className="block text-slate-500">รายการ / Description</span>
              <input
                autoFocus
                className={field}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500">หน่วย</span>
              <input
                className={field}
                placeholder="ชิ้น"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500">ราคาต่อหน่วย (บาท)</span>
              <input
                className={`${field} text-right`}
                inputMode="decimal"
                placeholder="0.00"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </label>
            <div className="flex items-end gap-2">
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
        </div>
      ) : null}

      {/* table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="w-12 px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">รายการ</th>
              <th className="w-24 px-3 py-2 font-semibold">หน่วย</th>
              <th className="w-36 px-3 py-2 text-right font-semibold">ราคาต่อหน่วย</th>
              <th className="w-32 px-3 py-2 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  กำลังโหลด...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  ไม่พบรายการสินค้า
                </td>
              </tr>
            ) : (
              items.map((p, i) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2">{p.description}</td>
                  <td className="px-3 py-2 text-slate-600">{p.unit ?? "-"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatBaht(p.unitPrice)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="mr-2 text-sm text-sky-700 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
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
