# config/strike_config.py
# 擊球力道參數

# 12 段力道設定（擴充版）
# velocity: 擊球初速（m/s）
# pullback: 蓄力距離（mm）— 馬達拉桿後退的距離
# hold_time: 蓄力時間（秒）
FORCE_LEVELS = {
    1:  {"velocity": 0.25, "pullback": 3,  "hold_time": 0.05},
    2:  {"velocity": 0.50, "pullback": 5,  "hold_time": 0.10},
    3:  {"velocity": 0.75, "pullback": 8,  "hold_time": 0.15},
    4:  {"velocity": 1.00, "pullback": 10, "hold_time": 0.20},
    5:  {"velocity": 1.25, "pullback": 13, "hold_time": 0.25},
    6:  {"velocity": 1.50, "pullback": 15, "hold_time": 0.30},
    7:  {"velocity": 1.75, "pullback": 18, "hold_time": 0.35},
    8:  {"velocity": 2.00, "pullback": 20, "hold_time": 0.40},
    9:  {"velocity": 2.25, "pullback": 23, "hold_time": 0.45},
    10: {"velocity": 2.50, "pullback": 25, "hold_time": 0.50},
    11: {"velocity": 2.75, "pullback": 28, "hold_time": 0.55},
    12: {"velocity": 3.00, "pullback": 30, "hold_time": 0.60},
}

# 力道分組（用於 UI 顯示）
FORCE_GROUPS = {
    "弱": [1, 2, 3, 4],
    "中": [5, 6, 7, 8],
    "強": [9, 10, 11, 12],
}

# Arduino 序列設定
# Windows: COM3, COM4 等
# macOS/Linux: /dev/cu.usbmodem14101
ARDUINO_COM = "COM3"   # TODO: 確認
BAUD_RATE = 115200

# 桿弟機構參數
CUE_LENGTH = 250        # 桿長（mm）
CUE_TIP_RADIUS = 5      # 桿頭半徑（mm）

# 擊球容忍範圍
STRIKE_TOLERANCE = 10   # 桿頭對齊球心的容忍度（mm）

# 擊球後等待球停止的時間（秒）
BALL_SETTLE_TIME = 3.0
