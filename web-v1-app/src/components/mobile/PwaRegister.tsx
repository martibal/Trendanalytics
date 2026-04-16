// src/components/mobile/PwaRegister.tsx
// Registers service worker and handles "Add to Home Screen" prompt
"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failure is non-critical
      });
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);

      // Show banner on second visit
      const visits = Number(localStorage.getItem("ua-visits") ?? "0") + 1;
      localStorage.setItem("ua-visits", String(visits));
      if (visits >= 2) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setShowBanner(false);
  };

  if (!showBanner || !installPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-cyan-500/25 bg-[#0F1B2D] p-4 shadow-2xl shadow-black/40">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 text-lg font-black">
          UA
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-white">
            Add Urd Atlas to home screen
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Instant access to daily chain state
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 rounded-xl bg-cyan-500 py-2 text-[12px] font-bold text-[#06111b]"
        >
          Add to home screen
        </button>
        <button
          type="button"
          onClick={() => setShowBanner(false)}
          className="rounded-xl border border-white/10 px-4 py-2 text-[12px] text-slate-400"
        >
          Later
        </button>
      </div>
    </div>
  );
}
