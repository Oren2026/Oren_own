# interfaces/vision_output.py
"""
vision → 其他模組 介面

格式：list of dict，每個球一筆
來源：vision/ball_detector.py 或 vision/table_transform.py
輸出至：strategy/YOUR_VERSION/*.py

Example:
    [
        {"type": "cue", "x_mm": 350.5, "y_mm": 210.0, "radius_mm": 28.5},
        {"type": "solid", "x_mm": 200.0, "y_mm": 150.0, "radius_mm": 28.5},
        {"type": "solid", "x_mm": 450.0, "y_mm": 300.0, "radius_mm": 28.5},
    ]
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime

__all__ = ["VisionOutput", "BallPosition", "validate_vision_output", "create_vision_output"]


@dataclass
class BallPosition:
    """
    單一球體在三維空間的位置（球檯座標，mm）

    用於 vision.ball_position 事件。
    """
    x: float           # 球檯座標 X（mm）
    y: float           # 球檯座標 Y（mm）
    z: float = 0.0     # 球檯座標 Z（mm，撞球檯面預設 0）
    confidence: float = 0.0  # 偵測信心度 0.0~1.0

    def is_confident(self, threshold: float = 0.5) -> bool:
        """信心度是否高於閾值"""
        return self.confidence >= threshold

    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y, "z": self.z, "confidence": self.confidence}

    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> "BallPosition":
        return cls(
            x=data.get("x", 0.0),
            y=data.get("y", 0.0),
            z=data.get("z", 0.0),
            confidence=data.get("confidence", 0.0),
        )


class VisionOutput:
    """視覺輸出資料結構（dict-based，多球格式）"""

    VALID_TYPES = {"cue", "solid", "stripe", "eight"}

    def __init__(self, balls: List[Dict[str, Any]]):
        self.balls = balls

    def to_dict(self) -> List[Dict[str, Any]]:
        return self.balls

    @classmethod
    def from_dict(cls, data: List[Dict[str, Any]]) -> "VisionOutput":
        return cls(data)


def validate_vision_output(data: Any) -> bool:
    """驗證 vision_output 格式是否正確"""
    if not isinstance(data, list):
        raise ValueError(f"vision_output must be a list, got {type(data).__name__}")

    for i, ball in enumerate(data):
        if not isinstance(ball, dict):
            raise ValueError(f"Ball[{i}] must be a dict, got {type(ball).__name__}")

        required = {"type", "x_mm", "y_mm", "radius_mm"}
        missing = required - set(ball.keys())
        if missing:
            raise ValueError(f"Ball[{i}] missing required fields: {missing}")

        if ball["type"] not in VisionOutput.VALID_TYPES:
            raise ValueError(
                f"Ball[{i}] invalid type '{ball['type']}', "
                f"must be one of {VisionOutput.VALID_TYPES}"
            )

        for field in ["x_mm", "y_mm", "radius_mm"]:
            if not isinstance(ball[field], (int, float)):
                raise ValueError(f"Ball[{i}] '{field}' must be numeric")
            if ball[field] < 0:
                raise ValueError(f"Ball[{i}] '{field}' must be non-negative")

    return True


def create_vision_output(balls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """建立 vision_output（帶 timestamp）"""
    return {
        "timestamp": datetime.now().isoformat(),
        "balls": balls,
        "count": len(balls)
    }