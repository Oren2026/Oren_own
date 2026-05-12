# vision_plugin.py
"""視覺 Plugin — 讀 webcam、偵測球位置、發佈事件"""

import cv2
import numpy as np
from base_plugin import BasePlugin
from event_bus import EventBus, Event
from interfaces.vision_output import BallPosition

# 舊有模組（遷入使用）
from vision.ball_detector import BallDetector
from vision.table_transform import TableTransform


class VisionPlugin(BasePlugin):
    """
    視覺 Plugin

    職責：
      1. 讀取 webcam frame
      2. 偵測白球位置（pixel → 球檯座標 mm）
      3. 發佈 vision.frame（供 UI 顯示）
      4. 發佈 vision.ball_position（供 Motion 决策）

    訂閱：無
    發佈：
      - vision.frame          — 原始 webcam frame
      - vision.ball_position  — 球在球檯座標（mm）+ 信心度
    """

    name = "vision"

    def __init__(self, bus: EventBus = None, camera_id: int = 0):
        super().__init__(bus)
        self.camera_id = camera_id
        self.cap = None
        self.frame = None

        # 偵測元件
        self.ball_detector = BallDetector()
        self.table_transform = TableTransform()

    # ── BasePlugin 實作 ─────────────────────────────────────

    def init(self) -> bool:
        self.cap = cv2.VideoCapture(self.camera_id)
        if not self.cap.isOpened():
            print(f"[VisionPlugin] 無法開啟 webcam {self.camera_id}")
            return False
        print(f"[VisionPlugin] webcam {self.camera_id} 啟動")
        return True

    def update(self) -> None:
        """讀取一幀，執行球偵測，發佈事件"""
        if self.cap is None:
            return

        ret, frame = self.cap.read()
        if not ret:
            return

        self.frame = frame.copy()

        # 發佈 frame（供 UI 顯示）
        if self.bus:
            self.bus.publish("vision.frame", frame)

        # 執行球偵測
        ball_pixel = self.ball_detector.detect(frame)
        if ball_pixel["found"]:
            # pixel → 球檯座標（mm）
            table_pos = self.table_transform.pixel_to_table(
                ball_pixel["ball_x"],
                ball_pixel["ball_y"]
            )

            # 信心度：輪廓面積越大越可靠
            area = ball_pixel.get("ball_r", 0) ** 2 * 3.14159
            confidence = min(1.0, area / 1000.0)

            ball_pos = BallPosition(
                x=table_pos["table_x"],
                y=table_pos["table_y"],
                z=0.0,
                confidence=confidence
            )

            # 發佈 ball_position
            if self.bus:
                self.bus.publish("vision.ball_position", ball_pos.to_dict())

    def shutdown(self) -> None:
        if self.cap:
            self.cap.release()
            self.cap = None
        print("[VisionPlugin] 已關閉")