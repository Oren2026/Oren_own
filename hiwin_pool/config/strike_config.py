# config/strike_config.py
# 擊球力道參數 — 線性力道 0.0 ~ 1.0

# Arduino 序列設定
# Windows: COM3, COM4 等
# macOS/Linux: /dev/cu.usbmodem14101
ARDUINO_COM = "COM3"   # TODO: 確認
BAUD_RATE = 115200

# 線性力道參數
# 軟體層輸出 0.0 ~ 1.0，Arduino 端做插值
FORCE_MIN = 0.0
FORCE_MAX = 1.0

# 力道對應的實際物理量（Arduino 端參考用）
# velocity: 擊球初速 (m/s)
# pullback: 蓄力距離 (mm)
# hold_time: 蓄力時間 (s)
LINEAR_FORCE_PARAMS = {
    "min_velocity": 0.25,   # force=0.0 對應 0.25 m/s
    "max_velocity": 3.00,   # force=1.0 對應 3.00 m/s
    "min_pullback": 3,       # force=0.0 對應 3mm
    "max_pullback": 30,     # force=1.0 對應 30mm
    "min_hold_time": 0.05,  # force=0.0
    "max_hold_time": 0.60,  # force=1.0
}


def linear_interpolate(force: float) -> dict:
    """
    根據線性力道輸出實際物理參數

    Args:
        force: float 0.0 ~ 1.0
    Returns:
        dict: {"velocity": float, "pullback": float, "hold_time": float}
    """
    force = max(FORCE_MIN, min(FORCE_MAX, force))

    p = LINEAR_FORCE_PARAMS
    velocity = p["min_velocity"] + force * (p["max_velocity"] - p["min_velocity"])
    pullback = p["min_pullback"] + force * (p["max_pullback"] - p["min_pullback"])
    hold_time = p["min_hold_time"] + force * (p["max_hold_time"] - p["min_hold_time"])

    return {
        "velocity": round(velocity, 3),
        "pullback": round(pullback, 1),
        "hold_time": round(hold_time, 3),
    }


# 桿弟機構參數
CUE_LENGTH = 250        # 桿長（mm）
CUE_TIP_RADIUS = 5      # 桿頭半徑（mm）

# 擊球容忍範圍
STRIKE_TOLERANCE = 10   # 桿頭對齊球心的容忍度（mm）

# 擊球後等待球停止的時間（秒）
BALL_SETTLE_TIME = 3.0