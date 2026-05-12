#!/bin/bash
# test.sh — 上銀撞球測試腳本
set -e

echo "=== 上銀撞球 — 執行測試 ==="

# 安裝依賴（如果尚未安裝）
# pip install pytest numpy opencv-python --quiet

# 執行 pytest
echo ""
echo "--- Unit Tests ---"
python3 -m pytest tests/ -v --tb=short

echo ""
echo "=== 測試完成 ==="
