# motion/strike.py
"""擊球序列控制器"""

import time
from comm.hiwin_arm import HIWINArm
from comm.arduino_serial import ArduinoController
from config.strike_config import FORCE_LEVELS, BALL_SETTLE_TIME


class StrikeController:
    """執行完整擊球序列"""

    def __init__(self, arm: HIWINArm, arduino: ArduinoController):
        self.arm = arm
        self.arduino = arduino

    def execute(self, force_level, ball_x, ball_y, pocket_x, pocket_y):
        """
        執行擊球

        Args:
            force_level: int      # 1-6 力道段
            ball_x: float         # 球桌面座標 X（mm）
            ball_y: float         # 球桌面座標 Y（mm）
            pocket_x: float        # 目標袋口座標 X（mm）
            pocket_y: float        # 目標袋口座標 Y（mm）

        Returns:
            dict: {
                "strike_done": bool,
                "actual_velocity": float,
                "reset_complete": bool,
                "error": str
            }
        """
        if force_level not in FORCE_LEVELS:
            return {"strike_done": False, "actual_velocity": 0, "reset_complete": False, "error": "Invalid force level"}

        params = FORCE_LEVELS[force_level]

        # 1. 手臂移動到定桿位置（球後方）
        strike_pos = self._calculate_strike_position(ball_x, ball_y, pocket_x, pocket_y)
        result = self.arm.move_to(**strike_pos)
        if not result["success"]:
            return {"strike_done": False, "actual_velocity": 0, "reset_complete": False, "error": result["error"]}

        # 2. 觸發蓄力
        self.arduino.trigger_strike(force_level)
        time.sleep(params["hold_time"])

        # 3. 擊球（Arduino 端處理時序）
        # 4. 等待球停止
        time.sleep(BALL_SETTLE_TIME)

        # 5. 復位
        reset_result = self.arduino.reset()

        return {
            "strike_done": True,
            "actual_velocity": params["velocity"],
            "reset_complete": reset_result["complete"],
            "error": ""
        }

    def _calculate_strike_position(self, ball_x, ball_y, pocket_x, pocket_y):
        """計算擊球位置（球後方）"""
        # TODO: 根據球的位置和目標袋口計算桿弟位置
        # 暫時用球位置偏移
        return {
            "x": ball_x - 50,
            "y": ball_y,
            "z": 50,
            "a": 0,
            "b": 0,
            "c": 0
        }
