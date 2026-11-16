import { NextResponse } from "next/server";
import { renderPdf } from "@/server/pdf";
import { getRequestUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;
  const url = `${origin}/quotations/${id}/print`;

  try {
    // forward the session cookies: the print page is behind the proxy
    const cookies = (req.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        return { name: part.slice(0, idx), value: decodeURIComponent(part.slice(idx + 1)) };
      })
      .filter((c) => c.name && c.value);

    const pdf = await renderPdf(url, { cookies });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="quotation-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "pdf_failed", message }, { status: 500 });
  }
}
