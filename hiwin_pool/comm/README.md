# Comm 模組

負責：手臂 TCP/IP 通訊、Arduino 序列通訊

---

## hiwin_arm.py

**功能：** 透過 TCP/IP 控制 HIWIN 手臂移動

**連線參數（來自 config/arm_config.py）：**
```python
HIWIN_IP   = "192.168.1.100"   # TODO: 確認實際 IP
HIWIN_PORT = 5000              # 預設 port
```

**主要方法：**

```python
class HIWINArm:
    def connect() -> bool:
        """建立 TCP 連線"""
        return True/False

    def disconnect():
        """關閉連線"""

    def move_to(x, y, z, rx=0, ry=0, rz=0) -> dict:
        """直線移動到指定座標（mm + 角度）"""
        return {"success": bool, "position": dict}

    def get_position() -> dict:
        """讀取目前手臂末端位置"""
        return {"x": float, "y": float, "z": float, "rx": float, "ry": float, "rz": float}

    def send_custom(cmd: str) -> str:
        """發送自訂指令到手臂，回傳回應"""
        return response_string

    def emergency_stop():
        """緊急停止"""
```

**Input（move_to）：**
```
x, y, z: float  # 目標位置（mm）
rx, ry, rz: float  # 姿態角度（度），預設 0
```

**Output：**
```python
{
    "success": bool,
    "position": {"x": float, "y": float, "z": float, "rx": float, "ry": float, "rz": float},
    "error": str  # 如果 success=False
}
```

**使用的底層指令（來自 HIWIN 文件）：**
```
COPEN(ETH, HANDLE)  — 開啟連線
CWRITE(HANDLE, data) — 發送指令
CREAD(HANDLE, data)  — 讀取回應
CCLEAR(HANDLE)       — 關閉連線
```

**相依模組：** 無（直接 socket）
**被誰呼叫：** `motion/trajectory.py`, `motion/safety.py`, `main.py`

---

## arduino_serial.py

**功能：** 透過 USB 序列埠發送擊球指令給 Arduino

**連線參數（來自 config/strike_config.py）：**
```python
ARDUINO_COM = "/dev/cu.usbmodem14101"   # TODO: 確認實際 COM port
BAUD_RATE = 115200
```

**主要方法：**

```python
class ArduinoController:
    def connect() -> bool:
        """建立序列連線"""
        return True/False

    def disconnect():
        """關閉序列連線"""

    def trigger_strike(force_level: int) -> dict:
        """發送擊球指令"""
        # force_level: 1-6（力道段）
        return {"sent": bool, "complete": bool}

    def reset() -> dict:
        """復位桿弟機構"""
        return {"sent": bool, "complete": bool}

    def read_status() -> dict:
        """讀取 Arduino 目前狀態"""
        return {"ready": bool, "position": int, "error": str}
```

**Input（trigger_strike）：**
```
force_level: int  # 1-6
```

**Output：**
```python
{
    "sent": bool,
    "complete": bool,
    "error": str
}
```

**Arduino 端期望的指令格式：**
```
S{force_level}\n   # 例：S3\n（擊球，等候完成）
R\n                 # 復位
P\n                 # 查詢狀態
```

**相依模組：** 無（pyserial）
**被誰呼叫：** `motion/strike.py`, `main.py`

---

## 初始化流程

```python
from comm.hiwin_arm import HIWINArm
from comm.arduino_serial import ArduinoController
from config.arm_config import HIWIN_IP, HIWIN_PORT
from config.strike_config import ARDUINO_COM

arm = HIWINArm()
if arm.connect(HIWIN_IP, HIWIN_PORT):
    print("手臂連線成功")

arduino = ArduinoController()
if arduino.connect(ARDUINO_COM):
    print("Arduino 連線成功")

# 測試移動
arm.move_to(x=100, y=200, z=150)

# 發送擊球指令
arduino.trigger_strike(force_level=3)
```

---

## 測試方式

```bash
cd ~/Desktop/Oren_own/ros_workspace/hiwin_pool

# 測試手臂連線（IP 需確認）
python3 -c "
from comm.hiwin_arm import HIWINArm
arm = HIWINArm()
print(arm.connect('192.168.1.100', 5000))
"

# 測試 Arduino 連線（確認 COM port）
python3 -c "
from comm.arduino_serial import ArduinoController
arduino = ArduinoController()
print(arduino.connect('/dev/cu.usbmodem14101'))
print(arduino.read_status())
"
```

---

## 常見問題

**Q: TCP/IP 連線失敗？**
- 檢查手臂和電腦是否在同一網域
- 確認 IP 和 port 是否正確
- 嘗試 ping 手臂 IP

**Q: USB 找不到 Arduino？**
- 確認 USB 連接
- 查看 `/dev/cu.*` 或 `/dev/tty.*` 確認 port 名稱
- macOS 用 `ls /dev/cu.*`，Linux 用 `ls /dev/tty.*`
