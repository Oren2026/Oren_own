# vision/cue_align.py
"""近拍 webcam 桿頭對位"""

import cv2
import numpy as np


class CueAligner:
    """從近拍 webcam 確認桿頭是否對齊目標"""

    def __init__(self, tolerance=5):
        """
        Args:
            tolerance: 對齊容忍度（像素）
        """
        self.tolerance = tolerance

    def align(self, frame, target_x, target_y):
        """
        Args:
            frame: numpy.ndarray (BGR 格式)
            target_x: float  # 目標球心 X（像素）
            target_y: float  # 目標球心 Y（像素）

        Returns:
            dict: {
                "cue_tip_x": float,   # 桿頭 X（像素）
                "cue_tip_y": float,   # 桿頭 Y（像素）
                "offset_x": float,    # 與目標 X 差距（像素）
                "offset_y": float,    # 與目標 Y 差距（像素）
                "aligned": bool       # 是否在容忍範圍內
            }
        """
        # TODO: 實作邊緣偵測找桿頭
        # 暫時回傳模擬值
        return {
            "cue_tip_x": 0.0,
            "cue_tip_y": 0.0,
            "offset_x": abs(target_x),
            "offset_y": abs(target_y),
            "aligned": False
        }
