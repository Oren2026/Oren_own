#!/usr/bin/env python3
"""
vision/homography_calibrator.py
4點校正工具 — 建立透視變換矩陣

使用方式:
    python homography_calibrator.py

操作模式（選擇一種）:

  [1] Marker 模式（快速，鏡頭固定能看到全部4角）:
      → 點擊球檯4個物理角落（左上/右上/右下/左下）
      → 自動用球檯尺寸 1200×630mm 計算 Homography
      → 不需要輸入數字

  [2] Manual 模式（通用，任意4點）:
      → 點擊球檯4個參考點
      → 依序輸入各點的實際 mm 座標
      → 支援斜透视/非矩形校正

操作流程:
    1. 執行後選擇 webcam（預設 CAM_GLOBAL=0）
    2. 選擇模式（1 或 2）
    3. 依序點擊球檯四個角
    4. 若為 Manual 模式，填入各點的世界座標
    5. 計算 Homography 並寫入 config/camera_config.py
    6. 校正點座標寫入 config/calibration_data.py

點擊順序（兩種模式相同）:
    p0: 左上角  →  p1: 右上角  →  p2: 右下角  →  p3: 左下角
"""

import cv2
import numpy as np
import os
import sys
import re

# 專案根目錄
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from config.camera_config import CAM_GLOBAL, CAM_WIDTH, CAM_HEIGHT, TABLE_WIDTH, TABLE_HEIGHT


# ── 已知球檯尺寸（mm，用於 Marker 模式）─────────────────────────
# 球檯坐標系：x=0 在左側（近桿弟）, y=0 在近端
# 原點在球檯左下角
TABLE_KNOWN_CORNERS_MM = np.array([
    [0,              0],                    # p0: 左上角 → (0, 0)
    [TABLE_WIDTH,    0],                    # p1: 右上角 → (1200, 0)
    [TABLE_WIDTH,    TABLE_HEIGHT],        # p2: 右下角 → (1200, 630)
    [0,              TABLE_HEIGHT]         # p3: 左下角 → (0, 630)
], dtype=np.float64)


# ── 互動式點擊Callback ────────────────────────────────────────────

class ClickCollector:
    """滑鼠點擊收集器"""

    def __init__(self, window_name, num_points=4):
        self.window_name = window_name
        self.num_points = num_points
        self.points = []          # pixel 座標 [(x, y), ...]
        self.done = False

    def click(self, event, x, y, flags, param):
        """OpenCV 滑鼠回調"""
        if event == cv2.EVENT_LBUTTONDOWN and not self.done:
            self.points.append((x, y))
            print(f"  ✓ 記錄點 {len(self.points)}: pixel=({x}, {y})")
            if len(self.points) >= self.num_points:
                self.done = True
                print(f"\n[完成] 已收集 {self.num_points} 個校正點")


# ── 世界座標輸入（Manual 模式）─────────────────────────────────────

def get_world_coords_manual(num_points=4):
    """Manual 模式：依序輸入各校正點的世界座標（mm）。"""
    print("\n" + "="*50)
    print("請依序輸入每個校正點的球檯實際座標（mm）")
    print(f"球檯尺寸：{TABLE_WIDTH} × {TABLE_HEIGHT} mm")
    print("x=0, y=0 在球檯左下角")
    print("="*50 + "\n")

    world_pts = []
    labels = ["左上角 (p0)", "右上角 (p1)", "右下角 (p2)", "左下角 (p3)"]

    for i in range(num_points):
        while True:
            try:
                label = labels[i] if i < len(labels) else f"點 {i}"
                raw = input(f"  {label} 的世界座標（格式: X,Y）: ").strip()
                x_str, y_str = raw.split(",")
                wx = float(x_str.strip())
                wy = float(y_str.strip())
                world_pts.append((wx, wy))
                print(f"    → 世界座標: ({wx}, {wy}) mm")
                break
            except (ValueError, IndexError):
                print("    ✗ 格式錯誤，請重新輸入（例: 0,630）")

    return world_pts


# ── 繪圖輔助 ──────────────────────────────────────────────────────

CORNERS_COLOR = (0, 255, 0)
LINE_COLOR    = (0, 200, 200)
TEXT_COLOR    = (0, 255, 0)


def draw_crosshair(img, x, y, size=10, color=(0, 255, 0), thick=2):
    cv2.line(img, (x - size, y), (x + size, y), color, thick)
    cv2.line(img, (x, y - size), (x, y + size), color, thick)


def draw_corners(img, pixel_pts, world_pts, collected, mode=""):
    """在影像上繪製所有已記錄的校正點。"""
    labels = ["p0 左上", "p1 右上", "p2 右下", "p3 左下"]

    if collected >= 2:
        pts = np.array(pixel_pts[:collected], dtype=np.int32)
        cv2.polylines(img, [pts], False, LINE_COLOR, 2)

    for i in range(collected):
        px, py = pixel_pts[i]
        wx, wy = world_pts[i] if (i < len(world_pts) and world_pts[i] is not None) else (0, 0)

        cv2.circle(img, (px, py), 16, CORNERS_COLOR, 2)
        draw_crosshair(img, px, py, size=6, color=CORNERS_COLOR, thick=2)
        cv2.putText(img, f"{labels[i]}", (px + 18, py - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, TEXT_COLOR, 2)

        if mode == "manual" and world_pts and i < len(world_pts):
            cv2.putText(img, f"({wx:.0f},{wy:.0f})mm", (px + 18, py + 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)


def draw_instructions(img, stage, collected, total=4, mode=""):
    """在畫面角落繪製操作說明"""
    lh = 22
    pad = 10

    if stage == "mode_select":
        lines = [
            "=== 4點校正工具 ===",
            "",
            "選擇模式:",
            "  [1] Marker 模式（快速）",
            "     點球檯4個角落",
            "     自動用已知尺寸計算",
            "     不需輸入數字",
            "",
            "  [2] Manual 模式（通用）",
            "     點任意4個參考點",
            "     手動輸入世界座標",
            "     支援斜透視/非矩形",
            "",
            "按 1 或 2 選擇模式...",
        ]
    elif stage == "click":
        mode_desc = "Marker" if mode == "marker" else "Manual"
        lines = [
            f"=== {mode_desc} 模式 ===",
            f"請依序點擊球檯四個角（共 {total} 點）",
            f"已記錄: {collected} / {total}",
            "",
            "點擊順序:",
            "  p0: 左上角",
            "  p1: 右上角",
            "  p2: 右下角",
            "  p3: 左下角",
            "",
        ]
        if mode == "marker":
            lines += [
                f"球檯尺寸: {TABLE_WIDTH}×{TABLE_HEIGHT}mm",
                "（自動使用，無需輸入）",
            ]
        else:
            lines += [
                "完成後按任意鍵繼續...",
            ]
    elif stage == "compute":
        lines = ["校正完成！", "計算 Homography 中..."]
    elif stage == "done":
        lines = ["✓ 校正完成！", "矩陣已寫入 config/", "建議執行 ball_test_tool.py 驗證"]
    else:
        lines = []

    n = len(lines)
    overlay = img.copy()
    cv2.rectangle(overlay, (5, 5), (360, 30 + n * lh + pad), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)

    for i, line in enumerate(lines):
        color = (0, 255, 0) if "✓" in line or "完成" in line else (220, 220, 220)
        cv2.putText(img, line, (10, 25 + i * lh),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)


# ── Homography 計算 ────────────────────────────────────────────────

def compute_homography(pixel_pts, world_pts):
    """計算 Homography 並做驗證。"""
    src = np.array(pixel_pts, dtype=np.float32)
    dst = np.array(world_pts, dtype=np.float32)

    H, mask = cv2.findHomography(src, dst)
    if H is None:
        raise ValueError("Homography 計算失敗（點可能共線）")

    H_inv, _ = cv2.findHomography(dst, src)

    # 驗證：pixel→world→pixel 重投影誤差
    recon = cv2.perspectiveTransform(src.reshape(-1, 1, 2), H)
    errors = np.linalg.norm(recon.squeeze() - dst, axis=1)
    max_err = float(np.max(errors))
    mean_err = float(np.mean(errors))

    return H, H_inv, max_err, mean_err


# ── 主校正流程 ────────────────────────────────────────────────────

def run_calibration():
    cap = cv2.VideoCapture(CAM_GLOBAL)
    if not cap.isOpened():
        print(f"[錯誤] 無法開啟 webcam {CAM_GLOBAL}")
        return False

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  CAM_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

    window_name = "Homography Calibrator"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    collector = ClickCollector(window_name)
    cv2.setMouseCallback(window_name, collector.click)

    pixel_pts = []
    world_pts = []
    stage = "mode_select"
    mode = ""

    print("\n" + "="*50)
    print("  Homography 4點校正工具")
    print(f"  球檯尺寸：{TABLE_WIDTH} × {TABLE_HEIGHT} mm")
    print("="*50 + "\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[錯誤] webcam 讀取失敗")
            break

        display = frame.copy()
        collected = len(collector.points)

        if stage == "mode_select":
            draw_instructions(display, stage, 0)
        else:
            draw_corners(display, collector.points,
                        world_pts if mode == "manual" else [],
                        collected, mode)
            draw_instructions(display, stage, collected, mode=mode)

        h, w = display.shape[:2]
        cv2.putText(display, f"Webcam #{CAM_GLOBAL}  {w}x{h}", (w - 220, h - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 150), 1)

        cv2.imshow(window_name, display)
        key = cv2.waitKey(1) & 0xFF

        # ── 模式選擇 ──
        if stage == "mode_select":
            if key == ord('1'):
                mode = "marker"
                stage = "click"
                print("\n[模式] Marker 模式（快速）")
                print("  → 點擊球檯4個角落，自動用已知尺寸計算")
            elif key == ord('2'):
                mode = "manual"
                stage = "click"
                print("\n[模式] Manual 模式（通用）")
                print("  → 點擊後需輸入世界座標")
            elif key == ord('q'):
                break
            continue

        # ── 點擊階段 ──
        if stage == "click" and collector.done:
            pixel_pts = collector.points[:]
            print(f"\n[資訊] 已記錄 {len(pixel_pts)} 個 pixel 座標:")
            for i, (px, py) in enumerate(pixel_pts):
                print(f"  p{i}: ({px}, {py})")

            if mode == "marker":
                world_pts = TABLE_KNOWN_CORNERS_MM.tolist()
                print(f"\n[Marker] 使用球檯已知尺寸:")
                for i, (wx, wy) in enumerate(world_pts):
                    print(f"  p{i}: ({wx}, {wy}) mm")
                stage = "compute"
            else:
                world_pts = get_world_coords_manual(num_points=4)
                stage = "compute"
                print("\n[計算] 正在計算 Homography 矩陣...")

        # ── 計算階段 ──
        elif stage == "compute":
            try:
                H, H_inv, max_err, mean_err = compute_homography(pixel_pts, world_pts)
            except ValueError as e:
                print(f"[錯誤] {e}")
                break

            print(f"\n✓ Homography 矩陣（3x3）:")
            print(H)
            print(f"\n✓ 反向矩陣（3x3）:")
            print(H_inv)
            print(f"\n驗證（pixel→world→pixel 重投影）:")
            print(f"  最大誤差: {max_err:.2f} mm")
            print(f"  平均誤差: {mean_err:.2f} mm")

            if max_err > 10:
                print(f"  ⚠ 誤差稍大，建議重新校正")

            save_calibration_data(H, H_inv, pixel_pts, world_pts, mode)
            stage = "done"

        # ── 完成階段 ──
        elif stage == "done":
            cv2.waitKey(0)
            break

        if key == ord('q'):
            print("\n[取消] 校正中斷")
            break

    cap.release()
    cv2.destroyAllWindows()
    return stage == "done"


# ── 寫入設定檔 ────────────────────────────────────────────────────

def save_calibration_data(H, H_inv, pixel_pts, world_pts, mode):
    """將 Homography 和校正點寫入 config/"""

    H_flat = ", ".join([f"{v:.8f}" for v in H.flatten()])
    H_inv_flat = ", ".join([f"{v:.8f}" for v in H_inv.flatten()])

    pixel_str = ", ".join([f"({px}, {py})" for (px, py) in pixel_pts])
    world_str = ", ".join([f"({wx:.1f}, {wy:.1f})" for (wx, wy) in world_pts])

    # 更新 camera_config.py：PERSPECTIVE_MATRIX
    camera_config_path = os.path.join(ROOT, "config", "camera_config.py")
    with open(camera_config_path, "r", encoding="utf-8") as f:
        config_content = f.read()

    new_matrix = f"PERSPECTIVE_MATRIX = [\n    {H_flat}\n]"

    if "PERSPECTIVE_MATRIX" in config_content:
        config_content = re.sub(
            r"PERSPECTIVE_MATRIX\s*=\s*\[.*?\]",
            new_matrix,
            config_content,
            flags=re.DOTALL
        )

    with open(camera_config_path, "w", encoding="utf-8") as f:
        f.write(config_content)

    # 寫入 calibration_data.py
    calib_data_path = os.path.join(ROOT, "config", "calibration_data.py")

    homography_block = f"""

# ── Homography 校正資料（自動產生）───────────────────────────────
# 校正模式: {mode}
HOMOGRAPHY_MATRIX = [
    {H_flat}
]

HOMOGRAPHY_INVERSE = [
    {H_inv_flat}
]

# 校正點（pixel 座標，點擊順序：p0左上→p1右上→p2右下→p3左下）
PIXEL_CORNERS = [{pixel_str}]

# 校正點（球檯世界座標 mm）
WORLD_CORNERS = [{world_str}]

# 校正時間
CALIBRATION_TIMESTAMP = None
"""

    with open(calib_data_path, "a", encoding="utf-8") as f:
        f.write(homography_block)

    print(f"\n✓ 寫入 config/camera_config.py")
    print(f"✓ 寫入 config/calibration_data.py")
    print(f"\n校正完成！建議執行 ball_test_tool.py 驗證。")


# ── 入口 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    ok = run_calibration()
    sys.exit(0 if ok else 1)
