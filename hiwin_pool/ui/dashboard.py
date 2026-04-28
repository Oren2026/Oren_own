# ui/dashboard.py
"""即時狀態顯示面板"""

import cv2
import numpy as np
from config.camera_config import CAM_WIDTH, CAM_HEIGHT


class Dashboard:
    """即時狀態顯示"""

    def __init__(self, width=CAM_WIDTH, height=CAM_HEIGHT):
        self.width = width
        self.height = height
        self.font = cv2.FONT_HERSHEY_SIMPLEX

    def create_frame(self, status):
        """
        建立狀態顯示 frame

        Args:
            status: dict，包含：
                - ball_found: bool
                - ball_x, ball_y: float
                - arm_position: dict
                - arduino_ready: bool
                - force_level: int

        Returns:
            numpy.ndarray: 狀態圖像
        """
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)

        y = 30
        cv2.putText(frame, "=== Pool Robot Status ===", (10, y), self.font, 0.7, (255, 255, 255), 2)
        y += 40

        # Ball status
        ball_text = f"Ball: {'Found' if status.get('ball_found') else 'Not Found'}"
        color = (0, 255, 0) if status.get('ball_found') else (0, 0, 255)
        cv2.putText(frame, ball_text, (10, y), self.font, 0.5, color, 1)
        y += 30

        if status.get('ball_found'):
            bx = status.get('ball_x', 0)
            by = status.get('ball_y', 0)
            cv2.putText(frame, f"  Position: ({bx:.0f}, {by:.0f})", (10, y), self.font, 0.4, (200, 200, 200), 1)
            y += 25

        # Arm position
        arm_pos = status.get('arm_position', {})
        cv2.putText(frame, f"Arm: ({arm_pos.get('x', 0):.0f}, {arm_pos.get('y', 0):.0f}, {arm_pos.get('z', 0):.0f})", (10, y), self.font, 0.5, (255, 255, 255), 1)
        y += 30

        # Arduino status
        arduino_text = f"Arduino: {'Ready' if status.get('arduino_ready') else 'Not Ready'}"
        color = (0, 255, 0) if status.get('arduino_ready') else (0, 0, 255)
        cv2.putText(frame, arduino_text, (10, y), self.font, 0.5, color, 1)
        y += 30

        # Force level
        cv2.putText(frame, f"Force Level: {status.get('force_level', 1)}", (10, y), self.font, 0.5, (255, 255, 0), 1)

        return frame

    def show(self, status):
        """顯示狀態（搭配 webcam feed）"""
        frame = self.create_frame(status)
        cv2.imshow("Pool Robot Dashboard", frame)
