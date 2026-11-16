import { NextResponse } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { getRequestUser } from "@/lib/supabase/server";
import { customerPayloadSchema } from "@/lib/api";
import { getDb } from "@/lib/db";
import { customers, quotations } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await getRequestUser(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = customerPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = getDb();
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const [row] = await db
    .update(customers)
    .set({
      name: parsed.data.name,
      nameEn: parsed.data.nameEn ?? null,
      address: parsed.data.address,
      taxId: parsed.data.taxId ?? null,
      branch: parsed.data.branch ?? null,
    })
    .where(eq(customers.id, customerId))
    .returning();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await getRequestUser(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const db = getDb();
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  // a customer used by a quotation must stay (the document keeps its snapshot,
  // but the reference still points here)
  const [used] = await db
    .select({ value: count() })
    .from(quotations)
    .where(and(eq(quotations.customerId, customerId), isNull(quotations.deletedAt)));
  if (used && used.value > 0) {
    return NextResponse.json(
      {
        error: "in_use",
        message: `ลูกค้าถูกใช้ในเอกสาร ${used.value} ฉบับ ลบไม่ได้`,
      },
      { status: 409 },
    );
  }

  const [row] = await db
    .delete(customers)
    .where(eq(customers.id, customerId))
    .returning({ id: customers.id });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: row.id });
}
