# comm_plugin.py
"""通訊 Plugin — TCP/IP 手臂控制、Arduino 擊球機構"""

from base_plugin import BasePlugin
from event_bus import EventBus, Event


class CommPlugin(BasePlugin):
    """
    通訊 Plugin

    訂閱：
      - motion.arm_command  → 發送手臂指令
      - motion.strike_command → 發送 Arduino 擊球指令

    發佈：
      - comm.arm_position    → 目前手臂位置
      - comm.arduino_status  → Arduino 連線狀態
    """

    name = "comm"

    def __init__(self, bus: EventBus = None):
        super().__init__(bus)
        self.arm_connected = False
        self.arduino_connected = False

    # ── BasePlugin 實作 ─────────────────────────────────────

    def init(self) -> bool:
        # 真實實作：建立 TCP/IP 和 USB 連線
        # 目前 stub 直接回成功
        self.arm_connected = True
        self.arduino_connected = True
        print("[CommPlugin] 連線初始化（stub）")
        return True

    def update(self) -> None:
        """訂閱架構下，實際邏輯在 on_event() 裡處理"""
        # stub：不做任何事，等待事件觸發
        pass

    def shutdown(self) -> None:
        self.arm_connected = False
        self.arduino_connected = False
        print("[CommPlugin] 已斷線")

    # ── 事件處理 ─────────────────────────────────────────────

    def on_event(self, event: Event) -> None:
        if event.type == "motion.arm_command":
            self._send_arm_command(event.data)
        elif event.type == "motion.strike_command":
            self._send_strike(event.data)

    # ── 私有 ────────────────────────────────────────────────

    def _send_arm_command(self, cmd: dict) -> None:
        """傳送手臂指令（stub）"""
        print(f"[CommPlugin] 手臂指令: {cmd}")

    def _send_strike(self, cmd: dict) -> None:
        """傳送擊球指令（stub）"""
        print(f"[CommPlugin] 擊球指令: {cmd}")
