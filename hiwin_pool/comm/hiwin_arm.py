# comm/hiwin_arm.py
"""HIWIN 手臂 TCP/IP 通訊"""

import socket
import time
from config.arm_config import HIWIN_IP, HIWIN_PORT, SOCKET_TIMEOUT


class HIWINArm:
    """TCP/IP 控制 HIWIN 手臂"""

    def __init__(self):
        self.sock = None
        self.connected = False

    def connect(self, ip=None, port=None):
        """
        建立 TCP 連線
        Returns: bool
        """
        if ip is None:
            ip = HIWIN_IP
        if port is None:
            port = HIWIN_PORT

        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(SOCKET_TIMEOUT)
            self.sock.connect((ip, port))
            self.connected = True
            print(f"[HIWINArm] 連線成功: {ip}:{port}")
            return True
        except Exception as e:
            print(f"[HIWINArm] 連線失敗: {e}")
            self.connected = False
            return False

    def disconnect(self):
        """關閉連線"""
        if self.sock:
            self.sock.close()
            self.sock = None
            self.connected = False
            print("[HIWINArm] 已斷線")

    def send_custom(self, cmd):
        """
        發送自訂指令到手臂，回傳回應
        Args:
            cmd: str  # 指令字串
        Returns:
            str: 回應內容
        """
        if not self.connected:
            return ""

        try:
            # HIWIN 格式：{cmd}
            self.sock.send(f"{{{cmd}}}".encode())
            data = self.sock.recv(1024)
            return data.decode().strip("{}")
        except Exception as e:
            print(f"[HIWINArm] 傳送失敗: {e}")
            return ""

    def move_to(self, x, y, z, rx=0, ry=0, rz=0):
        """
        直線移動到指定座標（mm + 角度）
        Args:
            x, y, z: float  # 目標位置（mm）
            rx, ry, rz: float  # 姿態角度（度），預設 0
        Returns:
            dict: {"success": bool, "position": dict, "error": str}
        """
        # TODO: 根據 HIWIN 文件實作實際指令
        # 暫時模擬
        cmd = f"MOVELINE({x},{y},{z},{rx},{ry},{rz})"
        response = self.send_custom(cmd)
        return {
            "success": "OK" in response or response == "",
            "position": {"x": x, "y": y, "z": z, "rx": rx, "ry": ry, "rz": rz},
            "error": "" if "OK" in response or response == "" else response
        }

    def get_position(self):
        """
        讀取目前手臂末端位置
        Returns:
            dict: {"x": float, "y": float, "z": float, "rx": float, "ry": float, "rz": float}
        """
        # TODO: 根據 HIWIN 文件實作
        # 暫時模擬
        return {"x": 0, "y": 0, "z": 0, "rx": 0, "ry": 0, "rz": 0}

    def emergency_stop(self):
        """緊急停止"""
        self.send_custom("ESTOP")
        print("[HIWINArm] 緊急停止")
