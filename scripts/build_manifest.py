#!/usr/bin/env python3
"""
Oren_own 檔案索引產生器
用法: python3 build_manifest.py

每次執行時掃描 ~/Desktop/Oren_own/，
產生 ~/.oren_manifest.json（放在 workspace 外，避免進 git）
"""

import json
import os
from pathlib import Path

OREN_OWN = Path.home() / "Desktop" / "Oren_own"
MANIFEST_PATH = Path.home() / ".oren_manifest.json"

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".DS_Store"}
SKIP_FILES = {".DS_Store", ".oren_manifest.json"}

def scan(root: Path) -> dict:
    manifest = {}
    for path in root.rglob("*"):
        # 跳過目錄
        if path.is_dir():
            continue
        # 取得相對路徑
        rel = path.relative_to(root)
        parts = rel.parts
        # 跳過特定目錄下的檔案
        if any(part in SKIP_DIRS for part in parts):
            continue
        # 跳過特定檔案
        if rel.name in SKIP_FILES:
            continue
        # 用相對路徑當 key（避免重名衝突）
        key = str(rel).replace("\\", "/")
        manifest[key] = {
            "logical_name": path.stem,
            "extension": path.suffix,
            "relative_path": key,
            "size_bytes": path.stat().st_size,
        }
    return manifest

def main():
    if not OREN_OWN.exists():
        print(f"錯誤：找不到 {OREN_OWN}")
        return
    manifest = scan(OREN_OWN)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"已產生 {MANIFEST_PATH}")
    print(f"共 {len(manifest)} 個檔案")

if __name__ == "__main__":
    main()
