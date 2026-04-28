# Motion 模組

負責：擊球序列、軌跡規劃、安全檢測

---

## strike.py

**功能：** 執行完整擊球序列（蓄力 → 擊球 → 復位）

**Input：**
```python
{
    "force_level": int,     # 1-6 力道段
    "ball_x": float,        # 球桌面座標 X（mm）
    "ball_y": float,        # 球桌面座標 Y（mm）
    "pocket_x": float,      # 目標袋口座標 X（mm）
    "pocket_y": float       # 目標袋口座標 Y（mm）
}
```

**Output：**
```python
{
    "strike_done": bool,
    "actual_velocity": float,   # 實際擊球速度（m/s）
    "reset_complete": bool,
    "error": str
}
```

**擊球序列流程：**
```
1. 手臂移動到「定桿位置」（球後方）
2. Arduino 觸發蓄力（根據 force_level）
3. 瞬間擊球
4. 視覺記錄球軌跡（由 analysis/shot_logger.py 處理）
5. Arduino 觸發復位
6. 回傳結果
```

**相依模組：**
- `comm.hiwin_arm`
- `comm.arduino_serial`
- `analysis.shot_logger`

**被誰呼叫：** `main.py`

---

## trajectory.py

**功能：** 計算手臂移動路徑

**Input：**
```python
{
    "target_x": float,   # 球桌面座標 X（mm）
    "target_y": float,   # 球桌面座標 Y（mm）
    "cue_length": float  # 桿長（mm），預設 250
}
```

**Output：**
```python
{
    "waypoints": [        # 手臂經過的路径點
        {"x": float, "y": float, "z": float, "type": str},
        ...
    ],
    "strike_position": {"x": float, "y": float, "z": float},  # 擊球定點
    "approach_position": {"x": float, "y": float, "z": float}, # 接近位置
    "estimated_time": float  # 預估移動時間（秒）
}
```

**路徑點說明：**
- `type: "hover"` — 懸停點（安全高度）
- `type: "approach"` — 接近位置
- `type: "strike"` — 定桿擊球位置
- `type: "retreat"` — 擊球後退位置

**相依模組：**
- `vision.table_transform`
- `config.arm_config`

**被誰呼叫：** `strike.py`, `main.py`

---

## safety.py

**功能：** 碰撞檢測、異常監控

**Input：**
```python
{
    "current_position": dict,   # 手臂目前位置
    "target_position": dict,    # 手臂目標位置
    "velocity": float           # 目前速度（mm/s）
}
```

**Output：**
```python
{
    "safe": bool,
    "reason": str,           # 如果 unsafe，說明原因
    "stop_required": bool    # 是否需要緊急停止
}
```

**檢測項目：**
- 手臂是否超出安全範圍（config/arm_config.py 的 WORK_SPACE_LIMITS）
- 速度是否異常
- 是否進入禁區（config/arm_config.py 的 FORBIDDEN_ZONES）
- 通訊是否超時

**相依模組：**
- `comm.hiwin_arm`
- `config.arm_config`

**被誰呼叫：** `strike.py`, `trajectory.py`, `main.py`

---

## 初始化流程

```python
from motion.strike import StrikeController
from motion.trajectory import TrajectoryPlanner
from motion.safety import SafetyMonitor
from comm.hiwin_arm import HIWINArm
from comm.arduino_serial import ArduinoController

arm = HIWINArm()
arduino = ArduinoController()

strike = StrikeController(arm, arduino)
planner = TrajectoryPlanner()
safety = SafetyMonitor(arm)

# 規劃路徑
path = planner.plan(
    target_x=300,
    target_y=200,
    cue_length=250
)

# 安全檢查
for wp in path["waypoints"]:
    check = safety.check(wp)
    if not check["safe"]:
        print(f"路徑不安全: {check['reason']}")
        break

# 執行擊球
result = strike.execute(
    force_level=3,
    ball_x=300, ball_y=200,
    pocket_x=50, pocket_y=50
)
```

---

## 測試方式

```bash
cd ~/Desktop/Oren_own/ros_workspace/hiwin_pool

# 測試軌跡規劃（不需要連線）
python3 -c "
from motion.trajectory import TrajectoryPlanner
planner = TrajectoryPlanner()
result = planner.plan(300, 200, 250)
print(result)
"
```
