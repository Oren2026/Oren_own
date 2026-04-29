# interfaces/strategy_output.py
"""
strategy → motion 介面

格式：dict，一次規劃一顆球
來源：strategy/YOUR_VERSION/*.py
輸出至：motion/strike.py

Example:
    {
        "target_ball": {"x_mm": 350.5, "y_mm": 210.0},
        "target_pocket": {"x_mm": 0, "y_mm": 630},
        "strike_point": {"x_mm": 300.0, "y_mm": 200.0},
        "force": 7,
        "cue_ball_pos": {"x_mm": 600.0, "y_mm": 315.0},
    }
"""

from typing import Dict, Any, List

__all__ = ["StrategyOutput", "validate_strategy_output", "create_strategy_output"]


class StrategyOutput:
    """策略輸出資料結構"""
    
    REQUIRED_FIELDS = {"target_ball", "target_pocket", "strike_point", "force", "cue_ball_pos"}
    
    def __init__(self, data: Dict[str, Any]):
        self.data = data
    
    def to_dict(self) -> Dict[str, Any]:
        return self.data


def validate_strategy_output(data: Any) -> bool:
    """
    驗證 strategy_output 格式是否正確
    
    Args:
        data: 要驗證的資料
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    if not isinstance(data, dict):
        raise ValueError(f"strategy_output must be a dict, got {type(data).__name__}")
    
    # 檢查必要欄位
    missing = StrategyOutput.REQUIRED_FIELDS - set(data.keys())
    if missing:
        raise ValueError(f"strategy_output missing required fields: {missing}")
    
    # 驗證每個座標點
    coord_fields = ["target_ball", "target_pocket", "strike_point", "cue_ball_pos"]
    for field in coord_fields:
        if not isinstance(data[field], dict):
            raise ValueError(f"'{field}' must be a dict with x_mm, y_mm keys")
        if "x_mm" not in data[field] or "y_mm" not in data[field]:
            raise ValueError(f"'{field}' must have x_mm and y_mm keys")
    
    # 驗證 force 範圍
    force = data["force"]
    if not isinstance(force, (int, float)):
        raise ValueError(f"'force' must be numeric, got {type(force).__name__}")
    if force < 1 or force > 12:
        raise ValueError(f"'force' must be between 1-12, got {force}")
    
    return True


def create_strategy_output(
    target_ball: Dict[str, float],
    target_pocket: Dict[str, float],
    strike_point: Dict[str, float],
    force: int,
    cue_ball_pos: Dict[str, float]
) -> Dict[str, Any]:
    """
    建立 strategy_output
    
    Args:
        target_ball: 目標球座標 {"x_mm": float, "y_mm": float}
        target_pocket: 目標袋座標 {"x_mm": float, "y_mm": float}
        strike_point: 擊球點座標 {"x_mm": float, "y_mm": float}
        force: 力道等級 (1-12)
        cue_ball_pos: 母球位置 {"x_mm": float, "y_mm": float}
        
    Returns:
        strategy_output dict
    """
    return {
        "target_ball": target_ball,
        "target_pocket": target_pocket,
        "strike_point": strike_point,
        "force": force,
        "cue_ball_pos": cue_ball_pos
    }