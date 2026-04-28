# config/strike_config.py
# 擊球力道參數

# 6 段力道設定
# velocity: 擊球初速（m/s）
# pullback: 蓄力距離（mm）— 馬達拉桿後退的距離
# hold_time: 蓄力時間（秒）
FORCE_LEVELS = {
    1: {"velocity": 0.5, "pullback": 5, "hold_time": 0.1},
    2: {"velocity": 1.0, "pullback": 10, "hold_time": 0.2},
    3: {"velocity": 1.5, "pullback": 15, "hold_time": 0.3},
    4: {"velocity": 2.0, "pullback": 20, "hold_time": 0.4},
    5: {"velocity": 2.5, "pullback": 25, "hold_time": 0.5},
    6: {"velocity": 3.0, "pullback": 30, "hold_time": 0.6},
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
