import { notFound } from "next/navigation";
import { QuotationDoc } from "@/components/doc/QuotationDoc";
import { QuotationActions } from "@/components/quotation/QuotationActions";
import { QuotationTabs } from "@/components/quotation/QuotationTabs";
import {
  getAuditLogs,
  getCompanySettings,
  getQuotation,
  getRevisionFamily,
  toDoc,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function QuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getQuotation(id);
  if (!row) notFound();

  const [company, audit, revisions] = await Promise.all([
    getCompanySettings(),
    getAuditLogs(id),
    getRevisionFamily(id),
  ]);
  const doc = toDoc(row, company);

  return (
    <main>
      <QuotationActions
        id={id}
        docNo={row.quotation.docNo}
        status={row.quotation.status}
        internalNote={row.quotation.internalNote}
        revisionNo={row.quotation.revisionNo}
      />
      <QuotationTabs
        currentId={id}
        audit={audit}
        revisions={revisions}
        docPanel={
          <div className="sheet">
            <QuotationDoc doc={doc} />
          </div>
        }
      />
    </main>
  );
}
