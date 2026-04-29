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

# HSV 顏色閾值（白球偵測）
# 白球特徵：低彩度（S 低）、高亮度（V 高）
# 注意：待實際測試後調整，目前僅用於初步過濾
# （白球判斷以輪廓面積為主，顏色閾值為輔過濾明顯非白色雜訊）
BALL_COLOR_LOWER = {"h": 0, "s": 0, "v": 180}
BALL_COLOR_UPPER = {"h": 180, "s": 60, "v": 255}

# 白球偵測面積閾值（像素²）
# 小於此面積的輪廓視為雜訊（數字周圍的白斑/反光）
BALL_MIN_AREA = 200
