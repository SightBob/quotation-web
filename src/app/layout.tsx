import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบใบเสนอราคา",
  description: "ออกใบเสนอราคา A4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="flex min-h-[100dvh] flex-col">
        <AppNav />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
