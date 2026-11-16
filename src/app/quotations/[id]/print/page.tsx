import { notFound } from "next/navigation";
import { QuotationDoc } from "@/components/doc/QuotationDoc";
import { getCompanySettings, getQuotation, toDoc } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PrintQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getQuotation(id);
  if (!row) notFound();

  const company = await getCompanySettings();
  const doc = toDoc(row, company);

  return (
    <main>
      <div className="sheet">
        <QuotationDoc doc={doc} />
      </div>
    </main>
  );
}
