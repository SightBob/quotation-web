"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemsEditor } from "@/components/form/ItemsEditor";
import { collectErrors, formSchema, newItem, toDoc, type FormItem, type FormState } from "@/lib/form";
import { sampleCompany } from "@/lib/sample-data";
import { PreviewPane } from "@/components/form/PreviewPane";
import { ThaiDateInput } from "@/components/form/ThaiDateInput";
import { toSatang } from "@/lib/money";

function initialState(today: string, docNo: string): FormState {
  return {
    docNo,
    docDate: today,
    customerName: "",
    customerAddress: "",
    customerTaxId: "",
    poRef: "",
    contactName: "นายอะลี กิตติผู้",
    contactPosition: "ผู้เสนอราคา",
    validityDays: "50",
    deliveryDays: "50",
    paymentDays: "60",
    vatRate: "7",
    vatInclusive: false,
    finalDiscount: "0",
    remark: "",
    // deterministic id so the SSR markup and the client render match
    items: [newItem({ id: "i0" })]
  };
}

const LAYOUTS = [
  { value: "split", label: "แยกหน้าจอ" },
  { value: "preview", label: "เต็มจอ" },
  { value: "form", label: "ฟอร์ม" },
] as const;

type Layout = (typeof LAYOUTS)[number]["value"];

export interface EditingPayload {
  id: string;
  docNo: string;
  docDate: string;
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  poRef: string;
  contactName: string;
  contactPosition: string;
  validityDays: string;
  deliveryDays: string;
  paymentDays: string;
  vatRate: string;
  vatInclusive: boolean;
  finalDiscount: string;
  remark: string;
  items: FormItem[];
}

export function QuotationForm({
  today,
  docNo,
  editing,
}: {
  today: string;
  docNo: string;
  editing?: EditingPayload;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() =>
    editing
      ? {
          ...initialState(today, editing.docNo),
          docDate: editing.docDate,
          customerName: editing.customerName,
          customerAddress: editing.customerAddress,
          customerTaxId: editing.customerTaxId,
          poRef: editing.poRef,
          contactName: editing.contactName,
          contactPosition: editing.contactPosition,
          validityDays: editing.validityDays,
          deliveryDays: editing.deliveryDays,
          paymentDays: editing.paymentDays,
          vatRate: editing.vatRate,
          vatInclusive: editing.vatInclusive,
          finalDiscount: editing.finalDiscount,
          remark: editing.remark,
          items: editing.items,
        }
      : initialState(today, docNo),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>("split");
  const [productList, setProductList] = useState<
    { description: string; unit: string | null; unitPrice: number }[]
  >([]);
  const [customerList, setCustomerList] = useState<
    { name: string; address: string; taxId: string | null }[]
  >([]);

  // master data for autocomplete
  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { description: string; unit: string | null; unitPrice: number }[]) =>
        setProductList(rows),
      )
      .catch(() => undefined);
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { name: string; address: string; taxId: string | null }[]) =>
        setCustomerList(rows),
      )
      .catch(() => undefined);
  }, []);

  const doc = useMemo(() => toDoc(state, sampleCompany), [state]);

  /** payload for the API (money in satang) */
  const payload = () => ({
    docDate: state.docDate,
    customerName: state.customerName,
    customerAddress: state.customerAddress,
    customerTaxId: state.customerTaxId || null,
    poRef: state.poRef || null,
    contactName: state.contactName || null,
    contactPosition: state.contactPosition || null,
    validityDays: Number(state.validityDays) || 0,
    deliveryDays: Number(state.deliveryDays) || 0,
    paymentDays: Number(state.paymentDays) || 0,
    vatRate: Number(state.vatRate) || 0,
    vatInclusive: state.vatInclusive,
    finalDiscount: toSatang(state.finalDiscount),
    remark: state.remark || null,
    status: "draft",
    items: state.items.map((it) => ({
      description: it.description,
      qty: Number(it.qty) || 0,
      unit: it.unit || null,
      unitPrice: toSatang(it.unitPrice),
      discount:
        it.discountMode === "percent"
          ? Number(it.discount) || 0
          : it.discount
            ? toSatang(it.discount)
            : 0,
      discountMode: it.discountMode,
    })),
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  /** keep the item list in sync and autofill price from the product master */
  function updateItems(items: FormItem[]) {
    setState((s) => ({
      ...s,
      items: items.map((it) => {
        if (it.unitPrice) return it;
        const match = productList.find(
          (p) => p.description.trim().toLowerCase() === it.description.trim().toLowerCase(),
        );
        if (!match) return it;
        return {
          ...it,
          unit: it.unit || match.unit || "",
          unitPrice: (match.unitPrice / 100).toFixed(2),
        };
      }),
    }));
  }

  function validate(): boolean {
    const result = formSchema.safeParse(state);
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(collectErrors(result.error));
    return false;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(editing ? `/api/quotations/${editing.id}` : "/api/quotations", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { action: "content", ...payload() } : payload()),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setMessage(body?.issues?.[0]?.message ?? "บันทึกไม่สำเร็จ");
        return;
      }
      const created = (await res.json()) as { id: string };
      router.push(`/quotations/${editing?.id ?? created.id}`);
    } catch {
      setMessage("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function pickCustomer(name: string) {
    const found = customerList.find((c) => c.name === name);
    setState((s) => ({
      ...s,
      customerName: name,
      customerAddress: found?.address ?? s.customerAddress,
      customerTaxId: found?.taxId ?? s.customerTaxId,
    }));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* ---------- top bar ---------- */}
      <header className="no-print z-20 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <h1 className="text-base font-bold">
          {editing ? `แก้ไขใบเสนอราคา ${state.docNo}` : "ใบเสนอราคาใหม่"}
        </h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {state.docNo}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="มุมมองหน้าจอ"
            className="flex overflow-hidden rounded border border-slate-300"
          >
            {LAYOUTS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLayout(l.value)}
                aria-pressed={layout === l.value}
                className={`h-9 px-3 text-xs transition-colors ${
                  layout === l.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="h-9 rounded bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "บันทึก"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (validate()) window.print();
            }}
            className="h-9 rounded border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
          >
            พิมพ์ / PDF
          </button>
        </div>

        {message ? <p className="w-full text-xs text-red-600">{message}</p> : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ---------- form panel ---------- */}
        {layout !== "preview" ? (
          <div
            className={`form-panel w-full shrink-0 space-y-4 overflow-y-auto bg-white p-4 ${
              layout === "form" ? "mx-auto max-w-3xl" : "lg:w-[440px] lg:border-r"
            }`}
          >
            <fieldset className="space-y-2 rounded border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-600">เอกสาร</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  <span className="block text-slate-500">เลขที่เอกสาร</span>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-1 read-only:bg-slate-100"
                    value={state.docNo}
                    readOnly={Boolean(editing)}
                    onChange={(e) => set("docNo", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-slate-500">วันที่ (พ.ศ.)</span>
                  <ThaiDateInput
                    aria-label="วันที่ของเอกสาร (พ.ศ.)"
                    value={state.docDate}
                    onChange={(iso) => set("docDate", iso)}
                  />
                </label>
              </div>
              {errors.docNo ? <p className="text-xs text-red-600">{errors.docNo}</p> : null}
              {errors.docDate ? <p className="text-xs text-red-600">{errors.docDate}</p> : null}
            </fieldset>

            <fieldset className="space-y-2 rounded border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-600">ลูกค้า</legend>
              <label className="block text-sm">
                <span className="block text-slate-500">ชื่อลูกค้า / Customer</span>
                <input
                  list="customer-list"
                  className="w-full rounded border border-slate-300 px-2 py-1"
                  value={state.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  onBlur={(e) => pickCustomer(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="block text-slate-500">ที่อยู่ / Address</span>
                <textarea
                  rows={2}
                  className="w-full rounded border border-slate-300 px-2 py-1"
                  value={state.customerAddress}
                  onChange={(e) => set("customerAddress", e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="block text-slate-500">เลขประจำตัวผู้เสียภาษี</span>
                <input
                  className="w-full rounded border border-slate-300 px-2 py-1"
                  value={state.customerTaxId}
                  onChange={(e) => set("customerTaxId", e.target.value)}
                />
              </label>
              {errors.customerName ? (
                <p className="text-xs text-red-600">{errors.customerName}</p>
              ) : null}
              {errors.customerAddress ? (
                <p className="text-xs text-red-600">{errors.customerAddress}</p>
              ) : null}

              <datalist id="customer-list">
                {customerList.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </fieldset>

            <fieldset className="space-y-2 rounded border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-600">รายการ</legend>
              <ItemsEditor
                items={state.items}
                onChange={updateItems}
                errors={errors}
                products={productList.map((p) => p.description)}
              />
              <datalist id="product-list">
                {productList.map((p) => (
                  <option key={p.description} value={p.description} />
                ))}
              </datalist>
            </fieldset>

            <fieldset className="space-y-2 rounded border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-600">เงื่อนไข</legend>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <label>
                  <span className="block text-slate-500">ยืนราคา (วัน)</span>
                  <input
                    type="number"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={state.validityDays}
                    onChange={(e) => set("validityDays", e.target.value)}
                  />
                </label>
                <label>
                  <span className="block text-slate-500">ส่งของ (วัน)</span>
                  <input
                    type="number"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={state.deliveryDays}
                    onChange={(e) => set("deliveryDays", e.target.value)}
                  />
                </label>
                <label>
                  <span className="block text-slate-500">ชำระเงิน (วัน)</span>
                  <input
                    type="number"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={state.paymentDays}
                    onChange={(e) => set("paymentDays", e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <label>
                  <span className="block text-slate-500">VAT %</span>
                  <input
                    type="number"
                    step="any"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={state.vatRate}
                    onChange={(e) => set("vatRate", e.target.value)}
                  />
                </label>
                <label>
                  <span className="block text-slate-500">ส่วนลดท้ายบิล</span>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-1 text-right"
                    value={state.finalDiscount}
                    onChange={(e) => set("finalDiscount", e.target.value)}
                  />
                </label>
                <label className="flex items-end gap-1 pb-1">
                  <input
                    type="checkbox"
                    checked={state.vatInclusive}
                    onChange={(e) => set("vatInclusive", e.target.checked)}
                  />
                  <span className="text-slate-600">ราคารวม VAT</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <label>
                  <span className="block text-slate-500">อ้างถึงใบสั่งซื้อ (PO)</span>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={state.poRef}
                    onChange={(e) => set("poRef", e.target.value)}
                  />
                </label>
                <label>
                  <span className="block text-slate-500">ผู้ติดต่อ</span>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={state.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="block text-slate-500">หมายเหตุเพิ่มเติม</span>
                <textarea
                  rows={2}
                  className="w-full rounded border border-slate-300 px-2 py-1"
                  value={state.remark}
                  onChange={(e) => set("remark", e.target.value)}
                />
              </label>
            </fieldset>
          </div>
        ) : null}

        {/* ---------- live preview ---------- */}
        {layout !== "form" ? (
          <div className="preview-panel min-h-0 flex-1">
            <PreviewPane doc={doc} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
