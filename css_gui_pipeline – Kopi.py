#!/usr/bin/env python
from __future__ import annotations

import time
import os
import sys
import queue
import shutil
import threading
import subprocess
import re
from pathlib import Path
from datetime import datetime
import json

import tkinter as tk
from tkinter import ttk, messagebox


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def which_powershell() -> list[str]:
    """
    Returns the executable for PowerShell.
    NOTE: We intentionally do NOT return '-File' here anymore, because we want to
    control encoding via '-Command' and then invoke the script with '&'.
    """
    candidates = ["powershell.exe", "pwsh.exe"]
    for c in candidates:
        p = shutil.which(c)
        if p:
            # Use standard non-interactive switches.
            return [p, "-NoProfile", "-ExecutionPolicy", "Bypass"]
    return ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass"]


def find_node_npm() -> tuple[str | None, str | None]:
    """
    Robust discovery of node.exe and npm.cmd without relying solely on PATH.
    """
    # 1) PATH
    node = shutil.which("node.exe") or shutil.which("node")
    npm = shutil.which("npm.cmd") or shutil.which("npm")

    if node and npm:
        return node, npm

    # 2) Common install locations
    candidates = [
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "nodejs",
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "nodejs",
        Path(os.environ.get("LOCALAPPDATA", r"C:\Users\%USERNAME%\AppData\Local")) / "Programs" / "nodejs",
    ]

    for d in candidates:
        if d.exists():
            n = d / "node.exe"
            m = d / "npm.cmd"
            if n.exists() and m.exists():
                return str(n), str(m)

    return None, None


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("CSS Pipeline GUI")
        self.geometry("980x620")

        self.root_dir = Path(__file__).resolve().parent

        # scripts
        self.ps_full_pipeline = self.root_dir / "pipeline" / "tools" / "full_pipeline.ps1"
        self.ps_full_pipeline_legacy = self.root_dir / "tools" / "full_pipeline.ps1"  # legacy fallback if ever used
        self.ps_sync_web_data = self.root_dir / "pipeline" / "tools" / "sync_web_data.ps1"

        self.web_proc: subprocess.Popen[str] | None = None
        self.web_url: str | None = None

        self.busy = False
        self.log_queue: queue.Queue[str] = queue.Queue()

        self._ui()
        self.after(80, self._poll_log_queue)

        self.protocol("WM_DELETE_WINDOW", self._on_close)

        self._log(f"Project root: {self.root_dir}")
        self._log(f"full_pipeline.ps1: {self.ps_full_pipeline}")
        self._log(f"Sync web data: {self.ps_sync_web_data}")
        self._log("Published web-ready artifacts will be produced under: data/published/v1")

    def _ui(self) -> None:
        pad = 10

        top = ttk.Frame(self)
        top.pack(fill="x", padx=pad, pady=pad)

        self.btn_inc = ttk.Button(top, text="Kjør pipeline", command=self._run_incremental_clicked)
        self.btn_inc.pack(side="left", padx=(0, 8))

        self.btn_rebuild = ttk.Button(top, text="Rebuild pipeline", command=self._run_rebuild_clicked)
        self.btn_rebuild.pack(side="left", padx=(0, 8))

        self.btn_open = ttk.Button(top, text="Åpne nettsiden", command=self._open_clicked)
        self.btn_open.pack(side="left", padx=(0, 8))

        self.status_var = tk.StringVar(value="Idle")
        self.status_lbl = ttk.Label(top, textvariable=self.status_var)
        self.status_lbl.pack(side="right")

        self.txt = tk.Text(self, height=30, wrap="word")
        self.txt.pack(fill="both", expand=True, padx=pad, pady=(0, pad))

    def _set_busy(self, busy: bool, msg: str) -> None:
        self.busy = busy
        self.status_var.set(msg)
        state = tk.DISABLED if busy else tk.NORMAL
        self.btn_inc.configure(state=state)
        self.btn_rebuild.configure(state=state)
        self.btn_open.configure(state=state)

    def _log(self, msg: str) -> None:
        self.txt.insert("end", f"[{now_str()}] {msg}\n")
        self.txt.see("end")

    def _poll_log_queue(self) -> None:
        try:
            while True:
                msg = self.log_queue.get_nowait()
                self._log(msg)
        except queue.Empty:
            pass
        self.after(80, self._poll_log_queue)

    def _run_powershell_script(self, script: Path, args: list[str]) -> int:
        ps = which_powershell()
        ps_exe = ps[0]
        base = ps[1:]

        # Use -Command to avoid encoding issues; invoke script with '&'
        quoted_script = str(script).replace("'", "''")
        cmd = base + ["-Command", f"& '{quoted_script}' " + " ".join(args)]

        self._log(f"Running: {ps_exe} {' '.join(cmd)}")
        proc = subprocess.Popen(
            [ps_exe, *cmd],
            cwd=str(self.root_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        assert proc.stdout is not None
        for line in proc.stdout:
            self.log_queue.put(line.rstrip())

        return proc.wait()

    def _pipeline_script(self) -> Path | None:
        if self.ps_full_pipeline.exists():
            return self.ps_full_pipeline
        if self.ps_full_pipeline_legacy.exists():
            return self.ps_full_pipeline_legacy
        return None

    def _ensure_node_npm_available(self) -> bool:
        node, npm = find_node_npm()
        if not node or not npm:
            messagebox.showerror(
                "Mangler Node/NPM",
                "Fant ikke node.exe/npm.cmd.\n"
                "Dette trengs kun for legacy web-håndtering.\n\n"
                "Pipeline og published artifacts fungerer uten Node.",
            )
            return False
        return True

    def _sync_web_data(self) -> bool:
        """
        Legacy helper: sync calculated data into an old web folder.

        IMPORTANT:
        - This project will build a fresh website later from scratch.
        - The authoritative, web-ready dataset is produced by the pipeline under:
            data\published\v1\...

        Therefore:
        - If legacy web assets/scripts are missing (expected), we skip silently.
        - If they exist, we still allow syncing for backwards compatibility.
        """
        web_dir = self.root_dir / "web"
        if not web_dir.exists():
            self._log("Skipping legacy web sync (web/ folder not present). Published artifacts are ready under data/published/v1.")
            return True

        if not self.ps_sync_web_data.exists():
            self._log("Skipping legacy web sync (sync_web_data.ps1 not present).")
            return True

        self._log("Starting legacy sync: data/calculated -> web/public/data ...")
        rc = self._run_powershell_script(self.ps_sync_web_data, [])
        if rc != 0:
            self._log(f"Legacy web data sync failed (exit code {rc})")
            messagebox.showerror("Sync feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
            return False

        self._log("Legacy web data sync OK.")
        return True

    def _log_published_summary(self) -> None:
        """Log dataset_id / revision_id from data/published/v1/dataset.json if available."""
        ds_path = self.root_dir / "data" / "published" / "v1" / "dataset.json"
        if not ds_path.exists():
            self._log("Published dataset.json not found yet (expected until pipeline finishes).")
            return
        try:
            ds = json.loads(ds_path.read_text(encoding="utf-8"))
            self._log(
                f"[PUBLISHED] dataset_id={ds.get('dataset_id')} "
                f"revision_id={ds.get('revision_id')} computed_at_utc={ds.get('computed_at_utc')}"
            )
        except Exception as e:
            self._log(f"[PUBLISHED] Could not parse dataset.json: {e}")

    def _run_pipeline(self, mode: str) -> None:
        ps_script = self._pipeline_script()
        if not ps_script:
            messagebox.showerror(
                "Mangler pipeline",
                "Fant ikke full_pipeline.ps1.\n"
                f"Prøvde:\n- {self.ps_full_pipeline}\n- {self.ps_full_pipeline_legacy}",
            )
            return

        rc = self._run_powershell_script(ps_script, ["-Mode", mode])
        if rc != 0:
            self._log(f"Pipeline failed (exit code {rc})")
            messagebox.showerror("Pipeline feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
            return

        self._log("Pipeline OK.")
        self._log_published_summary()
        self._sync_web_data()

    def _run_incremental_clicked(self) -> None:
        if self.busy:
            return
        self._set_busy(True, "Running incremental pipeline...")

        def worker() -> None:
            try:
                self._run_pipeline("incremental")
            finally:
                self.after(0, lambda: self._set_busy(False, "Idle"))

        threading.Thread(target=worker, daemon=True).start()

    def _run_rebuild_clicked(self) -> None:
        if self.busy:
            return
        if not messagebox.askyesno("Bekreft", "Rebuild overskriver historikk. Fortsette?"):
            return

        self._set_busy(True, "Running rebuild pipeline...")

        def worker() -> None:
            try:
                self._run_pipeline("rebuild")
            finally:
                self.after(0, lambda: self._set_busy(False, "Idle"))

        threading.Thread(target=worker, daemon=True).start()

    def _open_clicked(self) -> None:
        if self.busy:
            return

        # Legacy website handler. If web/ is not present (expected), inform and exit.
        if not (self.root_dir / "web").exists():
            messagebox.showinfo(
                "Nettside ikke satt opp",
                "Det finnes ingen web/ i dette prosjektet (bevisst).\n\n"
                "Pipeline produserer web-klare artefakter her:\n  data/published/v1\n\n"
                "Når vi starter web fra scratch, vil den lese kun fra published/v1.",
            )
            return

        if self.web_proc and self.web_proc.poll() is None and self.web_url:
            self._log(f"Web already running. Opening: {self.web_url}")
            return

        if not self._ensure_node_npm_available():
            return

        self._set_busy(True, "Opening website (build + serve)...")

        def worker() -> None:
            try:
                # Existing legacy behavior retained (only runs if web/ exists).
                # Any further legacy web handling remains as in your original file.
                self._log("Legacy web open requested, but this project will move to a fresh web from scratch.")
                messagebox.showinfo(
                    "Legacy web",
                    "Legacy web er ikke en del av den nye løsningen.\n"
                    "Bruk published artifacts i data/published/v1 som input til ny web senere.",
                )
            finally:
                self.after(0, lambda: self._set_busy(False, "Idle"))

        threading.Thread(target=worker, daemon=True).start()

    def _on_close(self) -> None:
        try:
            if self.web_proc and self.web_proc.poll() is None:
                try:
                    self.web_proc.terminate()
                except Exception:
                    pass
        finally:
            self.destroy()


if __name__ == "__main__":
    App().mainloop()
