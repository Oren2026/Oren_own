# motion/trajectory.py
"""手臂軌跡規劃"""

import numpy as np
from config.arm_config import SAFE_Z_HEIGHT, STRIKE_Z_HEIGHT
from config.strike_config import CUE_LENGTH


class TrajectoryPlanner:
    """計算手臂移動路徑"""

    def __init__(self):
        self.safe_z = SAFE_Z_HEIGHT
        self.strike_z = STRIKE_Z_HEIGHT
        self.cue_length = CUE_LENGTH

    def plan(self, target_x, target_y, cue_length=None):
        """
        規劃路徑

        Args:
            target_x: float   # 球桌面座標 X（mm）
            target_y: float   # 球桌面座標 Y（mm）
            cue_length: float # 桿長（mm），預設 250

        Returns:
            dict: {
                "waypoints": [...],
                "strike_position": dict,
                "approach_position": dict,
                "estimated_time": float
            }
        """
        if cue_length is None:
            cue_length = self.cue_length

        # 擊球位置（球後方）
        strike_pos = {
            "x": target_x - cue_length,
            "y": target_y,
            "z": self.strike_z
        }

        # 接近位置（較高處）
        approach_pos = {
            "x": strike_pos["x"],
            "y": strike_pos["y"],
            "z": self.safe_z
        }

        # 懸停位置（安全高度）
        hover_pos = {
            "x": strike_pos["x"],
            "y": strike_pos["y"],
            "z": self.safe_z
        }

        # 退後位置（擊球後退）
        retreat_pos = {
            "x": strike_pos["x"] + 50,
            "y": strike_pos["y"],
            "z": self.safe_z
        }

        waypoints = [
            {"x": hover_pos["x"], "y": hover_pos["y"], "z": hover_pos["z"], "type": "hover"},
            {"x": approach_pos["x"], "y": approach_pos["y"], "z": approach_pos["z"], "type": "approach"},
            {"x": strike_pos["x"], "y": strike_pos["y"], "z": strike_pos["z"], "type": "strike"},
            {"x": retreat_pos["x"], "y": retreat_pos["y"], "z": retreat_pos["z"], "type": "retreat"},
        ]

        # 簡單估算時間：每段 1 秒
        estimated_time = len(waypoints) * 1.0

        return {
            "waypoints": waypoints,
            "strike_position": strike_pos,
            "approach_position": approach_pos,
            "estimated_time": estimated_time
        }
