import { QuotationForm } from "@/components/form/QuotationForm";
import { toDateInputValue } from "@/lib/format";
import { getDocNoSettings, peekNextDocNo } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  // the date and the next document number come from the server so the client
  // render matches the SSR markup and never shows a stale number
  const today = toDateInputValue(new Date());
  const { pattern } = await getDocNoSettings();
  const docNo = await peekNextDocNo(pattern, today);

  return <QuotationForm today={today} docNo={docNo} />;
}
