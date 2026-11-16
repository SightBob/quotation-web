"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { STATUS_LABEL, isStatus, type Status } from "@/lib/status";

export function QuotationActions({
  id,
  docNo,
  status,
  internalNote,
  revisionNo,
}: {
  id: string;
  docNo: string;
  status: string;
  internalNote: string | null;
  revisionNo: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState(internalNote ?? "");

  const s: Status = isStatus(status) ? status : "draft";
  const locked = s !== "draft";

  async function call(action: () => Promise<Response>, ok: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await action();
      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        setMessage(body?.message ?? "ทำรายการไม่ได้");
        return null;
      }
      if (!res.ok) {
        setMessage(`ทำรายการไม่สำเร็จ (${res.status})`);
        return null;
      }
      setMessage(ok);
      return res;
    } catch {
      setMessage("ทำรายการไม่สำเร็จ");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: Status) {
    await call(
      () =>
        fetch(`/api/quotations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", status: next }),
        }),
      `เปลี่ยนสถานะเป็น "${STATUS_LABEL[next]}" แล้ว`,
    );
    router.refresh();
  }

  async function send() {
    const ok = confirm(
      `ส่งเอกสาร ${docNo} ใช่หรือไม่?\n\nหลังจากนี้จะแก้ไขโดยตรงไม่ได้ ต้องสร้างฉบับแก้ไข (Revision) เท่านั้น`,
    );
    if (!ok) return;
    await changeStatus("sent");
  }

  async function revise() {
    const res = await call(
      () => fetch(`/api/quotations/${id}/revision`, { method: "POST" }),
      "สร้างฉบับแก้ไขแล้ว",
    );
    if (!res) return;
    const created = (await res.json()) as { id: string };
    router.push(`/quotations/${created.id}/edit`);
  }

  async function duplicate() {
    const res = await call(
      () => fetch(`/api/quotations/${id}`, { method: "POST" }),
      "คัดลอกแล้ว",
    );
    if (!res) return;
    const created = (await res.json()) as { id: string };
    router.push(`/quotations/${created.id}`);
  }

  async function remove() {
    if (!confirm(`ลบใบเสนอราคา ${docNo} ?`)) return;
    const res = await call(
      () => fetch(`/api/quotations/${id}`, { method: "DELETE" }),
      "ลบแล้ว",
    );
    if (res) router.push("/");
  }

  async function saveNote() {
    await call(
      () =>
        fetch(`/api/quotations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "note", note: note || null }),
        }),
      "บันทึกภายในแล้ว",
    );
    router.refresh();
  }

  const btn = "h-9 rounded px-3 text-sm font-medium disabled:opacity-50";

  return (
    <div className="no-print space-y-2 border-b border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={s} />
        {revisionNo > 0 ? (
          <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
            ฉบับแก้ไข R{revisionNo}
          </span>
        ) : null}
        <span className="text-sm text-slate-500">{docNo}</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {s === "draft" ? (
            <>
              <button
                onClick={() => router.push(`/quotations/${id}/edit`)}
                className={`${btn} border border-slate-300 hover:bg-slate-50`}
              >
                แก้ไข
              </button>
              <button
                onClick={send}
                disabled={busy}
                className={`${btn} bg-slate-900 text-white`}
              >
                ส่งแล้ว (ล็อกเอกสาร)
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className={`${btn} border border-red-300 text-red-600`}
              >
                ลบ
              </button>
            </>
          ) : null}

          {s === "sent" ? (
            <>
              <button
                onClick={revise}
                disabled={busy}
                className={`${btn} bg-slate-900 text-white`}
              >
                สร้างฉบับแก้ไข
              </button>
              <button
                onClick={() => changeStatus("approved")}
                disabled={busy}
                className={`${btn} border border-emerald-300 text-emerald-700`}
              >
                ลูกค้าอนุมัติ
              </button>
              <button
                onClick={() => changeStatus("rejected")}
                disabled={busy}
                className={`${btn} border border-red-300 text-red-600`}
              >
                ลูกค้าปฏิเสธ
              </button>
            </>
          ) : null}

          {locked && s !== "sent" ? (
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
              🔒 เอกสารถูกล็อก — แก้ไขเนื้อหาไม่ได้
            </span>
          ) : null}

          <button
            onClick={duplicate}
            disabled={busy}
            className={`${btn} border border-slate-300 hover:bg-slate-50`}
          >
            คัดลอก
          </button>
          <button
            onClick={() => window.open(`/api/quotations/${id}/pdf`, "_blank")}
            className={`${btn} border border-slate-300 hover:bg-slate-50`}
          >
            PDF
          </button>
          <button
            onClick={() => window.open(`/quotations/${id}/print`, "_blank")}
            className={`${btn} border border-slate-300 hover:bg-slate-50`}
          >
            พิมพ์
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      {/* internal note - editable in every status */}
      <details className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          บันทึกภายใน (ไม่แสดงบนเอกสาร)
        </summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="บันทึกส่วนตัว เช่น เลขที่โทรคุยลูกค้า"
            className="min-w-64 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
          <button
            onClick={saveNote}
            disabled={busy}
            className={`${btn} border border-slate-300 bg-white`}
          >
            บันทึก
          </button>
        </div>
      </details>
    </div>
  );
}
