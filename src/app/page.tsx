import Link from "next/link";
import { listQuotations } from "@/lib/db/queries";
import { formatThaiDate } from "@/lib/format";
import { computeTotals, formatBaht } from "@/lib/money";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { STATUS_LABEL } from "@/lib/status";
import { getDb } from "@/lib/db";
import { quotationItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; all?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const allRevisions = sp.all === "1";
  const rows = await listQuotations({ search: sp.q, status, allRevisions });

  // keep the current filters when switching between "latest only" and "all revisions"
  const filterParams = new URLSearchParams();
  if (sp.q) filterParams.set("q", sp.q);
  if (status !== "all") filterParams.set("status", status);

  const db = getDb();
  // totals per row (one extra query per row is fine at this scale)
  const totals = new Map<string, number>();
  for (const row of rows) {
    const items = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, row.id));
    totals.set(
      row.id,
      computeTotals({
        lines: items.map((i) => ({
          qty: Number(i.qty),
          unitPrice: i.unitPrice,
          discount: i.discount,
          discountMode: i.discountMode === "percent" ? "percent" : "amount",
        })),
        finalDiscount: row.finalDiscount,
        vatRate: Number(row.vatRate),
        vatInclusive: row.vatInclusive,
      }).net,
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">ใบเสนอราคา</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              จัดการสินค้า
            </Link>
            <Link
              href="/customers"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              จัดการลูกค้า
            </Link>
            <Link
              href="/settings"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              ตั้งค่าบริษัท
            </Link>
            <Link
              href="/quotations/new"
              className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
            >
              + สร้างใบเสนอราคา
            </Link>
          </div>
        </div>

        <form className="mb-3 flex flex-wrap items-center gap-2" action="/">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="ค้นหาเลขที่ / ลูกค้า / PO"
            className="w-64 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">ทุกสถานะ</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white">ค้นหา</button>
          <div className="ml-auto flex items-center gap-2 text-sm">
            {allRevisions ? (
              <Link
                href={`/?${filterParams.toString()}`}
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
              >
                แสดงเฉพาะฉบับล่าสุด
              </Link>
            ) : (
              <Link
                href={`/?${new URLSearchParams([...filterParams, ["all", "1"]]).toString()}`}
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
              >
                แสดงทุกฉบับ (รวมฉบับแก้ไข)
              </Link>
            )}
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">เลขที่</th>
                <th className="px-3 py-2 font-semibold">วันที่</th>
                <th className="px-3 py-2 font-semibold">ลูกค้า</th>
                <th className="px-3 py-2 font-semibold">PO</th>
                <th className="px-3 py-2 text-right font-semibold">ยอดสุทธิ</th>
                <th className="px-3 py-2 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    ไม่พบใบเสนอราคา
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/quotations/${row.id}`}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        {row.docNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatThaiDate(row.docDate)}</td>
                    <td className="px-3 py-2">{row.customerName}</td>
                    <td className="px-3 py-2">{row.poRef ?? "-"}</td>
                    <td className="px-3 py-2 text-right">
                      {formatBaht(totals.get(row.id) ?? 0)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
