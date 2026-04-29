# vision/ball_detector.py
"""俯瞰 webcam 球偵測"""

import cv2
import numpy as np
from config.camera_config import BALL_COLOR_LOWER, BALL_COLOR_UPPER, BALL_MIN_AREA


class BallDetector:
    """從俯瞰 webcam frame 找出球的位置"""

    def __init__(self):
        self.lower_hsv = np.array([
            BALL_COLOR_LOWER["h"],
            BALL_COLOR_LOWER["s"],
            BALL_COLOR_LOWER["v"]
        ])
        self.upper_hsv = np.array([
            BALL_COLOR_UPPER["h"],
            BALL_COLOR_UPPER["s"],
            BALL_COLOR_UPPER["v"]
        ])

    def detect(self, frame):
        """
        從俯瞰 webcam frame 找出白球位置。

        策略：白球是檯面上唯一大面積白色的物件（9號球競賽）。
              取最大輪廓當作白球，過濾數字周圍的小面積白點。

        Args:
            frame: numpy.ndarray (BGR 格式，OpenCV 讀取)

        Returns:
            dict: {
                "ball_x": float,  # 球心 X（像素）
                "ball_y": float,  # 球心 Y（像素）
                "ball_r": float,  # 球半徑（像素）
                "found": bool     # 是否找到球
            }
        """
        # 轉 HSV
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # 顏色遮罩（白球：低彩度、高亮度）
        mask = cv2.inRange(hsv, self.lower_hsv, self.upper_hsv)

        # 侵蝕 + 膨脹（去噪）
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.erode(mask, kernel, iterations=1)
        mask = cv2.dilate(mask, kernel, iterations=1)

        # 找輪廓
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return {"ball_x": 0, "ball_y": 0, "ball_r": 0, "found": False}

        # 取最大輪廓（面積最大 = 白球候選）
        largest = max(contours, key=cv2.contourArea)
        contour_area = cv2.contourArea(largest)

        # 面積閾值：太小的當作雜訊（數字周圍的白斑）
        if contour_area < BALL_MIN_AREA:
            return {"ball_x": 0, "ball_y": 0, "ball_r": 0, "found": False}

        (x, y), radius = cv2.minEnclosingCircle(largest)

        return {
            "ball_x": float(x),
            "ball_y": float(y),
            "ball_r": float(radius),
            "found": True
        }
