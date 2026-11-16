"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ASSET_BUCKET } from "@/lib/storage";

interface Settings {
  nameEn: string;
  nameTh: string;
  address: string;
  phone: string;
  taxId: string;
  branch: string;
  logoPath: string | null;
  signaturePath: string | null;
  primaryColor: string;
  docNoPattern: string;
  validityDays: number;
  deliveryDays: number;
  paymentDays: number;
  vatRate: number;
  vatInclusive: boolean;
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState<Settings>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const signInput = useRef<HTMLInputElement>(null);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function upload(file: File, folder: "logo" | "signature") {
    const supabase = createSupabaseBrowserClient();
    const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (error) {
      setMessage(`อัปโหลดไม่สำเร็จ: ${error.message}`);
      return null;
    }
    return path;
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMessage(body?.issues?.[0]?.message ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setMessage("บันทึกแล้ว");
    router.refresh();
  }

  const field = "w-full rounded border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2 rounded border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-600">ข้อมูลบริษัท</legend>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm">
            <span className="block text-slate-500">ชื่อภาษาอังกฤษ</span>
            <input className={field} value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">ชื่อภาษาไทย</span>
            <input className={field} value={form.nameTh} onChange={(e) => set("nameTh", e.target.value)} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="block text-slate-500">ที่อยู่</span>
          <textarea
            rows={2}
            className={field}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </label>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">
            <span className="block text-slate-500">โทร</span>
            <input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">เลขประจำตัวผู้เสียภาษี</span>
            <input className={field} value={form.taxId} onChange={(e) => set("taxId", e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">สาขา</span>
            <input className={field} value={form.branch} onChange={(e) => set("branch", e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-600">รูปภาพ</legend>
        <div className="flex flex-wrap gap-6">
          <label className="text-sm">
            <span className="block text-slate-500">โลโก้</span>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const path = await upload(file, "logo");
                if (path) set("logoPath", path);
              }}
            />
            {form.logoPath ? (
              <span className="mt-1 block text-xs text-slate-500">บันทึกแล้ว: {form.logoPath}</span>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">รูปลายเซ็น</span>
            <input
              ref={signInput}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const path = await upload(file, "signature");
                if (path) set("signaturePath", path);
              }}
            />
            {form.signaturePath ? (
              <span className="mt-1 block text-xs text-slate-500">บันทึกแล้ว: {form.signaturePath}</span>
            ) : null}
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-600">ค่าเริ่มต้น & เลขเอกสาร</legend>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">
            <span className="block text-slate-500">รูปแบบเลขเอกสาร</span>
            <input
              className={field}
              value={form.docNoPattern}
              onChange={(e) => set("docNoPattern", e.target.value)}
            />
            <span className="mt-1 block text-xs text-slate-500">
              {"{YY}"} ปีพ.ศ.2หลัก {"{MM}"} เดือน3หลัก {"{SEQ}"} ลำดับ3หลัก
            </span>
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">สีหลัก</span>
            <input
              type="color"
              className="h-9 w-20 rounded border border-slate-300"
              value={form.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">VAT %</span>
            <input
              type="number"
              step="any"
              className={field}
              value={form.vatRate}
              onChange={(e) => set("vatRate", Number(e.target.value))}
            />
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-sm">
            <span className="block text-slate-500">ยืนราคา (วัน)</span>
            <input
              type="number"
              className={field}
              value={form.validityDays}
              onChange={(e) => set("validityDays", Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">ส่งของ (วัน)</span>
            <input
              type="number"
              className={field}
              value={form.deliveryDays}
              onChange={(e) => set("deliveryDays", Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500">ชำระเงิน (วัน)</span>
            <input
              type="number"
              className={field}
              value={form.paymentDays}
              onChange={(e) => set("paymentDays", Number(e.target.value))}
            />
          </label>
          <label className="flex items-end gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              checked={form.vatInclusive}
              onChange={(e) => set("vatInclusive", e.target.checked)}
            />
            <span>ราคารวม VAT</span>
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          บันทึกการตั้งค่า
        </button>
        {message ? <span className="text-sm text-slate-600">{message}</span> : null}
      </div>
    </div>
  );
}
