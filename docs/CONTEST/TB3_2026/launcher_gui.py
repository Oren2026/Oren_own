#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import tkinter as tk
from tkinter import ttk

# ===== Process Management =====
running_pids = {}   # {name: pid}

def kill_process(name):
    global running_pids
    if name in running_pids and running_pids[name]:
        try:
            import os, signal
            os.killpg(running_pids[name], signal.SIGTERM)
        except:
            pass
        running_pids[name] = None

def kill_all():
    for name in list(running_pids.keys()):
        kill_process(name)
    update_all_buttons()

def run_bg(name, command):
    """背景執行指令，不彈 terminal"""
    kill_process(name)
    proc = subprocess.Popen(
        ['bash', '-c', f'source ~/catkin_ws/devel/setup.bash && {command}'],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True
    )
    running_pids[name] = proc.pid
    update_all_buttons()

def on_stop():
    kill_all()
    update_all_buttons()

# ===== GUI State =====
btn_refs = {}   # {name: button_widget}

def update_all_buttons():
    for name, btn in btn_refs.items():
        if running_pids.get(name):
            btn.configure(style='Active.TButton')
        else:
            btn.configure(style='TButton')

# ===== Mission Definitions =====
missions = [
    ("M1 交通號誌",     "m1",     "roslaunch detect detect_traffic_light.launch"),
    ("M1 校正",        "m1cal",  "roslaunch detect detect_traffic_light.launch mode:=calibration"),
    ("M2 S彎道",       "m2",     "roslaunch detect detect_lane.launch && roslaunch detect detect_intersection.launch"),
    ("M2 校正",        "m2cal",  "roslaunch detect detect_lane.launch mode:=calibration"),
    ("M3 施工區",      "m3",     "roslaunch detect detect_construction.launch"),
    ("M3 校正",        "m3cal",  "roslaunch detect detect_construction.launch mode:=calibration"),
    ("M4 停車",        "m4",     "roslaunch detect detect_parking.launch"),
    ("M4 校正",        "m4cal",  "roslaunch detect detect_parking.launch mode:=calibration"),
    ("M5 M彎道",       "m5",     "roslaunch detect detect_lane.launch && roslaunch control control_lane.launch"),
    ("M5 校正",        "m5cal",  "roslaunch detect detect_lane.launch mode:=calibration"),
    ("M6 平交道",      "m6",     "roslaunch detect detect_level.launch"),
    ("M6 校正",        "m6cal",  "roslaunch detect detect_level.launch mode:=calibration"),
    ("M7 隧道",        "m7",     "roslaunch detect detect_tunnel.launch"),
    ("M7 校正",        "m7cal",  "roslaunch detect detect_tunnel.launch mode:=calibration"),
]

tools = [
    ("狀態機",         "rosn",   "rosrun core core_node_controller.py"),
    ("循線 (dl+cl)",   "lane",   "roslaunch detect detect_lane.launch && roslaunch control control_lane.launch"),
    ("rqt 設定",       "rr",     "rosrun rqt_reconfigure rqt_reconfigure"),
    ("影像檢視",       "riv",    "rosrun rqt_image_view rqt_image_view"),
]

# ===== Styles =====
def setup_styles():
    s = ttk.Style()
    s.theme_use('clam')

    # Active button (running) - gray with inset shadow feel
    s.configure('Active.TButton',
                background='#cccccc',
                foreground='#555555',
                borderwidth=2,
                relief='sunken',
                font=('Arial', 10, 'bold'))
    s.map('Active.TButton',
          background=[('active', '#bbbbbb')])

    # Normal button
    s.configure('TButton',
                background='#e0e0e0',
                foreground='#333333',
                borderwidth=1,
                relief='raised',
                font=('Arial', 10))
    s.map('TButton',
          background=[('active', '#d0d0d0')])

    # Stop button - red
    s.configure('Stop.TButton',
                background='#ff4444',
                foreground='white',
                borderwidth=2,
                relief='raised',
                font=('Arial', 11, 'bold'))
    s.map('Stop.TButton',
          background=[('active', '#cc2222')])

# ===== GUI =====
root = tk.Tk()
root.title("TB3 2026 AutoRace Launcher")
root.configure(bg='#2b2b2b')
setup_styles()

# ---- Title ----
title = tk.Label(root, text="TB3 2026 AutoRace",
                 font=('Arial', 16, 'bold'),
                 fg='white', bg='#2b2b2b')
title.pack(pady=(12, 6))

subtitle = tk.Label(root, text="Mission Launcher",
                    font=('Arial', 10),
                    fg='#aaaaaa', bg='#2b2b2b')
subtitle.pack(pady=(0, 12))

# ---- Mission Grid ----
mission_frame = tk.Frame(root, bg='#2b2b2b')
mission_frame.pack(side=tk.LEFT, padx=15, pady=10)

row = 0
for label, name, cmd in missions:
    if row == 0:
        tk.Label(mission_frame, text="任務節點",
                 font=('Arial', 11, 'bold'),
                 fg='#dddddd', bg='#2b2b2b').grid(row=row, column=0, columnspan=4, pady=(0, 8))
        row += 1

    col = (row - 1) % 2
    btn = ttk.Button(mission_frame, text=label,
                      command=lambda n=name, c=cmd: run_bg(n, c),
                      style='TButton', width=18)
    btn.grid(row=row, column=col, padx=5, pady=4)
    btn_refs[name] = btn

    # Always advance row after placing button
    row += 1

# ---- Tool Buttons (right side) ----
tool_frame = tk.Frame(root, bg='#2b2b2b')
tool_frame.pack(side=tk.LEFT, padx=15, pady=10)

tk.Label(tool_frame, text="控制工具",
         font=('Arial', 11, 'bold'),
         fg='#dddddd', bg='#2b2b2b').pack(pady=(0, 8))

for label, name, cmd in tools:
    btn = ttk.Button(tool_frame, text=label,
                     command=lambda n=name, c=cmd: run_bg(n, c),
                     style='TButton', width=20)
    btn.pack(pady=4, fill='x')
    btn_refs[name] = btn

# ---- Stop Button ----
tk.Frame(root, bg='#2b2b2b', height=20).pack()
stop_frame = tk.Frame(root, bg='#2b2b2b')
stop_frame.pack(pady=10)

stop_btn = ttk.Button(stop_frame, text="■  STOP ALL",
                      command=on_stop,
                      style='Stop.TButton', width=22)
stop_btn.pack()

# ---- Status Bar ----
status = tk.Label(root, text="Ready",
                  font=('Arial', 9),
                  fg='#888888', bg='#2b2b2b')
status.pack(pady=(5, 8))

def poll_status():
    active = [n for n, p in running_pids.items() if p]
    if active:
        status.configure(text=f"Running: {', '.join(active)}", fg='#88ff88')
    else:
        status.configure(text="Idle", fg='#888888')
    root.after(500, poll_status)

poll_status()

root.mainloop()
