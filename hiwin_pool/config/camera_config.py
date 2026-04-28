# config/camera_config.py
# Webcam 和校正參數

# Webcam ID（0=第一顆，1=第二顆）
CAM_GLOBAL = 0   # 俯瞰 webcam（球偵測）
CAM_CUE = 1      # 近拍 webcam（桿頭對位）

# 解析度
CAM_WIDTH = 640
CAM_HEIGHT = 480

# 俯瞰 webcam 的透視轉換矩陣（4 點校正後填入）
# 格式：3x3 矩陣，9 個數字
PERSPECTIVE_MATRIX = [
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0
]
# TODO: 執行 camera_calibration.py 產生實際矩陣

# 球檯實際尺寸（mm）
TABLE_WIDTH = 1200    # L120cm
TABLE_HEIGHT = 630    # W63cm

# 球檯原點（在 webcam 中的位置，需量測）
TABLE_ORIGIN_PIXEL = {"x": 0, "y": 0}  # TODO: 校正後填入

# HSV 顏色閾值（綠色球檯背景）
BALL_COLOR_LOWER = {"h": 0, "s": 100, "v": 100}
BALL_COLOR_UPPER = {"h": 10, "s": 255, "v": 255}
