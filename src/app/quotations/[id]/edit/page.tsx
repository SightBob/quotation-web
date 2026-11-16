import { notFound, redirect } from "next/navigation";
import { QuotationForm, type EditingPayload } from "@/components/form/QuotationForm";
import { toDateInputValue } from "@/lib/format";
import { getQuotation } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getQuotation(id);
  if (!row) notFound();

  // only drafts may be edited - locked documents go back to the read-only view
  if (row.quotation.status !== "draft") {
    redirect(`/quotations/${id}`);
  }

  const q = row.quotation;
  const editing: EditingPayload = {
    id: q.id,
    docNo: q.docNo,
    docDate: toDateInputValue(q.docDate),
    customerName: q.customerName,
    customerAddress: q.customerAddress,
    customerTaxId: q.customerTaxId ?? "",
    poRef: q.poRef ?? "",
    contactName: q.contactName ?? "",
    contactPosition: q.contactPosition ?? "",
    validityDays: String(q.validityDays),
    deliveryDays: String(q.deliveryDays),
    paymentDays: String(q.paymentDays),
    vatRate: String(Number(q.vatRate)),
    vatInclusive: q.vatInclusive,
    finalDiscount: (q.finalDiscount / 100).toFixed(2),
    remark: q.remark ?? "",
    items: row.items.map((i, index) => ({
      id: `i${index}`,
      description: i.description,
      qty: String(Number(i.qty)),
      unit: i.unit ?? "",
      unitPrice: (i.unitPrice / 100).toFixed(2),
      discount:
        i.discountMode === "percent"
          ? String(i.discount)
          : (i.discount / 100).toFixed(2),
      discountMode: i.discountMode === "percent" ? "percent" : "amount",
    })),
  };

  return <QuotationForm today={editing.docDate} docNo={q.docNo} editing={editing} />;
}
