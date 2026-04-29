# vision/YOUR_VERSION/README.md
# TODO: 同學在此資料夾建立自己的影像辨識版本
# ══════════════════════════════════════════════════════════════════
# 目的：替換預設 vision/ball_detector.py 的偵測邏輯
#
# 訊號從哪進：
#   - 輸入：raw frame（從 Camera 或 video file）
#
# 訊號從哪出：
#   - 輸出：interfaces.BallPosition（球在畫面中的位置）
#
# ══════════════════════════════════════════════════════════════════
# 可參考：vision/ball_detector.py（預設實作）
#
# 你的版本應該：
#   1. 接收 frame（numpy array）
#   2. 偵測球的位置（使用你的模型/演算法）
#   3. 回傳 BallPosition 列表
#   4. 置信度低於 threshold 時回傳空列表
#
# 當你完成後，在 config/local_config.py 中設定：
#   VISION_MODULE = "YOUR_VERSION"
# ══════════════════════════════════════════════════════════════════

# ===== 檔案佈局範例 =====
# your_version/
#     __init__.py
#     detector.py      # 主要偵測器
#     tracker.py       # 追蹤邏輯（可選）
#     preprocess.py    # 前處理（可選）
#     README.md        # 本檔案