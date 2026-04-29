# interfaces/vision_output.py
"""
vision → strategy 介面

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

from typing import List, Dict, Any
from datetime import datetime

__all__ = ["VisionOutput", "validate_vision_output", "create_vision_output"]


class VisionOutput:
    """視覺輸出資料結構（dict-based）"""
    
    VALID_TYPES = {"cue", "solid", "stripe", "eight"}
    
    def __init__(self, balls: List[Dict[str, Any]]):
        self.balls = balls

    def to_dict(self) -> List[Dict[str, Any]]:
        return self.balls

    @classmethod
    def from_dict(cls, data: List[Dict[str, Any]]) -> "VisionOutput":
        return cls(data)


def validate_vision_output(data: Any) -> bool:
    """
    驗證 vision_output 格式是否正確
    
    Args:
        data: 要驗證的資料
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    if not isinstance(data, list):
        raise ValueError(f"vision_output must be a list, got {type(data).__name__}")
    
    for i, ball in enumerate(data):
        if not isinstance(ball, dict):
            raise ValueError(f"Ball[{i}] must be a dict, got {type(ball).__name__}")
        
        # 檢查必要欄位
        required = {"type", "x_mm", "y_mm", "radius_mm"}
        missing = required - set(ball.keys())
        if missing:
            raise ValueError(f"Ball[{i}] missing required fields: {missing}")
        
        # 檢查 type validity
        if ball["type"] not in VisionOutput.VALID_TYPES:
            raise ValueError(
                f"Ball[{i}] invalid type '{ball['type']}', "
                f"must be one of {VisionOutput.VALID_TYPES}"
            )
        
        # 檢查數值合理性
        for field in ["x_mm", "y_mm", "radius_mm"]:
            if not isinstance(ball[field], (int, float)):
                raise ValueError(f"Ball[{i}] '{field}' must be numeric")
            if ball[field] < 0:
                raise ValueError(f"Ball[{i}] '{field}' must be non-negative")
    
    return True


def create_vision_output(balls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    建立 vision_output（帶 timestamp）
    
    Args:
        balls: 球的位置列表
        
    Returns:
        加上 timestamp 的 vision_output dict
    """
    return {
        "timestamp": datetime.now().isoformat(),
        "balls": balls,
        "count": len(balls)
    }