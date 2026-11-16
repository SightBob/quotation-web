import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { customerPayloadSchema } from "@/lib/api";
import { getDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { searchCustomers } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const rows = await searchCustomers(q);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = customerPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const db = getDb();
  const [row] = await db
    .insert(customers)
    .values({
      name: parsed.data.name,
      nameEn: parsed.data.nameEn ?? null,
      address: parsed.data.address,
      taxId: parsed.data.taxId ?? null,
      branch: parsed.data.branch ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
