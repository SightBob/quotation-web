import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { quotationPayloadSchema } from "@/lib/api";
import { createQuotation, listQuotations } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const customerId = sp.get("customerId");
  const rows = await listQuotations({
    search: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    customerId: customerId ? Number(customerId) : undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
    allRevisions: sp.get("allRevisions") === "1",
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = quotationPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const quotation = await createQuotation(parsed.data);
  return NextResponse.json(quotation, { status: 201 });
}
