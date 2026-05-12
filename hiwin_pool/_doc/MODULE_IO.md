# 模組 I/O 總覽 — 方便未來串接

> 每次串接新模組前，先讀此檔確認介面格式
> 更新：2026-05-08

---

## EventBus 事件流向圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         EventBus                                │
│                                                                 │
│   ┌─────────────┐        ┌─────────────┐        ┌────────────┐ │
│   │   Vision    │        │   Motion    │        │    UI      │ │
│   │   Plugin   │        │   Plugin    │        │   Plugin   │ │
│   └──────┬──────┘        └──────┬──────┘        └─────┬──────┘ │
│          │                     │                     │        │
│   publish│                     │subscribe            │subscribe│
│          ↓                     ↑                     ↑        │
│   vision.frame            motion.                ui.         │
│   vision.ball_position    arm_command            command     │
│          │               motion.                         │
│          │               strike_cmd                       │
│          │                     ↑                         │
│          └─────────────────────┴──────────────────────┐   │
│                                                       │        │
│          ┌─────────────┐                  ┌────────┴───┐   │
│          │    Comm     │                  │    舊模組    │   │
│          │   Plugin    │                  │ (保留介面)  │   │
│          └──────┬──────┘                  └─────────────┘   │
│               │subscribe                                    │
│               ↑                                            │
│          motion.                                           │
│          arm_command                                      │
│          motion.                                           │
│          strike_cmd                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 所有事件型別

### 事件一覧

| 事件名 | 方向 | 發佈者 | 訂閱者 | 資料格式 |
|--------|------|--------|--------|---------|
| `vision.frame` | 單向 | VisionPlugin | UIPlugin | `numpy.ndarray` (H,W,3) BGR |
| `vision.ball_position` | 單向 | VisionPlugin | MotionPlugin | `BallPosition` dataclass |
| `motion.arm_command` | 單向 | MotionPlugin | CommPlugin | `ArmCommand` dataclass |
| `motion.strike_command` | 單向 | MotionPlugin | CommPlugin | `StrikeCommand` dataclass |
| `comm.arm_position` | 單向 | CommPlugin | UIPlugin | `ArmPosition` dataclass |
| `comm.arduino_status` | 單向 | CommPlugin | UIPlugin | `bool` |
| `ui.command` | 單向 | UIPlugin | main.py | `str`（"quit" / "strike" / "calibrate"）|

---

## dataclass 介面定義

所有跨模組資料使用 dataclass，定義在 `interfaces/`。

```python
# interfaces/vision_output.py
@dataclass
class BallPosition:
    x: float           # 球檯座標 X（mm）
    y: float           # 球檯座標 Y（mm）
    confidence: float  # 偵測信心度 0.0~1.0

# interfaces/motion_command.py
@dataclass
class ArmCommand:
    x: float           # 目標 X（mm）
    y: float           # 目標 Y（mm）
    z: float           # 目標 Z（mm）
    velocity: float    # 速度（mm/s）
    motion_type: str   # "LIN" 或 "PTP"

@dataclass
class StrikeCommand:
    force: float       # 力道 0.0 ~ 1.0（線性）

# interfaces/data_structures.py
@dataclass
class ArmPosition:
    x: float
    y: float
    z: float
    a: float
    b: float
    c: float
```

---

## Plugin 介面契約

### BasePlugin（所有 Plugin 必須實作）

```python
class BasePlugin(ABC):
    name: str                          # 唯一識別名稱

    def init(self) -> bool: ...        # 初始化，回傳成功與否
    def update(self) -> None: ...       # 主循環每次迭代
    def shutdown(self) -> None: ...     # 結束時清理
    def on_event(self, event: Event):   # 可選，處理 EventBus 事件
    def register(self, bus: EventBus):  # 向 bus 註冊自己
```

### 事件處理慣例

- Plugin 實作 `on_event(self, event)` 來處理感興趣的事件
- `register()` 時訂閱所有需要的事件
- 發佈事件用 `self.bus.publish("event.type", data)`
- 不在 `update()` 裡做 blocking I/O

---

## 新增 Plugin 範本

```python
from base_plugin import BasePlugin
from event_bus import EventBus, Event

class NewPlugin(BasePlugin):
    name = "new_plugin"

    def init(self) -> bool:
        # 初始化（建立連線、載入資源等）
        return True

    def register(self, bus: EventBus):
        super().register(bus)
        bus.subscribe("some.event", self.on_event)

    def on_event(self, event: Event):
        if event.type == "some.event":
            data = event.data  # typed dataclass
            # 處理邏輯
            self.bus.publish("output.event", {...})

    def update(self) -> None:
        # 主循環邏輯（非 blocking）
        pass

    def shutdown(self) -> None:
        # 清理資源
        pass
```

---

## 版本與事件契約穩定性

| 版本 | 事件契約 | 說明 |
|------|---------|------|
| v0.2 | ✅ 確立 | EventBus + Plugin 架構 |
| v0.3 | 擴展 | vision.ball_position 正式實作 |
| v0.4 | 擴展 | ui.command 增加新命令 |
| v0.5 | 擴展 | comm.arm_position, comm.arduino_status |
| v0.6 | 擴展 | motion.strike_command 改為線性 force |

**原則：事件名稱和 dataclass 格式一旦確立，不會在同版本中更名。**
**如需更名，視為破壞性變更，需前進一個大版本（如 0.5 → 0.6）。**