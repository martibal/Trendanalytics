DATA LAYOUT (main/data)

This repo is designed so that ONLY data folders are external/junctioned, while all code lives under main/.

Required structure:
  main\data\raw\
    - bitcoin   -> junction to F:\css_raw\bitcoin
    - ethereum  -> junction to F:\css_raw\ethereum
    - arbitrum  -> junction to F:\css_raw\arbitrum
    - base      -> junction to G:\css_raw\base (or G:\css_raw\base\... depending on your disk layout)

  main\data\calculated\gold\
    - <chain> -> junction to F:\css_json\<chain>

  main\data\calculated\meta\
    - <chain> -> junction to F:\css_json_meta\<chain>  (create F:\css_json_meta first)

Example (run in elevated PowerShell):
  cmd /c mklink /J D:\css\main\data\raw\bitcoin   F:\css_raw\bitcoin
  cmd /c mklink /J D:\css\main\data\raw\ethereum  F:\css_raw\ethereum
  cmd /c mklink /J D:\css\main\data\raw\arbitrum  F:\css_raw\arbitrum
  cmd /c mklink /J D:\css\main\data\raw\base      G:\css_raw\base

  cmd /c mklink /J D:\css\main\data\calculated\gold\bitcoin   F:\css_json\bitcoin
  ...

  mkdir F:\css_json_meta
  cmd /c mklink /J D:\css\main\data\calculated\meta\bitcoin   F:\css_json_meta\bitcoin
  ...

Notes:
- The pipeline writes working artifacts to main\pipeline\_work\ (features, prod/gold parquet, reports, etc.).
- The web UI is served from main\web\dist\ (built by main\web\build.py).
