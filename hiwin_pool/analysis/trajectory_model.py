# analysis/trajectory_model.py
"""球的軌跡預測模型"""

import numpy as np


class TrajectoryModel:
    """根據物理模型預測球的滾動軌跡"""

    def __init__(self, friction_coeff=0.02):
        """
        Args:
            friction_coeff: 摩擦係數（預設 0.02）
        """
        self.friction_coeff = friction_coeff

    def predict(self, initial_velocity, direction, ball_start_x, ball_start_y, spin=0):
        """
        預測球軌跡

        Args:
            initial_velocity: float  # 擊球初速（m/s）
            direction: float         # 擊球方向（弧度，0=正X）
            ball_start_x: float      # 起始位置 X（mm）
            ball_start_y: float      # 起始位置 Y（mm）
            spin: float             # 旋轉量（-1 到 1），預設 0

        Returns:
            dict: {
                "predicted_end": {"x": float, "y": float},
                "confidence": float,
                "trajectory_points": [...]
            }
        """
        # 轉換單位：mm -> m
        start_x = ball_start_x / 1000.0
        start_y = ball_start_y / 1000.0

        # 速度分量
        vx0 = initial_velocity * np.cos(direction)
        vy0 = initial_velocity * np.sin(direction)

        # 摩擦衰減模型：v(t) = v0 * exp(-mu * g * t)
        g = 9.81
        decay_rate = self.friction_coeff * g

        # 找到停止時間（速度 < 0.01 m/s）
        v_threshold = 0.01
        if initial_velocity > 0:
            t_stop = -np.log(v_threshold / initial_velocity) / decay_rate
        else:
            t_stop = 0

        # 積分得到位置
        t = np.linspace(0, t_stop, 50)
        vx = vx0 * np.exp(-decay_rate * t)
        vy = vy0 * np.exp(-decay_rate * t)

        x = start_x + (vx0 / decay_rate) * (1 - np.exp(-decay_rate * t))
        y = start_y + (vy0 / decay_rate) * (1 - np.exp(-decay_rate * t))

        # 最後位置
        end_x = x[-1] * 1000  # 轉回 mm
        end_y = y[-1] * 1000

        # 軌跡取樣點
        trajectory_points = [
            {"t": float(ti), "x": float(xi * 1000), "y": float(yi * 1000)}
            for ti, xi, yi in zip(t[::5], x[::5], y[::5])
        ]

        # 信心度：根據初始速度和摩擦係數估算
        confidence = min(1.0, initial_velocity / 3.0)

        return {
            "predicted_end": {"x": float(end_x), "y": float(end_y)},
            "confidence": float(confidence),
            "trajectory_points": trajectory_points
        }
