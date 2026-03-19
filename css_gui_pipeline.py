# #!/usr/bin/env python
# from __future__ import annotations

# import time
# import os
# import sys
# import queue
# import shutil
# import threading
# import subprocess
# import re
# from pathlib import Path
# from datetime import datetime
# import json

# import tkinter as tk
# from tkinter import ttk, messagebox


# def now_str() -> str:
#     return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# def which_powershell() -> list[str]:
#     """
#     Returns the executable for PowerShell.
#     NOTE: We intentionally do NOT return '-File' here anymore, because we want to
#     control encoding via '-Command' and then invoke the script with '&'.
#     """
#     candidates = ["powershell.exe", "pwsh.exe"]
#     for c in candidates:
#         p = shutil.which(c)
#         if p:
#             # Use standard non-interactive switches.
#             return [p, "-NoProfile", "-ExecutionPolicy", "Bypass"]
#     return ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass"]


# def find_node_npm() -> tuple[str | None, str | None]:
#     """
#     Robust discovery of node.exe and npm.cmd without relying solely on PATH.
#     """
#     # 1) PATH
#     node = shutil.which("node.exe") or shutil.which("node")
#     npm = shutil.which("npm.cmd") or shutil.which("npm")

#     if node and npm:
#         return node, npm

#     # 2) Common install locations
#     candidates = [
#         Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "nodejs",
#         Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "nodejs",
#         Path(os.environ.get("LOCALAPPDATA", r"C:\Users\%USERNAME%\AppData\Local")) / "Programs" / "nodejs",
#     ]

#     for d in candidates:
#         if d.exists():
#             n = d / "node.exe"
#             m = d / "npm.cmd"
#             if n.exists() and m.exists():
#                 return str(n), str(m)

#     return None, None


# class App(tk.Tk):
#     def __init__(self) -> None:
#         super().__init__()
#         self.title("CSS Pipeline GUI")
#         self.geometry("980x620")

#         self.root_dir = Path(__file__).resolve().parent

#         # scripts
#         self.ps_full_pipeline = self.root_dir / "pipeline" / "tools" / "full_pipeline.ps1"
#         self.ps_full_pipeline_legacy = self.root_dir / "tools" / "full_pipeline.ps1"  # legacy fallback if ever used
#         self.ps_sync_web_data = self.root_dir / "pipeline" / "tools" / "sync_web_data.ps1"

#         self.web_proc: subprocess.Popen[str] | None = None
#         self.web_url: str | None = None

#         self.busy = False
#         self.log_queue: queue.Queue[str] = queue.Queue()

#         self._ui()
#         self.after(80, self._poll_log_queue)

#         self.protocol("WM_DELETE_WINDOW", self._on_close)

#         self._log(f"Project root: {self.root_dir}")
#         self._log(f"full_pipeline.ps1: {self.ps_full_pipeline}")
#         self._log(f"Sync web data: {self.ps_sync_web_data}")
#         self._log("Published web-ready artifacts will be produced under: data/published/v1")

#     def _ui(self) -> None:
#         pad = 10

#         top = ttk.Frame(self)
#         top.pack(fill="x", padx=pad, pady=pad)

#         self.btn_inc = ttk.Button(top, text="Kjør pipeline", command=self._run_incremental_clicked)
#         self.btn_inc.pack(side="left", padx=(0, 8))

#         self.btn_rebuild = ttk.Button(top, text="Rebuild pipeline", command=self._run_rebuild_clicked)
#         self.btn_rebuild.pack(side="left", padx=(0, 8))

#         self.btn_open = ttk.Button(top, text="Åpne nettsiden", command=self._open_clicked)
#         self.btn_open.pack(side="left", padx=(0, 8))

#         self.status_var = tk.StringVar(value="Idle")
#         self.status_lbl = ttk.Label(top, textvariable=self.status_var)
#         self.status_lbl.pack(side="right")

#         self.txt = tk.Text(self, height=30, wrap="word")
#         self.txt.pack(fill="both", expand=True, padx=pad, pady=(0, pad))

#     def _set_busy(self, busy: bool, msg: str) -> None:
#         self.busy = busy
#         self.status_var.set(msg)
#         state = tk.DISABLED if busy else tk.NORMAL
#         self.btn_inc.configure(state=state)
#         self.btn_rebuild.configure(state=state)
#         self.btn_open.configure(state=state)

#     def _log(self, msg: str) -> None:
#         self.txt.insert("end", f"[{now_str()}] {msg}\n")
#         self.txt.see("end")

#     def _poll_log_queue(self) -> None:
#         try:
#             while True:
#                 msg = self.log_queue.get_nowait()
#                 self._log(msg)
#         except queue.Empty:
#             pass
#         self.after(80, self._poll_log_queue)

#     def _run_powershell_script(self, script: Path, args: list[str]) -> int:
#         ps = which_powershell()
#         ps_exe = ps[0]
#         base = ps[1:]

#         # Use -Command to avoid encoding issues; invoke script with '&'
#         quoted_script = str(script).replace("'", "''")
#         cmd = base + ["-Command", f"& '{quoted_script}' " + " ".join(args)]

#         self._log(f"Running: {ps_exe} {' '.join(cmd)}")
#         proc = subprocess.Popen(
#             [ps_exe, *cmd],
#             cwd=str(self.root_dir),
#             stdout=subprocess.PIPE,
#             stderr=subprocess.STDOUT,
#             text=True,
#             encoding="utf-8",
#             errors="replace",
#         )
#         assert proc.stdout is not None
#         for line in proc.stdout:
#             self.log_queue.put(line.rstrip())

#         return proc.wait()

#     def _pipeline_script(self) -> Path | None:
#         if self.ps_full_pipeline.exists():
#             return self.ps_full_pipeline
#         if self.ps_full_pipeline_legacy.exists():
#             return self.ps_full_pipeline_legacy
#         return None

#     def _ensure_node_npm_available(self) -> bool:
#         node, npm = find_node_npm()
#         if not node or not npm:
#             messagebox.showerror(
#                 "Mangler Node/NPM",
#                 "Fant ikke node.exe/npm.cmd.\n"
#                 "Dette trengs kun for legacy web-håndtering.\n\n"
#                 "Pipeline og published artifacts fungerer uten Node.",
#             )
#             return False
#         return True

#     def _sync_web_data(self) -> bool:
#         """Sync published artifacts into the Next.js public data folder.

#         This project’s authoritative dataset is produced under:
#           data\published\v1

#         The website (web-v1) reads from:
#           web-v1\public\data\published\v1

#         For backwards compatibility, we also support a legacy:
#           web\public\data\published\v1

#         The sync script itself decides which web folder to use (web-v1 preferred).
#         """
#         if not self.ps_sync_web_data.exists():
#             self._log("Skipping web sync (pipeline/tools/sync_web_data.ps1 not present).")
#             return True

#         # Only attempt sync if at least one known web folder exists.
#         if not ((self.root_dir / "web-v1").exists() or (self.root_dir / "web").exists()):
#             self._log("Skipping web sync (no web-v1/ or web/ folder present). Published artifacts are ready under data/published/v1.")
#             return True

#         self._log("Syncing published dataset -> web public folder ...")
#         rc = self._run_powershell_script(self.ps_sync_web_data, ["-Root", str(self.root_dir)])
#         if rc != 0:
#             self._log(f"Web data sync failed (exit code {rc})")
#             messagebox.showerror("Sync feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
#             return False

#         self._log("Web data sync OK.")
#         return True

#     def _log_published_summary(self) -> None:
#         """Log dataset_id / revision_id from data/published/v1/dataset.json if available."""
#         ds_path = self.root_dir / "data" / "published" / "v1" / "dataset.json"
#         if not ds_path.exists():
#             self._log("Published dataset.json not found yet (expected until pipeline finishes).")
#             return
#         try:
#             ds = json.loads(ds_path.read_text(encoding="utf-8"))
#             self._log(
#                 f"[PUBLISHED] dataset_id={ds.get('dataset_id')} "
#                 f"revision_id={ds.get('revision_id')} computed_at_utc={ds.get('computed_at_utc')}"
#             )
#         except Exception as e:
#             self._log(f"[PUBLISHED] Could not parse dataset.json: {e}")

#     def _run_pipeline(self, mode: str) -> None:
#         ps_script = self._pipeline_script()
#         if not ps_script:
#             messagebox.showerror(
#                 "Mangler pipeline",
#                 "Fant ikke full_pipeline.ps1.\n"
#                 f"Prøvde:\n- {self.ps_full_pipeline}\n- {self.ps_full_pipeline_legacy}",
#             )
#             return

#         rc = self._run_powershell_script(ps_script, ["-Mode", mode])
#         if rc != 0:
#             self._log(f"Pipeline failed (exit code {rc})")
#             messagebox.showerror("Pipeline feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
#             return

#         self._log("Pipeline OK.")
#         self._log_published_summary()
#         self._sync_web_data()

#     def _run_incremental_clicked(self) -> None:
#         if self.busy:
#             return
#         self._set_busy(True, "Running incremental pipeline...")

#         def worker() -> None:
#             try:
#                 self._run_pipeline("incremental")
#             finally:
#                 self.after(0, lambda: self._set_busy(False, "Idle"))

#         threading.Thread(target=worker, daemon=True).start()

#     def _run_rebuild_clicked(self) -> None:
#         if self.busy:
#             return
#         if not messagebox.askyesno("Bekreft", "Rebuild overskriver historikk. Fortsette?"):
#             return

#         self._set_busy(True, "Running rebuild pipeline...")

#         def worker() -> None:
#             try:
#                 self._run_pipeline("rebuild")
#             finally:
#                 self.after(0, lambda: self._set_busy(False, "Idle"))

#         threading.Thread(target=worker, daemon=True).start()

#     def _open_clicked(self) -> None:
#         if self.busy:
#             return

#         # If no website folder exists, inform and exit.
#         if not ((self.root_dir / "web-v1").exists() or (self.root_dir / "web").exists()):
#             messagebox.showinfo(
#                 "Nettside ikke satt opp",
#                 "Fant ingen web-v1/ eller web/ i dette prosjektet.\n\n"
#                 "Pipeline produserer web-klare artefakter her:\n  data/published/v1\n\n"
#                 "Nettsiden leser fra:\n  web-v1/public/data/published/v1\n"
#                 "(via sync_web_data.ps1).",
#             )
#             return

#         if self.web_proc and self.web_proc.poll() is None and self.web_url:
#             self._log(f"Web already running. Opening: {self.web_url}")
#             return

#         if not self._ensure_node_npm_available():
#             return

#         self._set_busy(True, "Opening website (build + serve)...")

#         def worker() -> None:
#             try:
#                 # Existing legacy behavior retained (only runs if web/ exists).
#                 # Any further legacy web handling remains as in your original file.
#                 self._log("Web open requested. (This GUI currently keeps web start separate from data pipeline.)")
#                 messagebox.showinfo(
#                     "Web start",
#                     "Start web (Next.js) via ditt vanlige web-v1-oppsett (npm dev/build).\n"
#                     "Data blir synket automatisk etter pipeline-run.",
#                 )
#             finally:
#                 self.after(0, lambda: self._set_busy(False, "Idle"))

#         threading.Thread(target=worker, daemon=True).start()

#     def _on_close(self) -> None:
#         try:
#             if self.web_proc and self.web_proc.poll() is None:
#                 try:
#                     self.web_proc.terminate()
#                 except Exception:
#                     pass
#         finally:
#             self.destroy()


# if __name__ == "__main__":
#     App().mainloop()

#!/usr/bin/env python

#!/usr/bin/env python


# v2


# from __future__ import annotations

# import time
# import os
# import sys
# import queue
# import shutil
# import threading
# import subprocess
# import re
# from pathlib import Path
# from datetime import datetime
# import json

# import tkinter as tk
# from tkinter import ttk, messagebox


# def now_str() -> str:
#     return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# def which_powershell() -> list[str]:
#     """
#     Returns the executable for PowerShell.
#     NOTE: We intentionally do NOT return '-File' here anymore, because we want to
#     control encoding via '-Command' and then invoke the script with '&'.
#     """
#     candidates = ["powershell.exe", "pwsh.exe"]
#     for c in candidates:
#         p = shutil.which(c)
#         if p:
#             # Use standard non-interactive switches.
#             return [p, "-NoProfile", "-ExecutionPolicy", "Bypass"]
#     return ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass"]


# def find_node_npm() -> tuple[str | None, str | None]:
#     """
#     Robust discovery of node.exe and npm.cmd without relying solely on PATH.
#     """
#     # 1) PATH
#     node = shutil.which("node.exe") or shutil.which("node")
#     npm = shutil.which("npm.cmd") or shutil.which("npm")

#     if node and npm:
#         return node, npm

#     # 2) Common Windows install locations (best-effort)
#     candidates = []
#     program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
#     program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")

#     # Node installer default
#     candidates.append(Path(program_files) / "nodejs")
#     candidates.append(Path(program_files_x86) / "nodejs")

#     # NVM for Windows common
#     candidates.append(Path(os.environ.get("NVM_HOME", r"C:\Program Files\nvm")))
#     candidates.append(Path(os.environ.get("NVM_SYMLINK", r"C:\Program Files\nodejs")))

#     for base in candidates:
#         n = base / "node.exe"
#         n2 = base / "node"
#         npm1 = base / "npm.cmd"
#         npm2 = base / "npm"
#         found_node = str(n) if n.exists() else (str(n2) if n2.exists() else None)
#         found_npm = str(npm1) if npm1.exists() else (str(npm2) if npm2.exists() else None)
#         if found_node and found_npm:
#             return found_node, found_npm

#     return None, None


# class App(tk.Tk):
#     def __init__(self) -> None:
#         super().__init__()
#         self.title("CSS Pipeline GUI")
#         self.geometry("980x620")

#         self.root_dir = Path(__file__).resolve().parent

#         # scripts
#         self.ps_full_pipeline = self.root_dir / "pipeline" / "tools" / "full_pipeline.ps1"
#         self.ps_full_pipeline_legacy = self.root_dir / "tools" / "full_pipeline.ps1"  # legacy fallback if ever used
#         self.ps_sync_web_data = self.root_dir / "pipeline" / "tools" / "sync_web_data.ps1"

#         # meta-only tools (WebEkstra)
#         self.py_rebuild_meta_only = self.root_dir / "pipeline" / "tools" / "rebuild_meta_only.py"
#         self.py_publish_meta_only = self.root_dir / "pipeline" / "tools" / "publish_meta_only.py"

#         self.web_proc: subprocess.Popen[str] | None = None
#         self.web_url: str | None = None

#         self.busy = False
#         self.log_queue: queue.Queue[str] = queue.Queue()

#         self._ui()
#         self.after(80, self._poll_log_queue)

#         self.protocol("WM_DELETE_WINDOW", self._on_close)

#         self._log(f"Project root: {self.root_dir}")
#         self._log(f"full_pipeline.ps1: {self.ps_full_pipeline}")
#         self._log(f"Sync web data: {self.ps_sync_web_data}")
#         self._log(f"rebuild_meta_only.py: {self.py_rebuild_meta_only}")
#         self._log(f"publish_meta_only.py: {self.py_publish_meta_only}")
#         self._log("Published web-ready artifacts will be produced under: data/published/v1")

#     def _ui(self) -> None:
#         pad = 10

#         top = ttk.Frame(self)
#         top.pack(fill="x", padx=pad, pady=pad)

#         self.btn_inc = ttk.Button(top, text="Kjør pipeline", command=self._run_incremental_clicked)
#         self.btn_inc.pack(side="left", padx=(0, 8))

#         self.btn_rebuild = ttk.Button(top, text="Rebuild pipeline", command=self._run_rebuild_clicked)
#         self.btn_rebuild.pack(side="left", padx=(0, 8))

#         self.btn_meta_history = ttk.Button(top, text="Rebuild META (History)", command=self._run_meta_history_clicked)
#         self.btn_meta_history.pack(side="left", padx=(0, 8))

#         self.btn_open = ttk.Button(top, text="Åpne nettsiden", command=self._open_clicked)
#         self.btn_open.pack(side="left", padx=(0, 8))

#         self.status_var = tk.StringVar(value="Idle")
#         self.status_lbl = ttk.Label(top, textvariable=self.status_var)
#         self.status_lbl.pack(side="right")

#         self.txt = tk.Text(self, height=30, wrap="word")
#         self.txt.pack(fill="both", expand=True, padx=pad, pady=(0, pad))

#     def _set_busy(self, busy: bool, msg: str) -> None:
#         self.busy = busy
#         self.status_var.set(msg)
#         state = tk.DISABLED if busy else tk.NORMAL
#         self.btn_inc.configure(state=state)
#         self.btn_rebuild.configure(state=state)
#         self.btn_meta_history.configure(state=state)
#         self.btn_open.configure(state=state)

#     def _log(self, msg: str) -> None:
#         self.txt.insert("end", f"[{now_str()}] {msg}\n")
#         self.txt.see("end")

#     def _poll_log_queue(self) -> None:
#         try:
#             while True:
#                 msg = self.log_queue.get_nowait()
#                 self._log(msg)
#         except queue.Empty:
#             pass
#         self.after(80, self._poll_log_queue)

#     def _run_powershell_script(self, script: Path, args: list[str]) -> int:
#         ps = which_powershell()
#         ps_exe = ps[0]
#         base = ps[1:]

#         # Use -Command to avoid encoding issues; invoke script with '&'
#         quoted_script = str(script).replace("'", "''")
#         cmd = base + ["-Command", f"& '{quoted_script}' " + " ".join(args)]

#         self._log(f"Running: {ps_exe} {' '.join(cmd)}")
#         proc = subprocess.Popen(
#             [ps_exe, *cmd],
#             cwd=str(self.root_dir),
#             stdout=subprocess.PIPE,
#             stderr=subprocess.STDOUT,
#             text=True,
#             encoding="utf-8",
#             errors="replace",
#         )
#         assert proc.stdout is not None
#         for line in proc.stdout:
#             self.log_queue.put(line.rstrip())

#         return proc.wait()

#     def _run_python_script(self, script: Path, args: list[str]) -> int:
#         py = sys.executable or "python"
#         cmd = [py, str(script), *args]

#         self._log(f"Running: {' '.join(cmd)}")
#         proc = subprocess.Popen(
#             cmd,
#             cwd=str(self.root_dir),
#             stdout=subprocess.PIPE,
#             stderr=subprocess.STDOUT,
#             text=True,
#             encoding="utf-8",
#             errors="replace",
#         )
#         assert proc.stdout is not None
#         for line in proc.stdout:
#             self.log_queue.put(line.rstrip())

#         return proc.wait()

#     def _pipeline_script(self) -> Path | None:
#         if self.ps_full_pipeline.exists():
#             return self.ps_full_pipeline
#         if self.ps_full_pipeline_legacy.exists():
#             return self.ps_full_pipeline_legacy
#         return None

#     def _ensure_node_npm_available(self) -> bool:
#         node, npm = find_node_npm()
#         if not node or not npm:
#             messagebox.showerror(
#                 "Mangler Node/NPM",
#                 "Fant ikke node.exe/npm.cmd.\n"
#                 "Dette trengs kun for legacy web-håndtering.\n\n"
#                 "Pipeline og published artifacts fungerer uten Node.",
#             )
#             return False
#         return True

#     def _sync_web_data(self) -> bool:
#         """Sync published artifacts into the Next.js public data folder.

#         This project’s authoritative dataset is produced under:
#           data\published\v1

#         The website (web-v1) reads from:
#           web-v1\public\data\published\v1

#         For backwards compatibility, we also support a legacy:
#           web\public\data\published\v1

#         The sync script itself decides which web folder to use (web-v1 preferred).
#         """
#         if not self.ps_sync_web_data.exists():
#             self._log("Skipping web sync (pipeline/tools/sync_web_data.ps1 not present).")
#             return True

#         # Only attempt sync if at least one known web folder exists.
#         if not ((self.root_dir / "web-v1").exists() or (self.root_dir / "web").exists()):
#             self._log(
#                 "Skipping web sync (no web-v1/ or web/ folder present). Published artifacts are ready under data/published/v1."
#             )
#             return True

#         self._log("Syncing published dataset -> web public folder ...")
#         rc = self._run_powershell_script(self.ps_sync_web_data, ["-Root", str(self.root_dir)])
#         if rc != 0:
#             self._log(f"Web data sync failed (exit code {rc})")
#             messagebox.showerror("Sync feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
#             return False

#         self._log("Web data sync OK.")
#         return True

#     def _log_published_summary(self) -> None:
#         """Log dataset_id / revision_id from data/published/v1/dataset.json if available."""
#         ds_path = self.root_dir / "data" / "published" / "v1" / "dataset.json"
#         if not ds_path.exists():
#             self._log("Published dataset.json not found yet (expected until pipeline finishes).")
#             return
#         try:
#             ds = json.loads(ds_path.read_text(encoding="utf-8"))
#             self._log(
#                 f"[PUBLISHED] dataset_id={ds.get('dataset_id')} "
#                 f"revision_id={ds.get('revision_id')} computed_at_utc={ds.get('computed_at_utc')}"
#             )
#         except Exception as e:
#             self._log(f"[PUBLISHED] Could not parse dataset.json: {e}")

#     def _run_pipeline(self, mode: str) -> None:
#         ps_script = self._pipeline_script()
#         if not ps_script:
#             messagebox.showerror(
#                 "Mangler pipeline",
#                 "Fant ikke full_pipeline.ps1.\n"
#                 f"Prøvde:\n- {self.ps_full_pipeline}\n- {self.ps_full_pipeline_legacy}",
#             )
#             return

#         rc = self._run_powershell_script(ps_script, ["-Mode", mode])
#         if rc != 0:
#             self._log(f"Pipeline failed (exit code {rc})")
#             messagebox.showerror("Pipeline feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
#             return

#         self._log("Pipeline OK.")
#         self._log_published_summary()
#         self._sync_web_data()

#     def _run_incremental_clicked(self) -> None:
#         if self.busy:
#             return
#         self._set_busy(True, "Running incremental pipeline...")

#         def worker() -> None:
#             try:
#                 self._run_pipeline("incremental")
#             finally:
#                 self.after(0, lambda: self._set_busy(False, "Idle"))

#         threading.Thread(target=worker, daemon=True).start()

#     def _run_rebuild_clicked(self) -> None:
#         if self.busy:
#             return
#         if not messagebox.askyesno("Bekreft", "Rebuild overskriver historikk. Fortsette?"):
#             return

#         self._set_busy(True, "Running rebuild pipeline...")

#         def worker() -> None:
#             try:
#                 self._run_pipeline("rebuild")
#             finally:
#                 self.after(0, lambda: self._set_busy(False, "Idle"))

#         threading.Thread(target=worker, daemon=True).start()

#     def _run_meta_history_clicked(self) -> None:
#         if self.busy:
#             return

#         if not self.py_rebuild_meta_only.exists():
#             messagebox.showerror(
#                 "Mangler script",
#                 f"""Fant ikke rebuild_meta_only.py.

# Forventet:
# {self.py_rebuild_meta_only}

# Dette scriptet er et WebEkstra-krav (meta-only rebuild uten full pipeline).""",
#             )
#             return

#         if not messagebox.askyesno(
#             "Bekreft",
#             """Dette vil rebuild'e META-historikk (uten å re-kjøre gold/derived).
# Output skrives til data/calculated/meta.

# Fortsette?""",
#         ):
#             return

#         do_publish = messagebox.askyesno(
#             "Publiser META også?",
#             """Ønsker du også å publisere META (update data/published/v1) etter rebuild?

# Dette vil kun publishe META, ikke gold/derived.""",
#         )

#         self._set_busy(True, "Rebuilding META history...")

#         def worker() -> None:
#             try:
#                 self._log("=== META ONLY: rebuild history ===")
#                 rc = self._run_python_script(self.py_rebuild_meta_only, [])
#                 if rc != 0:
#                     self._log(f"META history rebuild failed (exit code {rc})")
#                     messagebox.showerror("META rebuild feilet", f"""Exit code: {rc}\nSe loggen for detaljer.""")
#                     return

#                 self._log("META history rebuild OK (data/calculated/meta).")

#                 if do_publish:
#                     if not self.py_publish_meta_only.exists():
#                         messagebox.showerror(
#                             "Mangler publish-script",
#                             f"""Fant ikke publish_meta_only.py.

# Forventet:
# {self.py_publish_meta_only}

# Dette scriptet er et WebEkstra-krav (meta-only publish).""",
#                         )
#                         return

#                     self._log("=== META ONLY: publish ===")
#                     rc2 = self._run_python_script(self.py_publish_meta_only, [])
#                     if rc2 != 0:
#                         self._log(f"META publish failed (exit code {rc2})")
#                         messagebox.showerror("META publish feilet", f"""Exit code: {rc2}\nSe loggen for detaljer.""")
#                         return

#                     self._log("META publish OK (data/published/v1).")
#                     self._log_published_summary()
#                     self._sync_web_data()

#             finally:
#                 self.after(0, lambda: self._set_busy(False, "Idle"))

#         threading.Thread(target=worker, daemon=True).start()

#     def _open_clicked(self) -> None:
#         if self.busy:
#             return

#         # If no website folder exists, inform and exit.
#         if not ((self.root_dir / "web-v1").exists() or (self.root_dir / "web").exists()):
#             messagebox.showinfo(
#                 "Nettside ikke satt opp",
#                 "Fant ingen web-v1/ eller web/ i dette prosjektet.\n\n"
#                 "Pipeline produserer web-klare artefakter her:\n  data/published/v1\n\n"
#                 "Nettsiden leser fra:\n  web-v1/public/data/published/v1\n"
#                 "(via sync_web_data.ps1).",
#             )
#             return

#         if self.web_proc and self.web_proc.poll() is None and self.web_url:
#             self._log(f"Web already running. Opening: {self.web_url}")
#             return

#         if not self._ensure_node_npm_available():
#             return

#         self._set_busy(True, "Opening website (build + serve)...")

#         def worker() -> None:
#             try:
#                 # Existing legacy behavior retained (only runs if web/ exists).
#                 # Any further legacy web handling remains as in your original file.
#                 self._log("Web open requested. (This GUI currently keeps web start separate from data pipeline.)")
#                 messagebox.showinfo(
#                     "Web start",
#                     "Start web (Next.js) via ditt vanlige web-v1-oppsett (npm dev/build).\n"
#                     "Data blir synket automatisk etter pipeline-run.",
#                 )
#             finally:
#                 self.after(0, lambda: self._set_busy(False, "Idle"))

#         threading.Thread(target=worker, daemon=True).start()

#     def _on_close(self) -> None:
#         try:
#             if self.web_proc and self.web_proc.poll() is None:
#                 try:
#                     self.web_proc.terminate()
#                 except Exception:
#                     pass
#         finally:
#             self.destroy()


# if __name__ == "__main__":
#     App().mainloop()


#!/usr/bin/env python
from __future__ import annotations

import os
import queue
import shutil
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path
import json

import tkinter as tk
from tkinter import ttk, messagebox


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def which_powershell() -> list[str]:
    candidates = ["powershell.exe", "pwsh.exe"]
    for c in candidates:
        p = shutil.which(c)
        if p:
            return [p, "-NoProfile", "-ExecutionPolicy", "Bypass"]
    return ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass"]


def find_node_npm() -> tuple[str | None, str | None]:
    node = shutil.which("node.exe") or shutil.which("node")
    npm = shutil.which("npm.cmd") or shutil.which("npm")

    if node and npm:
        return node, npm

    candidates = []
    program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")

    candidates.append(Path(program_files) / "nodejs")
    candidates.append(Path(program_files_x86) / "nodejs")
    candidates.append(Path(os.environ.get("NVM_HOME", r"C:\Program Files\nvm")))
    candidates.append(Path(os.environ.get("NVM_SYMLINK", r"C:\Program Files\nodejs")))

    for base in candidates:
        n = base / "node.exe"
        n2 = base / "node"
        npm1 = base / "npm.cmd"
        npm2 = base / "npm"
        found_node = str(n) if n.exists() else (str(n2) if n2.exists() else None)
        found_npm = str(npm1) if npm1.exists() else (str(npm2) if npm2.exists() else None)
        if found_node and found_npm:
            return found_node, found_npm

    return None, None


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("CSS Pipeline GUI")
        self.geometry("980x620")

        self.root_dir = Path(__file__).resolve().parent

        self.ps_full_pipeline = self.root_dir / "pipeline" / "tools" / "full_pipeline.ps1"
        self.ps_full_pipeline_legacy = self.root_dir / "tools" / "full_pipeline.ps1"
        self.ps_sync_web_data = self.root_dir / "pipeline" / "tools" / "sync_web_data.ps1"

        self.ps_daily_pipeline = self.root_dir / "run-daily-pipeline.ps1"
        self.ps_publish_web_data = self.root_dir / "publish-web-data.ps1"

        self.py_rebuild_meta_only = self.root_dir / "pipeline" / "tools" / "rebuild_meta_only.py"
        self.py_publish_meta_only = self.root_dir / "pipeline" / "tools" / "publish_meta_only.py"

        self.web_proc: subprocess.Popen[str] | None = None
        self.web_url: str | None = None

        self.busy = False
        self.log_queue: queue.Queue[str] = queue.Queue()

        self._ui()
        self.after(80, self._poll_log_queue)

        self.protocol("WM_DELETE_WINDOW", self._on_close)

        self._log(f"Project root: {self.root_dir}")
        self._log(f"run-daily-pipeline.ps1: {self.ps_daily_pipeline}")
        self._log(f"full_pipeline.ps1: {self.ps_full_pipeline}")
        self._log(f"publish-web-data.ps1: {self.ps_publish_web_data}")
        self._log(f"sync_web_data.ps1 (legacy): {self.ps_sync_web_data}")
        self._log(f"rebuild_meta_only.py: {self.py_rebuild_meta_only}")
        self._log(f"publish_meta_only.py: {self.py_publish_meta_only}")
        self._log("Daglig pipeline-knapp bruker nå run-daily-pipeline.ps1 (incremental only).")
        self._log("Rebuild-knappen er fortsatt manuell backup via full_pipeline.ps1.")
        self._log("Published web-ready artifacts will be produced under: data/published/v1")

    def _ui(self) -> None:
        pad = 10

        top = ttk.Frame(self)
        top.pack(fill="x", padx=pad, pady=pad)

        self.btn_inc = ttk.Button(top, text="Kjør pipeline", command=self._run_incremental_clicked)
        self.btn_inc.pack(side="left", padx=(0, 8))

        self.btn_rebuild = ttk.Button(top, text="Rebuild pipeline", command=self._run_rebuild_clicked)
        self.btn_rebuild.pack(side="left", padx=(0, 8))

        self.btn_meta_history = ttk.Button(top, text="Rebuild META (History)", command=self._run_meta_history_clicked)
        self.btn_meta_history.pack(side="left", padx=(0, 8))

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
        self.btn_meta_history.configure(state=state)
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

        quoted_script = str(script).replace("'", "''")
        joined_args = " ".join(args)
        cmd = base + ["-Command", f"& '{quoted_script}' {joined_args}".strip()]

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

    def _run_python_script(self, script: Path, args: list[str]) -> int:
        py = sys.executable or "python"
        cmd = [py, str(script), *args]

        self._log(f"Running: {' '.join(cmd)}")
        proc = subprocess.Popen(
            cmd,
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
        if not self.ps_sync_web_data.exists():
            self._log("Skipping web sync (pipeline/tools/sync_web_data.ps1 not present).")
            return True

        if not ((self.root_dir / "web-v1").exists() or (self.root_dir / "web").exists()):
            self._log(
                "Skipping web sync (no web-v1/ or web/ folder present). Published artifacts are ready under data/published/v1."
            )
            return True

        self._log("Syncing published dataset -> web public folder ...")
        rc = self._run_powershell_script(self.ps_sync_web_data, ["-Root", str(self.root_dir)])
        if rc != 0:
            self._log(f"Web data sync failed (exit code {rc})")
            messagebox.showerror("Sync feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
            return False

        self._log("Web data sync OK.")
        return True

    def _log_published_summary(self) -> None:
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

    def _run_daily_incremental(self) -> None:
        if not self.ps_daily_pipeline.exists():
            messagebox.showerror(
                "Mangler daglig wrapper",
                f"Fant ikke run-daily-pipeline.ps1.\n\nForventet:\n{self.ps_daily_pipeline}"
            )
            return

        rc = self._run_powershell_script(self.ps_daily_pipeline, [])
        if rc != 0:
            self._log(f"Daily incremental pipeline failed (exit code {rc})")
            messagebox.showerror("Daglig pipeline feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
            return

        self._log("Daily incremental pipeline + publish OK.")

    def _run_incremental_clicked(self) -> None:
        if self.busy:
            return
        self._set_busy(True, "Running daily incremental pipeline...")

        def worker() -> None:
            try:
                self._run_daily_incremental()
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

    def _run_meta_history_clicked(self) -> None:
        if self.busy:
            return

        if not self.py_rebuild_meta_only.exists():
            messagebox.showerror(
                "Mangler script",
                f"""Fant ikke rebuild_meta_only.py.

Forventet:
{self.py_rebuild_meta_only}

Dette scriptet er et WebEkstra-krav (meta-only rebuild uten full pipeline).""",
            )
            return

        if not messagebox.askyesno(
            "Bekreft",
            """Dette vil rebuild'e META-historikk (uten å re-kjøre gold/derived).
Output skrives til data/calculated/meta.

Fortsette?""",
        ):
            return

        do_publish = messagebox.askyesno(
            "Publiser META også?",
            """Ønsker du også å publisere META (update data/published/v1) etter rebuild?

Dette vil kun publishe META, ikke gold/derived.""",
        )

        self._set_busy(True, "Rebuilding META history...")

        def worker() -> None:
            try:
                self._log("=== META ONLY: rebuild history ===")
                rc = self._run_python_script(self.py_rebuild_meta_only, [])
                if rc != 0:
                    self._log(f"META history rebuild failed (exit code {rc})")
                    messagebox.showerror("META rebuild feilet", f"Exit code: {rc}\nSe loggen for detaljer.")
                    return

                self._log("META history rebuild OK (data/calculated/meta).")

                if do_publish:
                    if not self.py_publish_meta_only.exists():
                        messagebox.showerror(
                            "Mangler publish-script",
                            f"""Fant ikke publish_meta_only.py.

Forventet:
{self.py_publish_meta_only}

Dette scriptet er et WebEkstra-krav (meta-only publish).""",
                        )
                        return

                    self._log("=== META ONLY: publish ===")
                    rc2 = self._run_python_script(self.py_publish_meta_only, [])
                    if rc2 != 0:
                        self._log(f"META publish failed (exit code {rc2})")
                        messagebox.showerror("META publish feilet", f"Exit code: {rc2}\nSe loggen for detaljer.")
                        return

                    self._log("META publish OK (data/published/v1).")
                    self._log_published_summary()
                    self._sync_web_data()

            finally:
                self.after(0, lambda: self._set_busy(False, "Idle"))

        threading.Thread(target=worker, daemon=True).start()

    def _open_clicked(self) -> None:
        if self.busy:
            return

        if not ((self.root_dir / "web-v1").exists() or (self.root_dir / "web").exists()):
            messagebox.showinfo(
                "Nettside ikke satt opp",
                "Fant ingen web-v1/ eller web/ i dette prosjektet.\n\n"
                "Pipeline produserer web-klare artefakter her:\n  data/published/v1\n\n"
                "Nettsiden leser fra:\n  web-v1/public/data/published/v1\n"
                "(via sync_web_data.ps1).",
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
                self._log("Web open requested. (This GUI currently keeps web start separate from data pipeline.)")
                messagebox.showinfo(
                    "Web start",
                    "Start web (Next.js) via ditt vanlige web-v1-oppsett (npm dev/build).\n"
                    "Data blir publisert til repo/Vercel via den daglige incremental-wrapperen.",
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