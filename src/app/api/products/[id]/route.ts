import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getRequestUser } from "@/lib/supabase/server";
import { productPayloadSchema } from "@/lib/api";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = productPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = getDb();
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const [row] = await db
    .update(products)
    .set({
      description: parsed.data.description,
      unit: parsed.data.unit ?? null,
      unitPrice: parsed.data.unitPrice,
    })
    .where(eq(products.id, productId))
    .returning();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db.delete(products).where(eq(products.id, productId)).returning({ id: products.id });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: row.id });
}
