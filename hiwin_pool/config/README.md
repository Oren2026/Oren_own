# Config 模組

所有設定參數，修改這裡即可調整系統行為。

---

## arm_config.py

**手臂 IP 和姿態設定**

```python
# TODO: 確認實際 IP
HIWIN_IP = "192.168.1.100"
HIWIN_PORT = 5000

# 手臂工作空間限制（mm）
WORK_SPACE_LIMITS = {
    "x": {"min": -500, "max": 500},
    "y": {"min": -500, "max": 500},
    "z": {"min": 0, "max": 600},
}

# 禁區（避免手臂本體撞到球檯）
FORBIDDEN_ZONES = [
    {"x": (0, 300), "y": (0, 200), "z": (0, 300)},  # 球檯區域
]

# 安全高度（mm）
SAFE_Z_HEIGHT = 200        # 移動時的懸停高度
STRIKE_Z_HEIGHT = 50       # 擊球時下降到的，高度（視機構調整）

# 最大速度（mm/s）
MAX_VELOCITY = 1000
SAFE_VELOCITY = 500        # 安全速度
```

---

## camera_config.py

**Webcam 和校正參數**

```python
# Webcam ID（0=第一顆，1=第二顆）
CAM_GLOBAL = 0   # 俯瞰 webcam（球偵測）
CAM_CUE = 1      # 近拍 webcam（桿頭對位）

# 解析度
CAM_WIDTH = 640
CAM_HEIGHT = 480

# 俯瞰 webcam 的透視轉換矩陣（4 點校正後填入）
# 格式：8 個數字，代表 source points -> dest points 的 transform matrix
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
```

---

## strike_config.py

**擊球力道參數**

```python
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
ARDUINO_COM = "/dev/cu.usbmodem14101"   # TODO: 確認
BAUD_RATE = 115200

# 桿弟機構參數
CUE_LENGTH = 250        # 桿長（mm）
CUE_TIP_RADIUS = 5      # 桿頭半徑（mm）

# 擊球容忍範圍
STRIKE_TOLERANCE = 10   # 桿頭對齊球心的容忍度（mm）
```

---

## calibration_data.py

**校正資料和歷史擊球記錄**

```python
import os
import json
from datetime import datetime

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
    if os.path.exists(CALIBRATION_FILE):
        with open(CALIBRATION_FILE) as f:
            return json.load(f)
    return INITIAL_CALIBRATION

def save_calibration(data):
    with open(CALIBRATION_FILE, "w") as f:
        json.dump(data, f, indent=2)
    return True
```

---

## 校正流程

### 1. カメラ校正（camera_config.py）

```bash
cd ~/Desktop/Oren_own/ros_workspace/hiwin_pool
python3 config/camera_calibration.py
```

會引導你：
1. 拍攝棋盤格校正板多角度照片
2. 計算透視轉換矩陣
3. 自動寫入 `camera_config.py`

### 2. 力道校正（calibrator.py）

系統會自動記錄每次擊球，並在每 5 次擊球後提示校正。

手動觸發：
```bash
python3 -c "
from analysis.calibrator import Calibrator
from analysis.shot_logger import ShotLogger

logger = ShotLogger()
calibrator = Calibrator()

shots = logger.get_all_shots()
correction = calibrator.calibrate(shots)
print(correction)
"
```
