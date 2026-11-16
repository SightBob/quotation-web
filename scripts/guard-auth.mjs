import { readFileSync, writeFileSync } from "node:fs";
const files = [
  "src/app/api/quotations/route.ts",
  "src/app/api/quotations/[id]/route.ts",
  "src/app/api/customers/route.ts",
  "src/app/api/products/route.ts",
  "src/app/api/settings/route.ts",
];
for (const f of files) {
  let s = readFileSync(f, "utf8");
  if (!s.includes("getCurrentUser")) {
    // add import
    s = s.replace(/^import \{ NextRequest, NextResponse \} from "next\/server";/m,
      'import { NextRequest, NextResponse } from "next/server";\nimport { getCurrentUser } from "@/lib/supabase/server";');
    s = s.replace(/^import \{ NextResponse \} from "next\/server";/m,
      'import { NextResponse } from "next/server";\nimport { getCurrentUser } from "@/lib/supabase/server";');
    // guard: insert check as first statement of every exported handler
    s = s.replace(/(export async function (GET|POST|PATCH|PUT|DELETE)\([^)]*\) \{\n)/g,
      '$1  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });\n');
    writeFileSync(f, s);
    console.log("guarded", f);
  }
}
