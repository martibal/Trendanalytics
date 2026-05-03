@echo off
setlocal
where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found on PATH. Apply track-record-dynamic-days.patch manually.
  exit /b 1
)
git apply track-record-dynamic-days.patch
if errorlevel 1 (
  echo Patch failed. Make sure you run this from the repo root and that src\app\track-record\page.tsx matches the current file structure.
  exit /b 1
)
echo Applied track record dynamic published-days patch.
