"use client";

import { useEffect, useRef, useState } from "react";
import { formatThaiDate, thaiDateToIso, toDateInputValue } from "@/lib/format";

interface Props {
  /** ISO yyyy-mm-dd */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

/** Date input that speaks พ.ศ. (dd/mm/yyyy) with a native picker fallback */
export function ThaiDateInput({
  value,
  onChange,
  id,
  className = "w-full rounded border border-slate-300 px-2 py-1",
  "aria-label": ariaLabel,
}: Props) {
  const [text, setText] = useState(() => formatThaiDate(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  // keep the text in sync when the value changes from outside
  useEffect(() => {
    setText(formatThaiDate(value));
  }, [value]);

  function commit(next: string) {
    const iso = thaiDateToIso(next);
    if (iso) {
      onChange(iso);
      setText(formatThaiDate(iso));
      return true;
    }
    return false;
  }

  function onChangeText(raw: string) {
    // keep digits only, max 8 (ddmmyyyy)
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(masked);
    // a complete 4 digit year updates the preview right away
    // (2 digit years stay uncommitted until blur, they are ambiguous)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(masked)) {
      const iso = thaiDateToIso(masked);
      if (iso) onChange(iso);
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder="วว/ดด/ปป"
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        onBlur={(e) => {
          if (!commit(e.target.value)) setText(formatThaiDate(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
        className={className}
      />
      <button
        type="button"
        aria-label="เลือกวันที่"
        onClick={() => {
          const el = pickerRef.current;
          if (!el) return;
          if (typeof el.showPicker === "function") el.showPicker();
          else el.click();
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </button>
      {/* native picker keeps the OS calendar; the value is converted back to พ.ศ. */}
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={(e) => {
          if (!e.target.value) return;
          onChange(toDateInputValue(e.target.value));
        }}
        className="pointer-events-none absolute right-0 h-8 w-8 opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
