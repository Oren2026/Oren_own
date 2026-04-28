# config/calibration_data.py
# 校正資料和歷史擊球記錄

import os
import json

# 擊球記錄儲存位置
SHOT_LOG_DIR = os.path.expanduser("~/Desktop/Oren_own/docs/CONTEST/上銀撞球/shot_logs")
os.makedirs(SHOT_LOG_DIR, exist_ok=True)

# 校正參數檔案
CALIBRATION_FILE = os.path.join(SHOT_LOG_DIR, "calibration.json")

# 初始校正參數（還沒校正前的預設值）
INITIAL_CALIBRATION = {
    "force_corrections": {
        str(i): {"factor": 1.0, "velocity_bias": 0.0, "angle_bias": 0.0}
        for i in range(1, 7)
    },
    "last_updated": None,
    "confidence": 0.0,
    "shot_count": 0
}

def load_calibration():
    """載入校正參數"""
    if os.path.exists(CALIBRATION_FILE):
        with open(CALIBRATION_FILE) as f:
            return json.load(f)
    return INITIAL_CALIBRATION.copy()

def save_calibration(data):
    """儲存校正參數"""
    with open(CALIBRATION_FILE, "w") as f:
        json.dump(data, f, indent=2)
    return True

def get_shot_log_path(shot_id):
    """取得特定擊球記錄檔案路徑"""
    return os.path.join(SHOT_LOG_DIR, f"shot_{shot_id:04d}.json")
