"use client";

import { useState } from "react";
import type { GlossaryEntry as Entry } from "@/data/glossary";

export default function GlossaryEntry({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#9db8d4] bg-[#eaf3ff]">
      {/* HEADER */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#0d2447]">
            {entry.label}
          </span>

          {/* CATEGORY TAG */}
          <span className="rounded-full border border-[#8fb0d1] bg-[#dceaf8] px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#0d2447]">
            {entry.category.toUpperCase()}
          </span>
        </div>

        <span className="text-[#5b7ea6]">{open ? "–" : "+"}</span>
      </button>

      {/* BODY */}
      {open && (
        <div className="border-t border-[#c7d9ee] px-4 pb-5 pt-4 text-sm">
          {/* BASIC */}
          <div className="mb-4">
            <div className="mb-1 text-[11px] font-bold tracking-wide text-[#3b5f8a]">
              BASIC
            </div>
            <p className="text-[#0d2447] leading-relaxed">
              {entry.description.basic}
            </p>
          </div>

          {/* ADVANCED */}
          <div className="mb-4">
            <div className="mb-1 text-[11px] font-bold tracking-wide text-[#3b5f8a]">
              ADVANCED
            </div>
            <p className="text-[#27476f] leading-relaxed">
              {entry.description.advanced}
            </p>
          </div>

          {/* META */}
          {(entry.units || entry.sourcePath || entry.fieldPath) && (
            <div className="mt-4 border-t border-[#c7d9ee] pt-3 text-xs text-[#3b5f8a]">
              {entry.units && <div>Unit: {entry.units}</div>}
              {entry.sourcePath && <div>Source: {entry.sourcePath}</div>}
              {entry.fieldPath && <div>Field: {entry.fieldPath}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}