"use client";

import { useState, type ReactNode } from "react";

type ModalId = "how-to-read" | "cadence" | "confidence";

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-[#9db8d4] bg-[#f4f9ff] px-1.5 py-0.5 font-mono text-xs font-bold text-[#0d2447]">
      {children}
    </code>
  );
}

function InfoButton({
  id,
  label,
  onOpen,
}: {
  id: ModalId;
  label: string;
  onOpen: (id: ModalId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="inline-flex items-center rounded-full border border-blue-300 bg-[#d8e9fb] px-3 py-1 text-xs font-extrabold text-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:border-blue-500 hover:bg-white hover:text-blue-900"
    >
      {label}
    </button>
  );
}

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-[#b6cce3] bg-[#e7f1fb] shadow-2xl shadow-slate-950/30">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#b6cce3] px-6 py-5">
          <div>
            <h3 className="text-2xl font-black text-[#0d2447]">{title}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#27476f]">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#9db8d4] bg-[#dceaf8] text-xl font-bold text-[#0d2447] hover:bg-white"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5 text-sm font-medium leading-7 text-[#0d2447]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function StatusInfoModals({
  variant = "hero",
}: {
  variant?: "hero" | "cadence";
}) {
  const [active, setActive] = useState<ModalId | null>(null);

  if (variant === "cadence") {
    return (
      <>
        <InfoButton id="cadence" label="Expected cadence" onOpen={setActive} />
        <ModalHost active={active} onClose={() => setActive(null)} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <InfoButton id="how-to-read" label="How to read this page" onOpen={setActive} />
        <InfoButton id="cadence" label="Publication cadence" onOpen={setActive} />
        <InfoButton id="confidence" label="What confidence means here" onOpen={setActive} />
      </div>
      <ModalHost active={active} onClose={() => setActive(null)} />
    </>
  );
}

function ModalHost({
  active,
  onClose,
}: {
  active: ModalId | null;
  onClose: () => void;
}) {
  return (
    <>
      <Modal
        open={active === "how-to-read"}
        title="How to read this page"
        subtitle="Health vs confidence — two separate dimensions."
        onClose={onClose}
      >
        <p>
          <strong>Health</strong> means freshness relative to expected cadence.
          <strong> Confidence</strong> means evidence quality for the published label.
        </p>
        <p className="mt-3">
          A row can be fresh but low-confidence, or delayed but internally coherent.
        </p>
      </Modal>

      <Modal
        open={active === "cadence"}
        title="Publication cadence"
        subtitle="Why some chains update daily and others weekly."
        onClose={onClose}
      >
        <ul className="list-disc space-y-2 pl-5">
          <li>Bitcoin / Ethereum: expected ~1 day lag.</li>
          <li>Arbitrum / Base: expected ~7 day lag.</li>
          <li>BTC/ETH warn above 2d and fail above 4d.</li>
          <li>ARB/Base warn above 10d and fail above 15d.</li>
        </ul>
      </Modal>

      <Modal
        open={active === "confidence"}
        title="What confidence means on this page"
        subtitle="Evidence quality for the published label."
        onClose={onClose}
      >
        <p>
          Confidence is separate from freshness. It reflects how strongly the available
          evidence supports the published regime label.
        </p>
        <p className="mt-3">
          The public gate is <InlineCode>0.40</InlineCode>. Below that, rows should be
          read as degraded rather than normal-confidence named labels.
        </p>
      </Modal>
    </>
  );
}