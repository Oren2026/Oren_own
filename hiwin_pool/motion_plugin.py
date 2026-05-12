# motion_plugin.py
"""運動控制 Plugin — 軌跡規劃、擊球序列"""

from base_plugin import BasePlugin
from event_bus import EventBus, Event


class MotionPlugin(BasePlugin):
    """
    運動控制 Plugin

    訂閱：
      - vision.ball_position → 計算擊球軌跡、發送手臂指令

    發佈：
      - motion.arm_command   → comm_plugin 訂閱
      - motion.strike_command → comm_plugin 訂閱
    """

    name = "motion"

    def __init__(self, bus: EventBus = None):
        super().__init__(bus)

    # ── BasePlugin 實作 ─────────────────────────────────────

    def init(self) -> bool:
        print("[MotionPlugin] 初始化")
        return True

    def update(self) -> None:
        """訂閱架構下，邏輯在 on_event() 裡處理"""
        pass

    def shutdown(self) -> None:
        print("[MotionPlugin] 已關閉")

    # ── 事件處理 ─────────────────────────────────────────────

    def on_event(self, event: Event) -> None:
        if event.type == "vision.ball_position":
            self._plan_strike(event.data)

    # ── 擊球邏輯（stub）─────────────────────────────────────

    def _plan_strike(self, ball_pos: dict) -> None:
        """
        根據球位置規劃擊球

        Args:
            ball_pos: {"x": float, "y": float, "z": float, "confidence": float}
        """
        if ball_pos.get("confidence", 0) < 0.5:
            return

        # TODO: 計算手臂目標座標
        # TODO: 計算擊球力道
        # TODO: 發送 arm_command
        # TODO: 發送 strike_command

        if self.bus:
            self.bus.publish("motion.arm_command", {
                "x": 100,
                "y": 200,
                "z": 50,
                "velocity": 500,
            })
