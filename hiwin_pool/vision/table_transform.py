# vision/table_transform.py
"""影像座標 -> 桌面座標 轉換"""

import numpy as np
from config.camera_config import PERSPECTIVE_MATRIX, TABLE_WIDTH, TABLE_HEIGHT


class TableTransform:
    """將 webcam 像素座標轉換為球檯真實座標"""

    def __init__(self):
        self.matrix = np.array(PERSPECTIVE_MATRIX).reshape(3, 3)
        self.table_width = TABLE_WIDTH
        self.table_height = TABLE_HEIGHT

    def pixel_to_table(self, pixel_x, pixel_y):
        """
        Args:
            pixel_x: float  # 像素座標 X
            pixel_y: float  # 像素座標 Y

        Returns:
            dict: {
                "table_x": float,   # 桌面座標（mm）
                "table_y": float    # 桌面座標（mm）
            }
        """
        # TODO: 實作透視變換
        # 暫時用線性映射
        table_x = (pixel_x / 640) * self.table_width
        table_y = (pixel_y / 480) * self.table_height
        return {"table_x": float(table_x), "table_y": float(table_y)}

    def set_perspective_matrix(self, matrix):
        """設定透視變換矩陣"""
        self.matrix = np.array(matrix).reshape(3, 3)
