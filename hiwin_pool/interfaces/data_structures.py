# interfaces/data_structures.py
"""
資料結構標準定義

所有模組間的資料傳遞都必須使用這裡定義的資料結構。
"""

from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class BallPosition:
    """
    球在相機畫面中的位置（pixel 座標）

    來源：vision/ball_detector.py
    輸出至：vision/table_transform.py
    """
    frame: any              # 原始 frame（供視覺化用）
    x_px: float            # 球心 X 像素座標
    y_px: float            # 球心 Y 像素座標
    radius_px: float       # 球半徑（pixel）
    confidence: float      # 偵測置信度（0.0 ~ 1.0）
    timestamp: float       # 時間戳（秒）


@dataclass
class TableCoord:
    """
    球在球檯三維座標系中的位置（mm）

    來源：vision/table_transform.py（經過 Homography 轉換）
    輸出至：strategy/YOUR_VERSION/*.py
    """
    x_mm: float            # 檯面 X（mm）
    y_mm: float            # 檯面 Y（mm）
    z_mm: float            # 高度（通常為 0，桌面平面）
    cue_ball: bool         # 是否為母球


@dataclass
class StrikeCmd:
    """
    擊球指令（strategy 輸出給 motion）

    來源：strategy/YOUR_VERSION/*.py
    輸出至：motion/strike.py
    """
    target_x_mm: float     # 目標球 X（mm）
    target_y_mm: float     # 目標球 Y（mm）
    cue_x_mm: float        # 母球 X（mm）
    cue_y_mm: float        # 母球 Y（mm）
    force_level: int       # 力道等級（1-12）
    direction_deg: float   # 擊球方向（度）
    spin: Optional[str]    # 附加旋轉（"top", "back", "side", None）
    wait_after_ms: int     # 擊球後等待時間（ms）


@dataclass
class ArmPosition:
    """
    手臂末端座標（mm + 姿態）

    來源：comm/hiwin_arm.py（get_position）
    輸出至：motion/*.py、ui/*.py
    """
    x: float
    y: float
    z: float
    a: float               # RX（度）
    b: float               # RY（度）
    c: float               # RZ（度）


@dataclass
class VisionResult:
    """
    視覺模組最終輸出（包含所有墜段資訊）

    來源：vision/*.py（整合所有視覺分析）
    輸出至：strategy、ui、motion
    """
    balls: list            # [BallPosition, ...]
    table_coords: list      # [TableCoord, ...]
    cue_ball_idx: int      # 母球索引
    homography_matrix: any # 透視變換矩陣（供視覺化）
    timestamp: float