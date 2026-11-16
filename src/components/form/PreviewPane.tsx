"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QuotationDoc } from "@/components/doc/QuotationDoc";
import type { QuotationDoc as QuotationDocType } from "@/lib/types";

const MM_TO_PX = 96 / 25.4;
const PAGE_W = 210 * MM_TO_PX; // A4 width in px
const PAGE_H = 297 * MM_TO_PX; // A4 height in px
const PAGE_MARGIN = 10 * MM_TO_PX; // @page margin 10mm
const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25];

export function PreviewPane({ doc }: { doc: QuotationDocType }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.5);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [docHeight, setDocHeight] = useState(PAGE_H - PAGE_MARGIN * 2);

  // scale to fit the available width
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth - 24; // padding
      setFitScale(Math.min(1, Math.max(0.2, width / PAGE_W)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // real height of the document content (for the page counter)
  useLayoutEffect(() => {
    const el = docRef.current;
    if (!el) return;
    setDocHeight(el.offsetHeight);
    const ro = new ResizeObserver(() => setDocHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  const scale = zoom === "fit" ? fitScale : zoom;
  const pages = Math.max(1, Math.ceil((docHeight + PAGE_MARGIN * 2) / PAGE_H));

  function zoomIn() {
    const current = scale;
    const next = ZOOM_STEPS.find((s) => s > current + 0.001);
    setZoom(next ?? 1.25);
  }

  function zoomOut() {
    const current = scale;
    const next = [...ZOOM_STEPS].reverse().find((s) => s < current - 0.001);
    setZoom(next ?? 0.5);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-slate-300 bg-white/95 px-3 py-2 backdrop-blur">
        <span className="text-sm font-semibold text-slate-700">ตัวอย่างเอกสาร</span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {pages} หน้า
        </span>

        <div className="ml-auto flex items-center gap-1">
          <div className="flex items-center rounded border border-slate-300">
            <button
              type="button"
              onClick={zoomOut}
              aria-label="ซูมออก"
              className="h-8 w-8 text-lg leading-none text-slate-600 hover:bg-slate-100"
            >
              −
            </button>
            <span className="w-14 text-center text-xs tabular-nums text-slate-600">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              aria-label="ซูมเข้า"
              className="h-8 w-8 text-lg leading-none text-slate-600 hover:bg-slate-100"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => setZoom("fit")}
            aria-pressed={zoom === "fit"}
            className={`h-8 rounded border px-2.5 text-xs ${
              zoom === "fit"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            พอดีความกว้าง
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-pressed={zoom === 1}
            className={`h-8 rounded border px-2.5 text-xs ${
              zoom === 1
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            100%
          </button>
        </div>
      </div>

      {/* document viewport */}
      <div ref={viewportRef} className="preview-viewport min-h-0 flex-1 overflow-auto bg-slate-500 p-3">
        <div
          className="preview-spacer mx-auto"
          style={{ width: PAGE_W * scale, height: (docHeight + PAGE_MARGIN * 2) * scale }}
        >
          <div
            className="preview-paper"
            style={{
              width: PAGE_W,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div ref={sheetRef} className="sheet preview-sheet">
              <div ref={docRef}>
                <QuotationDoc doc={doc} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
