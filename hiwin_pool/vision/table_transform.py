# vision/table_transform.py
"""影像座標 -> 桌面座標 轉換"""

import cv2
import numpy as np

from config.camera_config import PERSPECTIVE_MATRIX, TABLE_WIDTH, TABLE_HEIGHT


class TableTransform:
    """
    將 webcam 像素座標轉換為球檯真實座標（mm）。

    使用 Homography 矩陣做透視變換。
    校正後矩陣由 homography_calibrator.py 寫入 config/camera_config.py。
    """

    def __init__(self, matrix=None):
        """
        Args:
            matrix: list of 9 floats, optional
                    若未提供則從 camera_config 讀取 PERSPECTIVE_MATRIX
        """
        if matrix is None:
            matrix = PERSPECTIVE_MATRIX
        self.matrix = np.array(matrix, dtype=np.float64).reshape(3, 3)
        self.table_width  = TABLE_WIDTH
        self.table_height = TABLE_HEIGHT

    def pixel_to_table(self, pixel_x, pixel_y):
        """
        將單一像素座標轉換為球檯桌面座標（mm）。

        Args:
            pixel_x: float  # 像素座標 X
            pixel_y: float  # 像素座標 Y

        Returns:
            dict: {
                "table_x": float,   # 桌面座標（mm）
                "table_y": float    # 桌面座標（mm）
            }
        """
        # cv2.perspectiveTransform 需要 (N, 1, 2) 格式
        pt = np.array([[[float(pixel_x), float(pixel_y)]]], dtype=np.float64)
        transformed = cv2.perspectiveTransform(pt, self.matrix)
        table_x, table_y = transformed[0][0]

        return {"table_x": float(table_x), "table_y": float(table_y)}

    def pixels_to_table(self, pixel_coords):
        """
        批次轉換多個像素座標。

        Args:
            pixel_coords: list of (x, y) tuples

        Returns:
            list of (table_x, table_y) tuples
        """
        if not pixel_coords:
            return []
        pts = np.array([[[px, py]] for px, py in pixel_coords], dtype=np.float64)
        transformed = cv2.perspectiveTransform(pts, self.matrix)
        return [(float(t[0][0]), float(t[0][1])) for t in transformed]

    def set_perspective_matrix(self, matrix):
        """設定透視變換矩陣（9個數字的list或np.array）"""
        self.matrix = np.array(matrix, dtype=np.float64).reshape(3, 3)

    def get_matrix(self):
        """回傳目前的 Homography 矩陣（3x3 np.array）"""
        return self.matrix.copy()
