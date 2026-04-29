# Vision 模組

負責：球偵測、桿頭對位、座標轉換

---

## ball_detector.py

**功能：** 從俯瞰 webcam 找出球的位置

**Input：**
```
frame: numpy.ndarray (BGR 格式，OpenCV 讀取)
```

**Output：**
```python
{
    "ball_x": float,       # 球心 X（像素）
    "ball_y": float,       # 球心 Y（像素）
    "ball_r": float,       # 球半徑（像素）
    "found": bool          # 是否找到球
}
```

**相依模組：** 無
**被誰呼叫：** `motion/trajectory.py`, `main.py`

---

## cue_align.py

**功能：** 從近拍 webcam 確認桿頭是否對齊目標

**Input：**
```
frame: numpy.ndarray (BGR 格式)
target_x: float  # 目標球心 X（像素）
target_y: float  # 目標球心 Y（像素）
```

**Output：**
```python
{
    "cue_tip_x": float,   # 桿頭 X（像素）
    "cue_tip_y": float,   # 桿頭 Y（像素）
    "offset_x": float,    # 與目標 X 差距（像素）
    "offset_y": float,    # 與目標 Y 差距（像素）
    "aligned": bool       # 是否在容忍範圍內（預設 < 5px）
}
```

**相依模組：** 無
**被誰呼叫：** `motion/strike.py`

---

## table_transform.py

**功能：** 將 webcam 像素座標轉換為球檯真實座標

**Input：**
```
pixel_x: float   # 像素座標 X
pixel_y: float   # 像素座標 Y
```

**Output：**
```python
{
    "table_x": float,   # 桌面座標（mm）
    "table_y": float    # 桌面座標（mm）
}
```

**校正資料來源：** `config/calibration_data.py` 的 perspective matrix

**相依模組：** `config/calibration_data.py`
**被誰呼叫：** `motion/trajectory.py`, `analysis/shot_logger.py`

---

## 初始化流程

```python
from vision import BallDetector, CueAligner, TableTransform
from config.camera_config import CAM_GLOBAL, CAM_CUE

ball_detector = BallDetector()
cue_aligner = CueAligner()
table_transform = TableTransform()

# 取得 frame
import cv2
cap = cv2.VideoCapture(CAM_GLOBAL)
ret, frame = cap.read()

# 偵測球
ball_info = ball_detector.detect(frame)
if ball_info["found"]:
    table_pos = table_transform.pixel_to_table(
        ball_info["ball_x"], ball_info["ball_y"]
    )
```

---

## 測試方式

```bash
cd ~/Desktop/Oren_own/ros_workspace/hiwin_pool
python3 -c "
from vision import BallDetector
import cv2

detector = BallDetector()
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    result = detector.detect(frame)
    print(result)
    
    if cv2.waitKey(1) == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```
