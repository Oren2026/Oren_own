# config/arm_config.py
# HIWIN 手臂 IP 和姿態設定

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

# TCP/IP 連線超時（秒）
SOCKET_TIMEOUT = 10
