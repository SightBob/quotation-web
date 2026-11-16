"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { formatThaiDate } from "@/lib/format";

export interface AuditRow {
  id: number;
  action: string;
  changedByEmail: string | null;
  changedAt: string | Date;
  oldValues: unknown;
  newValues: unknown;
  note: string | null;
}

export interface RevisionRow {
  id: string;
  docNo: string;
  status: string;
  revisionNo: number;
  createdAt: string | Date;
  parentId: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  create: "สร้างเอกสาร",
  update: "แก้ไขเนื้อหา",
  status_change: "เปลี่ยนสถานะ",
  revise: "สร้างฉบับแก้ไข",
  duplicate: "คัดลอก",
  delete: "ลบเอกสาร",
};

function timeOf(iso: string | Date) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatThaiDate(d)} ${hh}:${mm}`;
}

function ValueBlock({ label, values }: { label: string; values: unknown }) {
  if (!values || typeof values !== "object" || Object.keys(values).length === 0) return null;
  const entries = values as Record<string, unknown>;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-xs font-semibold text-slate-500">{label}</div>
      <dl className="space-y-0.5 rounded bg-slate-50 p-2 text-xs text-slate-700">
        {Object.entries(entries).map(([k, v]) => (
          <div key={k} className="flex gap-1">
            <dt className="shrink-0 text-slate-500">{k}:</dt>
            <dd className="min-w-0 break-words">
              {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function QuotationTabs({
  docPanel,
  audit,
  revisions,
  currentId,
}: {
  docPanel: ReactNode;
  audit: AuditRow[];
  revisions: RevisionRow[];
  currentId: string;
}) {
  const [tab, setTab] = useState<"doc" | "audit" | "revisions">("doc");

  const tabs = [
    { key: "doc", label: "เอกสาร" },
    { key: "audit", label: `ประวัติการเปลี่ยนแปลง (${audit.length})` },
    { key: "revisions", label: `ฉบับแก้ไข (${revisions.length})` },
  ] as const;

  return (
    <div>
      <div className="no-print flex gap-1 border-b border-slate-200 bg-white px-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t.key
                ? "border-slate-900 font-semibold text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "doc" ? docPanel : null}

      {tab === "audit" ? (
        <div className="p-4">
          {audit.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
          ) : (
            <ol className="space-y-2">
              {audit.map((log) => (
                <li key={log.id} className="rounded border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                    <span className="text-slate-500">
                      {log.changedByEmail ?? "ระบบ"}
                    </span>
                    <span className="text-slate-400">{timeOf(log.changedAt)}</span>
                    {log.note ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {log.note}
                      </span>
                    ) : null}
                  </div>
                  {log.oldValues || log.newValues ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ValueBlock label="ก่อน" values={log.oldValues} />
                      <ValueBlock label="หลัง" values={log.newValues} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}

      {tab === "revisions" ? (
        <div className="p-4">
          <ol className="space-y-2">
            {revisions.map((r) => {
              const current = r.id === currentId;
              return (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center gap-2 rounded border p-3 text-sm ${
                    current ? "border-slate-900 bg-white" : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="font-semibold">{r.docNo}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-slate-500">สร้าง {formatThaiDate(r.createdAt)}</span>
                  {current ? (
                    <span className="text-xs text-slate-500">(ฉบับที่เปิดอยู่)</span>
                  ) : (
                    <Link
                      href={`/quotations/${r.id}`}
                      className="ml-auto text-sky-700 hover:underline"
                    >
                      เปิดดูฉบับนี้ (อ่านอย่างเดียว)
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
