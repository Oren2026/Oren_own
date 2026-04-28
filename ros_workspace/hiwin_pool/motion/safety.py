# motion/safety.py
"""安全監控"""

import time
from config.arm_config import WORK_SPACE_LIMITS, FORBIDDEN_ZONES, MAX_VELOCITY


class SafetyMonitor:
    """碰撞檢測、異常監控"""

    def __init__(self, arm):
        self.arm = arm

    def check(self, target_position, current_velocity=0):
        """
        檢查是否安全

        Args:
            target_position: dict  # 手臂目標位置
            current_velocity: float  # 目前速度（mm/s）

        Returns:
            dict: {
                "safe": bool,
                "reason": str,
                "stop_required": bool
            }
        """
        pos = target_position

        # 檢查工作空間
        if not self._within_workspace(pos):
            return {
                "safe": False,
                "reason": f"超出工作空間: x={pos.get('x')}, y={pos.get('y')}, z={pos.get('z')}",
                "stop_required": True
            }

        # 檢查禁區
        if self._in_forbidden_zone(pos):
            return {
                "safe": False,
                "reason": f"進入禁區: x={pos.get('x')}, y={pos.get('y')}, z={pos.get('z')}",
                "stop_required": True
            }

        # 檢查速度
        if current_velocity > MAX_VELOCITY:
            return {
                "safe": False,
                "reason": f"速度過快: {current_velocity} mm/s",
                "stop_required": True
            }

        return {"safe": True, "reason": "", "stop_required": False}

    def _within_workspace(self, pos):
        """檢查是否在工作範圍內"""
        limits = WORK_SPACE_LIMITS
        x = pos.get("x", 0)
        y = pos.get("y", 0)
        z = pos.get("z", 0)

        return (limits["x"]["min"] <= x <= limits["x"]["max"] and
                limits["y"]["min"] <= y <= limits["y"]["max"] and
                limits["z"]["min"] <= z <= limits["z"]["max"])

    def _in_forbidden_zone(self, pos):
        """檢查是否進入禁區"""
        x = pos.get("x", 0)
        y = pos.get("y", 0)
        z = pos.get("z", 0)

        for zone in FORBIDDEN_ZONES:
            x_min, x_max = zone["x"]
            y_min, y_max = zone["y"]
            z_min, z_max = zone["z"]
            if (x_min <= x <= x_max and y_min <= y <= y_max and z_min <= z <= z_max):
                return True
        return False
