#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import tkinter as tk
from tkinter import ttk
import sys

# 嘗試設定中文字型
try:
    tkinter_font = tk.font.Font(family="Noto Sans CJK TC", size=10)
except:
    try:
        tkinter_font = tk.font.Font(family="WenQuanYi Micro Hei", size=10)
    except:
        tkinter_font = None

def run_terminal(command):
    """在新終端機執行指令"""
    # GNOME Terminal（Ubuntu 預設）
    subprocess.Popen(['gnome-terminal', '--', 'bash', '-c', f'{command}; exec bash'])

def run_in_new_window(command):
    """在新視窗執行（通用）"""
    try:
        # 嘗試 GNOME Terminal
        subprocess.Popen(['gnome-terminal', '--', 'bash', '-c', f'{command}; exec bash'])
    except FileNotFoundError:
        try:
            # 嘗試 xterm
            subprocess.Popen(['xterm', '-hold', '-e', command])
        except FileNotFoundError:
            # 都沒有，直接執行（在前台跑）
            print(f"執行：{command}")

# ===== 任務按鈕 =====
def on_m1():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_traffic_light.launch')

def on_m1cal():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_traffic_light.launch mode:=calibration')

def on_m2():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_lane.launch && roslaunch detect detect_intersection.launch')

def on_m2cal():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_lane.launch mode:=calibration')

def on_m3():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_construction.launch')

def on_m3cal():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_construction.launch mode:=calibration')

def on_m4():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_parking.launch')

def on_m4cal():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_parking.launch mode:=calibration')

def on_m5():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_lane.launch && roslaunch control control_lane.launch')

def on_m5cal():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_lane.launch mode:=calibration')

def on_m6():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_level.launch')

def on_m6cal():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_level.launch mode:=calibration')

def on_m7():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_tunnel.launch')

def on_m7cal():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_tunnel.launch mode:=calibration')

# ===== 控制按鈕 =====
def on_core():
    run_terminal('source ~/catkin_ws/devel/setup.bash && rosrun core core_node_controller.py')

def on_rqt_reconfigure():
    run_terminal('source ~/catkin_ws/devel/setup.bash && rosrun rqt_reconfigure rqt_reconfigure')

def on_rqt_image():
    run_terminal('source ~/catkin_ws/devel/setup.bash && rosrun rqt_image_view rqt_image_view')

def on_stop():
    run_terminal('pkill -f "roslaunch"')

def on_lane():
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch detect detect_lane.launch')
    run_terminal('source ~/catkin_ws/devel/setup.bash && roslaunch control control_lane.launch')

# ===== GUI =====
root = tk.Tk()
root.title("TB3 2026 AutoRace 控制面板")
root.resizable(False, False)

# Mission 按鈕框架
mission_frame = ttk.LabelFrame(root, text="Mission Nodes")
mission_frame.pack(side=tk.LEFT, padx=10, pady=10)

# 每關：正常 + 校正 兩個按鈕
missions = [
    ("M1 TrafficLight",    on_m1,      "M1 Cal",       on_m1cal),
    ("M2 S_Curve",         on_m2,      "M2 Cal",       on_m2cal),
    ("M3 Construction",    on_m3,      "M3 Cal",       on_m3cal),
    ("M4 Parking",         on_m4,      "M4 Cal",       on_m4cal),
    ("M5 M_Curve",         on_m5,      "M5 Cal",       on_m5cal),
    ("M6 LevelCrossing",   on_m6,      "M6 Cal",       on_m6cal),
    ("M7 Tunnel",          on_m7,      "M7 Cal",       on_m7cal),
]

for i, (label_a, cmd_a, label_b, cmd_b) in enumerate(missions):
    btn_a = ttk.Button(mission_frame, text=label_a, command=cmd_a, width=15)
    if tkinter_font:
        btn_a.configure(font=tkinter_font)
    btn_a.grid(row=i, column=0, padx=5, pady=3)

    btn_b = ttk.Button(mission_frame, text=label_b, command=cmd_b, width=10)
    if tkinter_font:
        btn_b.configure(font=tkinter_font)
    btn_b.grid(row=i, column=1, padx=5, pady=3)

# 控制框架
control_frame = ttk.LabelFrame(root, text="Control Tools")
control_frame.pack(side=tk.LEFT, padx=10, pady=10)

ttk.Button(control_frame, text="State Machine (rosn)",  command=on_core,           width=18).pack(pady=3)
ttk.Button(control_frame, text="Lane (dl+cl)",          command=on_lane,            width=18).pack(pady=3)
ttk.Button(control_frame, text="rqt_reconfigure",        command=on_rqt_reconfigure, width=18).pack(pady=3)
ttk.Button(control_frame, text="rqt_image_view",         command=on_rqt_image,       width=18).pack(pady=3)

ttk.Separator(control_frame, orient='horizontal').pack(fill='x', pady=8)

stop_btn = ttk.Button(control_frame, text="STOP (Emergency)", command=on_stop, width=18)
if tkinter_font:
    stop_btn.configure(font=tkinter_font)
stop_btn.pack(pady=3)

# 說明
info = tk.Label(root, text="Opens in new terminal\nCalibration: rosrr to adjust params", font=("Arial", 9), fg="gray")
info.pack(side=tk.BOTTOM, pady=5)

root.mainloop()
