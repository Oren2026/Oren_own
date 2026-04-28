# main.py
"""上銀撞球 — 主程式"""

import sys
import time
import cv2

from config import *
from vision import BallDetector, CueAligner, TableTransform
from comm import HIWINArm, ArduinoController
from motion import StrikeController, TrajectoryPlanner, SafetyMonitor
from analysis import ShotLogger, TrajectoryModel, Calibrator
from ui import Dashboard, TunePanel


def main():
    print("=== 上銀撞球程式啟動 ===\n")

    # 初始化元件
    print("[1/5] 初始化視覺模組...")
    ball_detector = BallDetector()
    cue_aligner = CueAligner()
    table_transform = TableTransform()
    print("  完成\n")

    print("[2/5] 初始化通訊模組...")
    arm = HIWINArm()
    arduino = ArduinoController()

    # 嘗試連線（失敗不影響啟動）
    if arm.connect():
        print("  手臂連線成功")
    else:
        print("  手臂連線失敗（確認 IP 設定）")

    if arduino.connect():
        print("  Arduino 連線成功")
    else:
        print("  Arduino 連線失敗（確認 COM port）")
    print()

    print("[3/5] 初始化運動模組...")
    strike_ctrl = StrikeController(arm, arduino)
    planner = TrajectoryPlanner()
    safety = SafetyMonitor(arm)
    print("  完成\n")

    print("[4/5] 初始化分析模組...")
    logger = ShotLogger()
    trajectory_model = TrajectoryModel()
    calibrator = Calibrator(trajectory_model)
    print("  完成\n")

    print("[5/5] 初始化 UI...")
    dashboard = Dashboard()
    tune_panel = TunePanel()
    print("  完成\n")

    #  webcam 測試
    print("開啟 webcam 測試（按 q 結束）...")
    cap = cv2.VideoCapture(CAM_GLOBAL)
    
    shot_count = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print(" webcam 讀取失敗")
                break

            # 球偵測
            ball_info = ball_detector.detect(frame)
            
            # 更新狀態
            status = {
                "ball_found": ball_info["found"],
                "ball_x": ball_info["ball_x"],
                "ball_y": ball_info["ball_y"],
                "arm_position": arm.get_position(),
                "arduino_ready": arduino.connected,
                "force_level": tune_panel.current_force
            }

            # 顯示 webcam + 狀態疊加
            dashboard.show(status)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                print("使用者按下 q，結束")
                break
            elif key == ord('t'):
                tune_panel.select_force_level()

    finally:
        cap.release()
        cv2.destroyAllWindows()
        arm.disconnect()
        arduino.disconnect()
        print("\n程式結束")


if __name__ == "__main__":
    main()
