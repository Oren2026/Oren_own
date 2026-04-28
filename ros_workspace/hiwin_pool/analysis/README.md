# Analysis 模組

負責：擊球資料記錄、軌跡預測、參數校正

---

## shot_logger.py

**功能：** 記錄每一次擊球的完整資料

**Input：**
```python
{
    "shot_id": int,                    # 擊球編號（遞增）
    "timestamp": float,                 # 時間戳（time.time()）
    "force_level": int,                # 施打的力道段（1-6）
    "ball_start": {"x": float, "y": float},      # 球起始桌面座標
    "ball_end": {"x": float, "y": float},        # 球結束桌面座標
    "ball_velocity": float,             # 擊球瞬間速度（m/s）
    "strike_position": {"x": float, "y": float, "z": float},  # 擊球時手臂位置
    "predicted_end": {"x": float, "y": float},   # 軌跡模型預測的終點
    "actual_end": {"x": float, "y": float},      # 實際測量終點
    "success": bool                     # 是否進袋
}
```

**Output：**
```python
{
    "log_id": int,
    "saved": bool,
    "file": str  # 儲存的檔案路徑
}
```

**儲存格式：** JSON（追加寫入）
**儲存位置：** `config/calibration_data.py` 的 SHOT_LOG_DIR

**相依模組：** 無
**被誰呼叫：** `strike.py`, `main.py`

---

## trajectory_model.py

**功能：** 根據物理模型預測球的滾動軌跡

**Input：**
```python
{
    "initial_velocity": float,   # 擊球初速（m/s）
    "direction": float,         # 擊球方向（弧度，0=正X）
    "spin": float,              # 旋轉量（-1 到 1），預設 0
    "ball_start_x": float,      # 起始位置 X（mm）
    "ball_start_y": float       # 起始位置 Y（mm）
}
```

**Output：**
```python
{
    "predicted_end": {"x": float, "y": float},  # 預測終點
    "confidence": float,         # 預測信心度（0-1）
    "trajectory_points": [       # 軌跡上的取樣點
        {"t": float, "x": float, "y": float}, ...
    ]
}
```

**模型說明：**
- 假設：桌面摩擦係數均勻、無障礙
- 摩擦模型：指數衰減速度
- 計算：直到速度低於閾值，停止點即為預測終點

**相依模組：** 無（純數學計算）
**被誰呼叫：** `strike.py`, `calibrator.py`

---

## calibrator.py

**功能：** 比對實際軌跡 vs 預測軌跡，輸出校正參數

**Input：**
```python
{
    "predicted_end": {"x": float, "y": float},
    "actual_end": {"x": float, "y": float},
    "force_level": int,         # 施打的力道段
    "all_shots": list           # 同力道段的所有歷史擊球
}
```

**Output：**
```python
{
    "correction_factor": float,  # 該力道段的校正係數
    "velocity_bias": float,      # 速度偏差（m/s）
    "angle_bias": float,        # 角度偏差（弧度）
    "new_params": {             # 更新後的力道參數
        "force_level_1": {"velocity": float, "angle": float},
        "force_level_2": {"velocity": float, "angle": float},
        ...
    },
    "confidence": float         # 校正信心度（歷史資料越多越準）
}
```

**校正邏輯：**
```
error = actual_end - predicted_end
correction_factor = error / predicted_distance
new_velocity = base_velocity * (1 + correction_factor)
```

**相依模組：**
- `trajectory_model.py`
- `config/strike_config.py`
- `config/calibration_data.py`

**被誰呼叫：** `main.py`（在每 N 次擊球後呼叫一次）

---

## 初始化流程

```python
from analysis.shot_logger import ShotLogger
from analysis.trajectory_model import TrajectoryModel
from analysis.calibrator import Calibrator
from config.calibration_data import SHOT_LOG_DIR

logger = ShotLogger(log_dir=SHOT_LOG_DIR)
model = TrajectoryModel()
calibrator = Calibrator(model)

# 擊球後記錄
logger.log({
    "shot_id": 1,
    "timestamp": time.time(),
    "force_level": 3,
    "ball_start": {"x": 300, "y": 200},
    "ball_end": {"x": 50, "y": 50},
    ...
})

# 每 5 次擊球後校正一次
if shot_id % 5 == 0:
    correction = calibrator.calibrate(
        all_shots=logger.get_shots_by_force(3)
    )
    print(f"校正係數: {correction['correction_factor']}")
```

---

## 測試方式

```bash
cd ~/Desktop/Oren_own/ros_workspace/hiwin_pool

# 測試軌跡模型
python3 -c "
from analysis.trajectory_model import TrajectoryModel
model = TrajectoryModel()
result = model.predict(
    initial_velocity=2.5,
    direction=0.5,
    ball_start_x=300,
    ball_start_y=200
)
print(result)
"
```
