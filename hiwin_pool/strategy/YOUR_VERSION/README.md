# strategy/YOUR_VERSION/README.md
# TODO: 同學在此資料夾建立自己的擊球策略版本
# ══════════════════════════════════════════════════════════════════
# 目的：根據視覺資訊（球位置）決定如何擊球
#
# 訊號從哪進：
#   - 輸入：list[interfaces.TableCoord]（球檯座標）
#
# 訊號從哪出：
#   - 輸出：interfaces.StrikeCmd（擊球指令）
#
# ══════════════════════════════════════════════════════════════════
# 可參考：strategy/ 現有實作（若有的話）
#
# 你的版本應該：
#   1. 接收球檯座標（x_mm, y_mm, cue_ball, ...）
#   2. 分析局勢（選擇目標球、擊球方向）
#   3. 計算擊球參數（方向、力道、桿法）
#   4. 回傳 StrikeCmd
#
# 當你完成後，在 config/local_config.py 中設定：
#   STRATEGY_MODULE = "YOUR_VERSION"
# ══════════════════════════════════════════════════════════════════

# ===== 檔案佈局範例 =====
# your_version/
#     __init__.py
#     planner.py        # 主要決策邏輯
#     aim_calulator.py  # 瞄準計算（可選）
#     force_selector.py # 力道選擇（可選）
#     spin_engine.py    # 桿法引擎（可選）
#     README.md         # 本檔案