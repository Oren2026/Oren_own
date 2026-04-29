#!/usr/bin/env python3
"""
test_arm_to_ball.py
Step 3：球偵測 → Homography 轉換 → 手臂移到白球上方

驗證流程:
    webcam 讀取 → 白球偵測 → 像素→桌面座標 → 手臂移到 (Bx, By, SAFE_Z)

Z軸策略（此階段）:
    - 所有指令 Z強制 = SAFE_Z_HEIGHT = 200mm
    - 不允許下降（Z_MIN = 50mm 軟限制）
    - 下一階段才實作 STRIKE_Z_HEIGHT = 50 下降擊球

使用方式:
    python test_arm_to_ball.py

操作:
    [space] — 執行一次：偵測 → 移動手臂到白球上方
    [r]     — 復位 Arduino（桿弟機構）
    [q]     — 結束
"""

import cv2
import time
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from config.camera_config import CAM_GLOBAL, CAM_WIDTH, CAM_HEIGHT
from config.arm_config import SAFE_Z_HEIGHT, Z_MIN, Z_MAX, SOCKET_TIMEOUT
from vision.ball_detector import BallDetector
from vision.table_transform import TableTransform
from comm.hiwin_arm import HIWINArm
from comm.arduino_serial import ArduinoController


# ── 安全限制 ──────────────────────────────────────────────────────

def clamp_z(z):
    """Z軸軟限制（不低於 Z_MIN）"""
    return max(Z_MIN, min(z, Z_MAX))


def format_position(pos):
    """格式化位置輸出"""
    if not pos:
        return "N/A"
    return f"X={pos['x']:.1f} Y={pos['y']:.1f} Z={pos['z']:.1f} A={pos['a']:.1f}"


# ── 主程式 ────────────────────────────────────────────────────────

def run_test():
    # ── 初始化構件 ──
    cap = cv2.VideoCapture(CAM_GLOBAL)
    if not cap.isOpened():
        print(f"[錯誤] 無法開啟 webcam {CAM_GLOBAL}")
        return False

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  CAM_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

    ball_detector = BallDetector()
    table_transform = TableTransform()

    arm = HIWINArm()
    arduino = ArduinoController()

    # ── 連線 ──
    print("\n" + "="*50)
    print("  Step 3：手臂移到白球上方")
    print("="*50)
    print(f"  目標 Z高度: {SAFE_Z_HEIGHT} mm（固定不降）")
    print(f"  Z軟限制: {Z_MIN} ~ {Z_MAX} mm")
    print()

    arm_conn = arm.connect()
    print(f"  手臂 TCP: {'連線成功' if arm_conn else '連線失敗（類比模式）'}")

    ard_conn = arduino.connect()
    print(f"  Arduino: {'連線成功' if ard_conn else '連線失敗（類比模式）'}")

    if not arm_conn:
        print("\n[注意] 手臂未連線，將以類比模式運行（只顯示指令，不實際移動）")
    if not ard_conn:
        print("[注意] Arduino 未連線，擊球機構將不會運作")

    print()
    print("="*50)
    print("  操作:")
    print("  [空白鍵] 偵測球 → 移動手臂到球上方")
    print("  [r]       復位 Arduino（桿弟機構）")
    print("  [q]       結束")
    print("="*50 + "\n")

    # ── 視窗初始化 ──
    window_name = "Step 3: Arm to Ball"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    last_ball = None
    last_table = None
    arm_target = None
    arm_result = None
    move_done = False
    last_move_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        display = frame.copy()
        h, w = frame.shape[:2]

        # ── 球偵測 ──
        ball = ball_detector.detect(frame)

        if ball["found"]:
            table = table_transform.pixel_to_table(ball["ball_x"], ball["ball_y"])
            last_ball = ball
            last_table = table

            # 繪製球偵測
            bx, by, br = int(ball["ball_x"]), int(ball["ball_y"]), int(ball["ball_r"])
            cv2.circle(display, (bx, by), br + 5, (0, 200, 255), 2)
            cv2.line(display, (bx - 12, by), (bx + 12, by), (0, 255, 255), 2)
            cv2.line(display, (bx, by - 12), (bx, by + 12), (0, 255, 255), 2)
            cv2.putText(display, f"PEL: ({bx}, {by})", (bx + 18, by - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
            cv2.putText(display, f"TBL: ({table['table_x']:.0f}, {table['table_y']:.0f})mm",
                        (bx + 18, by + 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)

            status_color = (0, 255, 0)
            status_text = "BALL DETECTED"
        else:
            cv2.putText(display, "BALL NOT DETECTED", (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (80, 80, 255), 2)
            status_color = (80, 80, 255)
            status_text = "NO BALL"

        # ── 手臂目標顯示 ──
        if arm_target:
            tx, ty = arm_target["x"], arm_target["y"]
            tz = arm_target["z"]
            cv2.putText(display,
                        f"ARM → ({tx:.0f}, {ty:.0f}, {tz:.0f})mm",
                        (20, h - 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 200, 0), 2)

            if arm_result:
                res_str = "OK" if arm_result["success"] else f"ERR: {arm_result['error']}"
                res_color = (0, 255, 0) if arm_result["success"] else (80, 80, 255)
                cv2.putText(display, f"Result: {res_str}",
                            (20, h - 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, res_color, 1)

        # ── 狀態列 ──
        cv2.putText(display, f"Webcam #{CAM_GLOBAL}  {w}x{h}", (w - 230, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)
        cv2.putText(display, f"Status: {status_text}", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
        cv2.putText(display, f"SAFE_Z={SAFE_Z_HEIGHT}mm  Z_limit=[{Z_MIN},{Z_MAX}]",
                    (w - 300, h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)

        cv2.imshow(window_name, display)

        # ── 按鍵處理 ──
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            break

        elif key == ord('r'):
            # 復位 Arduino
            print("\n[Arduino] 復位中...")
            if ard_conn:
                result = arduino.reset()
                if result["complete"]:
                    print(f"  ✓ 復位完成")
                else:
                    print(f"  ✗ 復位失敗: {result['error']}")
            else:
                print("  （Arduino 未連線）")

        elif key == 32:  # 空白鍵
            # 偵測 → 手臂移動
            if not ball["found"]:
                print("\n[警告] 找不到球，無法移動手臂")
                continue

            bx, by = ball["ball_x"], ball["ball_y"]
            table_x = table["table_x"]
            table_y = table["table_y"]
            safe_z = clamp_z(SAFE_Z_HEIGHT)

            print(f"\n{'='*40}")
            print(f"  球偵測: pixel=({bx:.0f}, {by:.0f})")
            print(f"  桌面座標: ({table_x:.0f}, {table_y:.0f})mm")
            print(f"  手臂目標: ({table_x:.0f}, {table_y:.0f}, {safe_z:.0f})mm")
            print(f"{'='*40}")

            arm_target = {
                "x": float(table_x),
                "y": float(table_y),
                "z": float(safe_z)
            }

            if arm_conn:
                print("\n[手臂] 移動中...")
                # PTP 到安全高度（Z軸先到）
                home_z = 300
                arm_result = arm.ptp(arm_target["x"], arm_target["y"], home_z)
                time.sleep(0.5)

                # LIN 到目標位置（Z軸下降）
                arm_result = arm.lin(arm_target["x"], arm_target["y"], arm_target["z"])

                if arm_result["success"]:
                    print(f"  ✓ 到達 ({arm_target['x']:.0f}, {arm_target['y']:.0f}, {arm_target['z']:.0f})mm")
                else:
                    print(f"  ✗ 移動失敗: {arm_result['error']}")
            else:
                print("  （類比模式：已計算指令但未實際發送）")
                arm_result = {"success": True, "error": ""}

            move_done = True
            last_move_time = time.time()

    # ── 清理 ──
    cap.release()
    cv2.destroyAllWindows()
    arm.disconnect()
    arduino.disconnect()

    return True


# ── 入口 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    ok = run_test()
    sys.exit(0 if ok else 1)
