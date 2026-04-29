#!/usr/bin/env python3
"""
vision/ball_test_tool.py
球偵測驗證工具 — 驗證 Homography 轉換是否正確

使用方式:
    python ball_test_tool.py

功能:
    1. 讀取 webcam，持續偵測白球位置
    2. 用 Homography 矩陣將 pixel 座標轉換為球檯 mm 座標
    3. 在影像上疊加偵測結果和桌面座標
    4. 可切換 Homography 網格疊加（驗證透視變換）

操作:
    [g] — 開關 Homography 網格疊加
    [s] — 截圖儲存
    [q] — 結束
"""

import cv2
import numpy as np
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from config.camera_config import CAM_GLOBAL, CAM_WIDTH, CAM_HEIGHT, TABLE_WIDTH, TABLE_HEIGHT
from vision.ball_detector import BallDetector
from vision.table_transform import TableTransform


# ── 顏色 ──────────────────────────────────────────────────────────
COLOR_BALL_CENTER  = (0, 255, 255)   # 黃色：球心 pixel
COLOR_TABLE_COORD  = (0, 255, 0)    # 綠色：球檯 mm 座標
COLOR_GRID        = (100, 100, 255) # 淡紅色：Homography 網格
COLOR_NOT_FOUND   = (80, 80, 80)    # 灰色：未偵測到
COLOR_TEXT        = (230, 230, 230)


# ── 繪製 Homography 網格 ────────────────────────────────────────────

def draw_homography_grid(img, transform, num_x=6, num_y=3):
    """
    在影像上繪製 Homography 網格，驗證透視變換是否正確。

    原理：在球檯桌面座標系統中畫均勻格線（每 200mm 一格），
          用 Homography 反映射回 pixel 座標並繪製。
    """
    grid_pts_world = []

    # 生成桌面座標系的格線點
    step_x = TABLE_WIDTH / num_x
    step_y = TABLE_HEIGHT / num_y

    # 垂直線（固定 x）
    for i in range(num_x + 1):
        x = i * step_x
        for j in range(num_y + 1):
            y = j * step_y
            grid_pts_world.append((x, y))

    # 水平線（固定 y）— 頂點已含在垂直線中，只取內部水平線
    for j in range(1, num_y):
        y = j * step_y
        for i in range(num_x + 1):
            x = i * step_x
            grid_pts_world.append((x, y))

    # 轉換到 pixel 座標（使用反向矩陣）
    H_inv = transform.get_matrix()
    world_arr = np.array([[[wx, wy]] for wx, wy in grid_pts_world], dtype=np.float64)
    pixel_arr = cv2.perspectiveTransform(world_arr, H_inv)

    # 繪製
    h, w = img.shape[:2]

    for i in range(num_x + 1):
        # 垂直線
        col = [pixel_arr[i * (num_y + 1) + j][0] for j in range(num_y + 1)]
        col = [(int(px), int(py)) for px, py in col if 0 <= px < w and 0 <= py < h]
        if len(col) >= 2:
            cv2.polylines(img, [np.array(col, dtype=np.int32)], False, COLOR_GRID, 1)

    for j in range(1, num_y + 1):
        # 水平線（跳過已繪製的頂點）
        base = j * (num_x + 1)
        row = [pixel_arr[base + i][0] for i in range(num_x + 1)]
        row = [(int(px), int(py)) for px, py in row if 0 <= px < w and 0 <= py < h]
        if len(row) >= 2:
            cv2.polylines(img, [np.array(row, dtype=np.int32)], False, COLOR_GRID, 1)

    # 繪製球檯邊界
    corners_world = np.array([
        [[0, 0]],
        [[TABLE_WIDTH, 0]],
        [[TABLE_WIDTH, TABLE_HEIGHT]],
        [[0, TABLE_HEIGHT]]
    ], dtype=np.float64)
    corners_pixel = cv2.perspectiveTransform(corners_world, H_inv)
    pts = [(int(p[0][0]), int(p[0][1])) for p in corners_pixel]
    cv2.polylines(img, [np.array(pts, dtype=np.int32)], True, (200, 200, 100), 2)


# ── 繪製球偵測結果 ─────────────────────────────────────────────────

def draw_detection(img, ball_result, table_result, show_grid, transform):
    """
    在影像上繪製偵測結果。

    Args:
        img: 原始影像副本（會直接修改）
        ball_result: ball_detector.detect() 的回傳值
        table_result: table_transform.pixel_to_table() 的回傳值
        show_grid: bool，是否顯示 Homography 網格
        transform: TableTransform 實例
    """
    h, w = img.shape[:2]
    found = ball_result["found"]

    # Homography 網格（底層）
    if show_grid:
        draw_homography_grid(img, transform)

    # 球偵測結果（上層）
    if found:
        bx = int(ball_result["ball_x"])
        by = int(ball_result["ball_y"])
        br = int(ball_result["ball_r"])

        # 外圈
        cv2.circle(img, (bx, by), br + 5, (0, 200, 255), 2)
        # 球心十字
        cv2.line(img, (bx - 15, by), (bx + 15, by), COLOR_BALL_CENTER, 2)
        cv2.line(img, (bx, by - 15), (bx, by + 15), COLOR_BALL_CENTER, 2)
        # 球心文字
        cv2.putText(img, f"({bx}, {by})", (bx + 18, by - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_BALL_CENTER, 1)

        # 桌面座標
        tx = table_result["table_x"]
        ty = table_result["table_y"]
        cv2.putText(img, f"TABLE: ({tx:.0f}, {ty:.0f})mm",
                    (bx + 18, by + 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_TABLE_COORD, 2)

        status_text = "BALL DETECTED"
        status_color = COLOR_TABLE_COORD
    else:
        # 未偵測到
        cv2.putText(img, "BALL NOT DETECTED", (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (80, 80, 255), 2)
        status_text = "NO BALL"
        status_color = (80, 80, 255)

    # 狀態列（右下角）
    info_lines = [
        f"Webcam #{CAM_GLOBAL}  {w}x{h}",
        f"FPS: ---",
        f"Status: {status_text}",
    ]
    lh = 22
    for i, line in enumerate(info_lines):
        color = status_color if "Status" in line else (150, 150, 150)
        cv2.putText(img, line, (w - 250, h - 20 - (len(info_lines) - 1 - i) * lh),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

    # 控制說明（左下角）
    help_lines = [
        "[g] 網格 ON/OFF",
        "[s] 截圖",
        "[q] 結束",
    ]
    overlay = img.copy()
    cv2.rectangle(overlay, (5, h - 80), (160, h - 5), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, img, 0.4, 0, img)
    for i, line in enumerate(help_lines):
        cv2.putText(img, line, (10, h - 60 + i * lh),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)


# ── 主程式 ────────────────────────────────────────────────────────

def run_ball_test():
    # 初始化
    cap = cv2.VideoCapture(CAM_GLOBAL)
    if not cap.isOpened():
        print(f"[錯誤] 無法開啟 webcam {CAM_GLOBAL}")
        return False

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  CAM_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

    detector = BallDetector()
    transform = TableTransform()

    show_grid = True   # 預設開啟網格，方便驗證

    # 嘗試讀取第一幀確認 Homography 是否已校正
    ret, frame = cap.read()
    if not ret:
        print("[錯誤] webcam 讀取失敗")
        return False

    # 檢查 Homography 是否為單位矩陣（未校正）
    H = transform.get_matrix()
    is_identity = np.allclose(H, np.eye(3), atol=0.01)

    if is_identity:
        print("\n[警告] Homography 尚未校正（使用單位矩陣）")
        print("  建議先執行 homography_calibrator.py 完成校正")
        print("  否則座標轉換會使用線性映射（會不準）\n")

    window_name = "Ball Test Tool"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    print("\n" + "="*50)
    print("  Ball Test Tool — 球偵測驗證工具")
    print("="*50)
    print("  [g] 網格 ON/OFF")
    print("  [s] 截圖")
    print("  [q] 結束")
    print("="*50 + "\n")

    frame_count = 0
    fps = 0
    fps_time = cv2.getTickCount()

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[錯誤] webcam 讀取失敗")
            break

        # 球偵測
        ball = detector.detect(frame)

        # 座標轉換
        if ball["found"]:
            table = transform.pixel_to_table(ball["ball_x"], ball["ball_y"])
        else:
            table = {"table_x": 0, "table_y": 0}

        # 繪製
        display = frame.copy()
        draw_detection(display, ball, table, show_grid, transform)

        # FPS 計算
        frame_count += 1
        if frame_count >= 10:
            t = (cv2.getTickCount() - fps_time) / cv2.getTickFrequency()
            fps = frame_count / t
            fps_time = cv2.getTickCount()
            frame_count = 0

        # FPS 文字更新（動態替換倒數第二行）
        h, w = display.shape[:2]
        cv2.putText(display,
                    f"FPS: {fps:.1f}",
                    (w - 250, h - 20 - 1 * 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)

        cv2.imshow(window_name, display)

        key = cv2.waitKey(1) & 0xFF

        if key == ord('g'):
            show_grid = not show_grid
            print(f"[網格] {'開啟' if show_grid else '關閉'}")
        elif key == ord('s'):
            path = f"/tmp/ball_test_{cv2.getTickCount()}.png"
            cv2.imwrite(path, display)
            print(f"[截圖] 已儲存: {path}")
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    return True


# ── 入口 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    ok = run_ball_test()
    sys.exit(0 if ok else 1)
