# comm/arduino_serial.py
"""Arduino 序列通訊"""

import serial
import time
from config.strike_config import ARDUINO_COM, BAUD_RATE


class ArduinoController:
    """USB 序列控制 Arduino"""

    def __init__(self):
        self.ser = None
        self.connected = False

    def connect(self, com_port=None):
        """
        建立序列連線
        Args:
            com_port: str  # 例："/dev/cu.usbmodem14101" 或 "COM3"
        Returns:
            bool
        """
        if com_port is None:
            com_port = ARDUINO_COM

        try:
            self.ser = serial.Serial(com_port, BAUD_RATE, timeout=1)
            time.sleep(2)  # 等 Arduino 重啟
            self.connected = True
            print(f"[Arduino] 連線成功: {com_port}")
            return True
        except Exception as e:
            print(f"[Arduino] 連線失敗: {e}")
            self.connected = False
            return False

    def disconnect(self):
        """關閉序列連線"""
        if self.ser and self.ser.is_open:
            self.ser.close()
            self.ser = None
            self.connected = False
            print("[Arduino] 已斷線")

    def _send(self, cmd):
        """發送指令並等待回應"""
        if not self.connected:
            return ""

        try:
            self.ser.write(f"{cmd}\n".encode())
            time.sleep(0.1)
            if self.ser.in_waiting:
                response = self.ser.readline().decode().strip()
                return response
            return "OK"
        except Exception as e:
            print(f"[Arduino] 傳送失敗: {e}")
            return ""

    def trigger_strike(self, force_level):
        """
        發送擊球指令
        Args:
            force_level: int  # 1-12
        Returns:
            dict: {"sent": bool, "complete": bool, "error": str}
        """
        if not (1 <= force_level <= 12):
            return {"sent": False, "complete": False, "error": "Invalid force level (need 1-12)"}

        response = self._send(f"S{force_level}")
        return {
            "sent": True,
            "complete": "OK" in response or response == "OK",
            "error": "" if "OK" in response else response
        }

    def reset(self, timeout=5.0):
        """
        復位桿弟機構（等待確認完成）

        發送 R 指令後，持續查詢狀態直到 READY 或超時
        確保每次復位都一致完成

        Args:
            timeout: float  # 最大等待秒數
        Returns:
            dict: {"sent": bool, "complete": bool, "error": str}
        """
        if not self.connected:
            return {"sent": False, "complete": False, "error": "Not connected"}

        # 1. 發送復位指令
        response = self._send("R")
        if "ERROR" in response:
            return {"sent": True, "complete": False, "error": response}

        # 2. 持續查詢直到 READY 或超時
        start = time.time()
        while (time.time() - start) < timeout:
            status = self.read_status()
            if status["ready"]:
                return {"sent": True, "complete": True, "error": ""}
            time.sleep(0.1)

        # 超時，嘗試最後一次狀態查詢
        status = self.read_status()
        return {
            "sent": True,
            "complete": status["ready"],
            "error": "RESET_TIMEOUT" if not status["ready"] else ""
        }

    def read_status(self):
        """
        讀取 Arduino 目前狀態
        Returns:
            dict: {"ready": bool, "position": int, "error": str}
        """
        response = self._send("P")
        # 假設格式：READY,pos=3 或 ERROR
        if "READY" in response:
            parts = response.split(",")
            pos = 0
            for p in parts:
                if p.startswith("pos="):
                    pos = int(p.split("=")[1])
            return {"ready": True, "position": pos, "error": ""}
        return {"ready": False, "position": 0, "error": response}
