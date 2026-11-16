import { NextResponse } from "next/server";
import { z } from "zod";
import { quotationPayloadSchema } from "@/lib/api";
import { getRequestUser } from "@/lib/supabase/server";
import {
  duplicateQuotation,
  getQuotation,
  softDeleteQuotation,
  StatusError,
  updateInternalNote,
  updateQuotationContent,
  updateQuotationStatus,
} from "@/lib/db/queries";
import { statusSchema } from "@/lib/status";

type Ctx = { params: Promise<{ id: string }> };

const contentSchema = quotationPayloadSchema.extend({
  action: z.literal("content"),
});

const statusBodySchema = z.object({
  action: z.literal("status"),
  status: statusSchema,
  note: z.string().max(2000).optional(),
});

const noteBodySchema = z.object({
  action: z.literal("note"),
  note: z.string().max(2000).nullable(),
});

function errorResponse(err: unknown) {
  if (err instanceof StatusError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: "server_error", message: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const actor = { id: user.id, email: user.email };
  const row = await getQuotation(id);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const actor = { id: user.id, email: user.email };
  const body = await req.json().catch(() => null);

  try {
    if (body?.action === "status") {
      const parsed = statusBodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "validation_failed", issues: parsed.error.issues },
          { status: 400 },
        );
      }
      const updated = await updateQuotationStatus(
        id,
        parsed.data.status,
        actor,
        parsed.data.note ?? null,
      );
      if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json(updated);
    }

    if (body?.action === "note") {
      const parsed = noteBodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "validation_failed", issues: parsed.error.issues },
          { status: 400 },
        );
      }
      const updated = await updateInternalNote(id, parsed.data.note, actor);
      if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json(updated);
    }

    const parsed = contentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { action: _action, ...payload } = parsed.data;
    const updated = await updateQuotationContent(id, payload, actor);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const actor = { id: user.id, email: user.email };
  try {
    const deleted = await softDeleteQuotation(id, actor);
    if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return errorResponse(err);
  }
}

/** duplicate: copy an existing quotation into a new draft with a new doc number */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const actor = { id: user.id, email: user.email };
  try {
    const copy = await duplicateQuotation(id, actor);
    if (!copy) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(copy, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
