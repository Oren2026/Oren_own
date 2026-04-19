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

def run_terminal(name, command):
    """開新 terminal 執行（使用者需要看到輸出）"""
    kill_process(name)
    proc = subprocess.Popen(
        ['osascript', '-e',
         f'tell app \"Terminal\" to do script \"source ~/catkin_ws/devel/setup.bash && {command} && read\"'],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
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
    ("M2 S彎道",       "m2",     "roslaunch detect detect_intersection.launch"),
    ("M2 校正",        "m2cal",  "roslaunch detect detect_lane.launch mode:=calibration"),
    ("M3 施工區",      "m3",     "roslaunch detect detect_construction.launch"),
    ("M3 校正",        "m3cal",  "roslaunch detect detect_construction.launch mode:=calibration"),
    ("M4 停車",        "m4",     "roslaunch detect detect_parking.launch"),
    ("M4 校正",        "m4cal",  "roslaunch detect detect_parking.launch mode:=calibration"),
    ("M5 M彎道",       "m5",     "roslaunch control control_lane.launch"),
    ("M5 校正",        "m5cal",  "roslaunch detect detect_lane.launch mode:=calibration"),
    ("M6 平交道",      "m6",     "roslaunch detect detect_level.launch"),
    ("M6 校正",        "m6cal",  "roslaunch detect detect_level.launch mode:=calibration"),
    ("M7 隧道",        "m7",     "roslaunch detect detect_tunnel.launch"),
    ("M7 校正",        "m7cal",  "roslaunch detect detect_tunnel.launch mode:=calibration"),
]

tools = [
    ("執行任務",       "rosn",   "rosrun core core_node_controller.py"),
    ("循線 (dl+cl)",   "lane",   "roslaunch detect detect_lane.launch && roslaunch control control_lane.launch"),
    ("rqt 設定",       "rr",     "rosrun rqt_reconfigure rqt_reconfigure"),
    ("影像檢視",       "riv",    "rosrun rqt_image_view rqt_image_view"),
]

# ===== TurtleBot Direct Control (via /cmd_vel) =====
def tb3_cmd(linear_x=0, angular_z=0, duration=0.3):
    """直接發 /cmd_vel 指令"""
    import threading
    def send():
        subprocess.run(
            ['bash', '-c',
             f'source ~/catkin_ws/devel/setup.bash && '
             f'rostopic pub /cmd_vel geometry_msgs/Twist "{{linear: {{x: {linear_x}, y: 0, z: 0}}, angular: {{x: 0, y: 0, z: {angular_z}}}}}" --once'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    threading.Thread(target=send, daemon=True).start()

def tb3_forward():   tb3_cmd(linear_x=0.15)
def tb3_backward():  tb3_cmd(linear_x=-0.1)
def tb3_left():      tb3_cmd(angular_z=0.5)
def tb3_right():     tb3_cmd(angular_z=-0.5)
def tb3_stop():      tb3_cmd(0, 0)

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

# Header row
tk.Label(mission_frame, text="任務節點",
         font=('Arial', 11, 'bold'),
         fg='#dddddd', bg='#2b2b2b').grid(row=0, column=0, columnspan=2, pady=(0, 8), sticky='w')

# 每兩筆一組（M1+Cal, M2+Cal, ...），排在同一 row
for i in range(0, len(missions), 2):
    row = 1 + i // 2
    for col_offset, item in enumerate(missions[i:i+2]):
        label, name, cmd = item
        btn = ttk.Button(mission_frame, text=label,
                          command=lambda n=name, c=cmd: run_bg(n, c),
                          style='TButton', width=18)
        btn.grid(row=row, column=col_offset, padx=5, pady=4)
        btn_refs[name] = btn

# ---- Right Panel: STOP + Tool + D-Pad ----
right_panel = tk.Frame(root, bg='#2b2b2b')
right_panel.pack(side=tk.LEFT, padx=15, pady=10)

# STOP ALL - top of right panel
stop_btn = ttk.Button(right_panel, text="■  STOP ALL",
                      command=on_stop,
                      style='Stop.TButton', width=22)
stop_btn.pack(pady=(0, 12))

# 控制工具
tk.Label(right_panel, text="控制工具",
         font=('Arial', 11, 'bold'),
         fg='#dddddd', bg='#2b2b2b').pack(pady=(0, 6))

for label, name, cmd in tools:
    if name == "rosn":
        runner = lambda n=name, c=cmd: run_terminal(n, c)
    else:
        runner = lambda n=name, c=cmd: run_bg(n, c)
    btn = ttk.Button(right_panel, text=label,
                     command=runner,
                     style='TButton', width=20)
    btn.pack(pady=3, fill='x')
    btn_refs[name] = btn

# 方向控制
tk.Label(right_panel, text="方向控制",
         font=('Arial', 11, 'bold'),
         fg='#dddddd', bg='#2b2b2b').pack(pady=(10, 6))

dpad_grid = tk.Frame(right_panel, bg='#2b2b2b')
dpad_grid.pack()

dpad_style_normal = {'bg': '#4a4a4a', 'fg': 'white', 'font': ('Arial', 14, 'bold'),
                     'relief': 'raised', 'bd': 2, 'width': 5, 'height': 2}

def make_triangle_btn(parent, text, cmd, row, col, colspan=1):
    btn = tk.Button(parent, text=text, command=cmd, **dpad_style_normal)
    btn.grid(row=row, column=col, columnspan=colspan, padx=3, pady=3)
    return btn

btn_up    = make_triangle_btn(dpad_grid, "^", tb3_forward,  0, 1)
btn_left  = make_triangle_btn(dpad_grid, "<", tb3_left,     1, 0)
btn_x     = make_triangle_btn(dpad_grid, "X", tb3_stop,     1, 1)
btn_right = make_triangle_btn(dpad_grid, ">", tb3_right,   1, 2)
btn_down  = make_triangle_btn(dpad_grid, "v", tb3_backward, 2, 1)

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
