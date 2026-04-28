# analysis/shot_logger.py
"""擊球資料記錄"""

import os
import json
import time
from config.calibration_data import SHOT_LOG_DIR, get_shot_log_path, save_calibration, load_calibration


class ShotLogger:
    """記錄每一次擊球的完整資料"""

    def __init__(self, log_dir=None):
        if log_dir:
            self.log_dir = log_dir
        else:
            self.log_dir = SHOT_LOG_DIR
        os.makedirs(self.log_dir, exist_ok=True)

        # 讀取目前的 shot_id
        cal = load_calibration()
        self.shot_count = cal.get("shot_count", 0)

    def log(self, shot_data):
        """
        記錄擊球資料

        Args:
            shot_data: dict，包含：
                - force_level: int
                - ball_start: {"x": float, "y": float}
                - ball_end: {"x": float, "y": float}
                - ball_velocity: float
                - strike_position: dict
                - predicted_end: {"x": float, "y": float}
                - actual_end: {"x": float, "y": float}
                - success: bool

        Returns:
            dict: {"log_id": int, "saved": bool, "file": str}
        """
        self.shot_count += 1
        shot_id = self.shot_count

        # 加入元資料
        record = {
            "shot_id": shot_id,
            "timestamp": time.time(),
            "force_level": shot_data.get("force_level"),
            "ball_start": shot_data.get("ball_start"),
            "ball_end": shot_data.get("ball_end"),
            "ball_velocity": shot_data.get("ball_velocity"),
            "strike_position": shot_data.get("strike_position"),
            "predicted_end": shot_data.get("predicted_end"),
            "actual_end": shot_data.get("actual_end"),
            "success": shot_data.get("success", False),
            "error": shot_data.get("error", "")
        }

        # 寫入 JSON
        filepath = get_shot_log_path(shot_id)
        with open(filepath, "w") as f:
            json.dump(record, f, indent=2)

        # 更新 shot_count
        cal = load_calibration()
        cal["shot_count"] = self.shot_count
        save_calibration(cal)

        return {"log_id": shot_id, "saved": True, "file": filepath}

    def get_shot(self, shot_id):
        """讀取特定擊球記錄"""
        filepath = get_shot_log_path(shot_id)
        if os.path.exists(filepath):
            with open(filepath) as f:
                return json.load(f)
        return None

    def get_all_shots(self):
        """讀取所有擊球記錄"""
        shots = []
        for i in range(1, self.shot_count + 1):
            shot = self.get_shot(i)
            if shot:
                shots.append(shot)
        return shots

    def get_shots_by_force(self, force_level):
        """讀取特定力道段的所有擊球"""
        all_shots = self.get_all_shots()
        return [s for s in all_shots if s.get("force_level") == force_level]
