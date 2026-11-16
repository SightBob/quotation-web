"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "รายการเอกสาร" },
  { href: "/products", label: "สินค้า" },
  { href: "/customers", label: "ลูกค้า" },
  { href: "/settings", label: "ตั้งค่า" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function signOut() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-2">
      <Link href="/" className="mr-2 flex items-center gap-2 font-semibold text-slate-800">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-[#8CC63F] text-sm font-bold text-[#1F2B12]">
          55
        </span>
        <span className="hidden sm:inline">ระบบใบเสนอราคา</span>
      </Link>

      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
            isActive(link.href)
              ? "bg-slate-900 font-medium text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {link.label}
        </Link>
      ))}

      <button
        onClick={signOut}
        disabled={busy}
        className="ml-auto rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        ออกจากระบบ
      </button>
    </nav>
  );
}
