# comm/hiwin_arm.py
"""HIWIN 手臂 TCP/IP 通訊（COPEN/CWRITE/CREAD 協定）"""

import socket
import time
import re
from config.arm_config import HIWIN_IP, HIWIN_PORT, SOCKET_TIMEOUT


class HIWINArm:
    """
    TCP/IP 控制 HIWIN RA605-710-GC 手臂

    通訊格式（Robot Communication Manual）：
      - 封包：{cmd} — 逗號分隔，無多餘空格
      - 手臂作為 Server，上位系統作為 Client
      - 協定：COPEN → CWRITE → CREAD → CCLEAR

    HRL 指令格式（Software Manual V3.1）：
      PTP {X 100, Y 200, Z 300} CONT=100% Vel=100% Acc=50% TOOL[0] BASE[0]
      LIN {X 100, Y 200, Z 300} CONT=100% Vel=2000mm/s Acc=50% TOOL[0] BASE[0]
      E6POS POINT = {X 0, Y 300, Z 200, A 0, B 0, C 0}
    """

    def __init__(self):
        self.sock = None
        self.connected = False
        self.handle = None

    # ── 連線 ────────────────────────────────────────────────

    def connect(self, ip=None, port=None):
        """
        建立 TCP 連線（手臂為 Server，上位為 Client）
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
            print(f"[HIWINArm] TCP 連線成功: {ip}:{port}")

            # 開啟控制代碼
            self._send_raw(f"COPEN(ETH,{self._new_handle()})")
            return True
        except Exception as e:
            print(f"[HIWINArm] TCP 連線失敗: {e}")
            self.connected = False
            return False

    def disconnect(self):
        """關閉 TCP 連線"""
        if self.sock:
            try:
                self._send_raw("CCLEAR")
            except Exception:
                pass
            self.sock.close()
            self.sock = None
            self.connected = False
            self.handle = None
            print("[HIWINArm] 已斷線")

    # ── 核心傳輸 ────────────────────────────────────────────

    def _new_handle(self):
        """產生新的控制代碼（简单的遞增整數）"""
        if not hasattr(self, "_handle_counter"):
            self._handle_counter = 1
        h = self._handle_counter
        self._handle_counter += 1
        self.handle = h
        return str(h)

    def _send_raw(self, cmd, timeout=None):
        """
        發送原始指令並接收回應（低層級）
        Args:
            cmd: str  # 不含外層大括號
        Returns:
            str: 回應內容（去除大括號）
        """
        if not self.connected:
            return ""

        if timeout is None:
            timeout = SOCKET_TIMEOUT

        try:
            packet = f"{{{cmd}}}"
            self.sock.send(packet.encode())
            data = self.sock.recv(1024).decode().strip()
            # 回應格式：{data} 或 {error}
            if data.startswith("{") and data.endswith("}"):
                return data[1:-1]
            return data
        except socket.timeout:
            return "TIMEOUT"
        except Exception as e:
            print(f"[HIWINArm] 傳送失敗: {e}")
            return ""

    def _hrl(self, command):
        """
        發送 HRL 指令（手臂程式語言）
        Args:
            command: str  # 完整的 HRL 指令（如 "PTP {X 100} CONT=100% Vel=100% ..."）
        Returns:
            str: 回應
        """
        # HRL 指令透過 CWRITE 發送
        # 格式：CWRITE(HANDLE, "HRL", cmd)
        if self.handle is None:
            return "NO_HANDLE"
        return self._send_raw(f'CWRITE({self.handle},"HRL",{command})')

    # ── 手臂控制 ────────────────────────────────────────────

    def move_to(self, x, y, z, a=0, b=0, c=0,
                vel_pct=100, acc_pct=50, motion_type="LIN",
                tool=0, base=0, cont=True):
        """
        直線移動到指定座標（mm + 姿態）

        Args:
            x, y, z: float       # 目標位置（mm）
            a, b, c: float       # 姿態角度（度），對應 RX/RY/RZ
            vel_pct: int         # 速度百分比（1-100），或 "2000mm/s" 等絕對值
            acc_pct: int         # 加速度百分比（1-100）
            motion_type: str     # "LIN"（直線）或 "PTP"（點對點）
            tool: int            # 工具座標系編號
            base: int            # 基座座標系編號
            cont: bool           # True=平滑過渡，False=精確到達（FINE）

        Returns:
            dict: {"success": bool, "position": dict, "error": str}
        """
        if not self.connected:
            return {"success": False, "position": {}, "error": "Not connected"}

        cont_str = "CONT" if cont else "FINE"

        # HRL 格式：LIN {X 100, Y 200, Z 300} CONT=100% Vel=2000mm/s Acc=50% TOOL[0] BASE[0]
        hrl = (
            f"{motion_type} {{X {x}, Y {y}, Z {z}, A {a}, B {b}, C {c}}} "
            f"{cont_str} Vel={vel_pct}% Acc={acc_pct}% TOOL[{tool}] BASE[{base}]"
        )

        response = self._hrl(hrl)
        success = response in ("OK", "") or "OK" in response

        return {
            "success": success,
            "position": {"x": x, "y": y, "z": z, "a": a, "b": b, "c": c},
            "error": "" if success else response
        }

    def ptp(self, x, y, z, a=0, b=0, c=0, vel_pct=100, acc_pct=50):
        """PTP 點對點移動（速度最快）"""
        return self.move_to(x, y, z, a, b, c, vel_pct, acc_pct, "PTP")

    def lin(self, x, y, z, a=0, b=0, c=0, vel_pct=100, acc_pct=50):
        """LIN 直線移動（可控制軌跡）"""
        return self.move_to(x, y, z, a, b, c, vel_pct, acc_pct, "LIN")

    def lin_rel(self, dx=0, dy=0, dz=0, da=0, db=0, dc=0, vel_pct=100, acc_pct=50):
        """LIN 相對移動"""
        if not self.connected:
            return {"success": False, "position": {}, "error": "Not connected"}
        cont_str = "CONT"
        hrl = (
            f"LIN_REL {{X {dx}, Y {dy}, Z {dz}, A {da}, B {db}, C {dc}}} "
            f"{cont_str} Vel={vel_pct}% Acc={acc_pct}% TOOL[0] BASE[0]"
        )
        response = self._hrl(hrl)
        return {"success": "OK" in response or response == "", "error": response}

    def get_position(self):
        """
        讀取目前手臂末端位置（使用 GETPOINT）

        HRL 語法：
            E6POINT E6TEST
            E6TEST = GETPOINT

        回應格式需解析（依據實際回應調整正規表達式）

        Returns:
            dict: {"x": float, "y": float, "z": float, "a": float, "b": float, "c": float}
                  所有值為 0 表示讀取失敗（待根據實際回應格式調整）
        """
        if not self.connected:
            return {"x": 0, "y": 0, "z": 0, "a": 0, "b": 0, "c": 0}

        # 方法：透過 CREAD 讀取 PR[1]（預設儲存 GETPOINT 的位置）
        # 先寫入 GETPOINT 指令，再用 CREAD 讀取
        # 由於 TCP/IP 一次只能處理一筆，需要確認時序
        # 暫時用 PR[1] 當作查詢暫存器
        self._hrl("$PR[1] = GETPOINT")
        time.sleep(0.1)

        # 讀取 PR[1] 的值
        response = self._send_raw(f'CREAD({self.handle},"PR[1]")')
        return self._parse_e6pos(response)

    def _parse_e6pos(self, raw):
        """
        解析 E6POS/E6POINT 回應
        預期格式：{X 100.0, Y 200.0, Z 300.0, A 0.0, B 0.0, C 0.0}
        或 raw 字串
        """
        result = {"x": 0, "y": 0, "z": 0, "a": 0, "b": 0, "c": 0}
        patterns = {
            "x": r"X\s*([-\d.]+)",
            "y": r"Y\s*([-\d.]+)",
            "z": r"Z\s*([-\d.]+)",
            "a": r"A\s*([-\d.]+)",
            "b": r"B\s*([-\d.]+)",
            "c": r"C\s*([-\d.]+)",
        }
        for key, pat in patterns.items():
            m = re.search(pat, raw)
            if m:
                result[key] = float(m.group(1))
        return result

    def emergency_stop(self):
        """緊急停止（驅動器離開）"""
        self._send_raw("$DO[1]=TRUE")  # 視硬體配置決定哪個 DO 為 ESTOP
        print("[HIWINArm] 緊急停止")
