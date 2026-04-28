# analysis/calibrator.py
"""參數校正器"""

import numpy as np
from config.calibration_data import load_calibration, save_calibration
from config.strike_config import FORCE_LEVELS


class Calibrator:
    """比對實際軌跡 vs 預測軌跡，輸出校正參數"""

    def __init__(self, trajectory_model=None):
        self.model = trajectory_model
        self.calibration = load_calibration()

    def calibrate(self, all_shots):
        """
        根據歷史擊球資料校正參數

        Args:
            all_shots: list  # 所有擊球記錄

        Returns:
            dict: {
                "correction_factor": float,
                "velocity_bias": float,
                "angle_bias": float,
                "new_params": dict,
                "confidence": float
            }
        """
        if not all_shots:
            return {
                "correction_factor": 1.0,
                "velocity_bias": 0.0,
                "angle_bias": 0.0,
                "new_params": {i: FORCE_LEVELS[i].copy() for i in FORCE_LEVELS},
                "confidence": 0.0
            }

        # 按力道分組
        force_shots = {i: [] for i in range(1, 7)}
        for shot in all_shots:
            fl = shot.get("force_level")
            if fl in force_shots:
                force_shots[fl].append(shot)

        # 計算每個力道段的校正係數
        force_corrections = {}
        total_error = 0
        total_count = 0

        for force_level, shots in force_shots.items():
            if not shots:
                force_corrections[str(force_level)] = {
                    "factor": 1.0,
                    "velocity_bias": 0.0,
                    "angle_bias": 0.0
                }
                continue

            errors = []
            for shot in shots:
                pred = shot.get("predicted_end", {})
                actual = shot.get("actual_end", {})
                if pred and actual:
                    dx = actual["x"] - pred["x"]
                    dy = actual["y"] - pred["y"]
                    dist = np.sqrt(pred["x"]**2 + pred["y"]**2) / 1000  # m
                    if dist > 0.001:
                        error = np.sqrt(dx**2 + dy**2) / dist
                        errors.append(error)
                        total_error += error
                        total_count += 1

            if errors:
                avg_error = np.mean(errors)
                force_corrections[str(force_level)] = {
                    "factor": 1.0 + avg_error,
                    "velocity_bias": avg_error * FORCE_LEVELS[force_level]["velocity"],
                    "angle_bias": 0.0
                }
            else:
                force_corrections[str(force_level)] = {
                    "factor": 1.0,
                    "velocity_bias": 0.0,
                    "angle_bias": 0.0
                }

        # 更新校正參數
        self.calibration["force_corrections"] = force_corrections
        self.calibration["last_updated"] = str(np.datetime64("now"))
        self.calibration["confidence"] = min(1.0, total_count / 20.0)
        save_calibration(self.calibration)

        # 計算新的力道參數
        new_params = {}
        for i in range(1, 7):
            corr = force_corrections[str(i)]
            base = FORCE_LEVELS[i]
            new_params[i] = {
                "velocity": base["velocity"] * corr["factor"],
                "pullback": base["pullback"],
                "hold_time": base["hold_time"]
            }

        return {
            "correction_factor": self.calibration["force_corrections"],
            "velocity_bias": total_error / max(total_count, 1),
            "angle_bias": 0.0,
            "new_params": new_params,
            "confidence": self.calibration["confidence"]
        }
