#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import tkinter as tk
from tkinter import ttk
import threading
import time
import os
import signal

# ===== Process Management =====
running_pids = {}     # {name: pid}  - 會被 STOP ALL 殺掉的
persistent_pids = {}  # {name: pid}  - STOP ALL 不會殺（rqt, image_view）
_root = None

def kill_process(name):
    """用 pkill -f 可靠殺掉行程（不只靠 PID）"""
    for d in (running_pids, persistent_pids):
        pid = d.get(name)
        if pid:
            # 先用 killpg 殺 process group
            try:
                os.killpg(pid, signal.SIGTERM)
            except:
                pass
            time.sleep(0.2)
            try:
                os.killpg(pid, signal.SIGKILL)
            except:
                pass
            # 同時用 pkill 確保殺乾淨（不管 PID 對不對）
            subprocess.run(['pkill', '-f', name], timeout=3)
            d[name] = None
            return

def kill_all():
    """只殺 running_pids，不動 persistent_pids"""
    for name in list(running_pids.keys()):
        kill_process(name)
    update_all_buttons()

def run_bg(name, command):
    """背景執行指令，不彈 terminal"""
    import os
    kill_process(name)  # 先乾淨 kill
    env = os.environ.copy()
    proc = subprocess.Popen(
        ['bash', '-c', f'source ~/catkin_ws/devel/setup.bash && {command}'],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True, env=env
    )
    running_pids[name] = proc.pid
    update_all_buttons()

def run_terminal(name, command):
    """開新 terminal 執行（使用者需要看到輸出）
       Ctrl+C 只殺指令程序，shell 和 Terminal 保持開著
    """
    kill_process(name)
    import platform
    sys = platform.system()
    if sys == 'Darwin':  # macOS
        # trap SIGINT 不傳給子程序，wait 讓 shell 等在這裡不退出
        shell_cmd = (
            f'trap \'\' INT; '
            f'source ~/catkin_ws/devel/setup.bash && {command} & '
            f'ROS_PID=$!; '
            f'wait $ROS_PID; '
            f'echo \"Process ended. Press Enter to close.\"; '
            f'read'
        )
        proc = subprocess.Popen(
            ['osascript', '-e',
             f'tell app \"Terminal\" to do script "{shell_cmd}"'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    else:  # Linux (Ubuntu) - 使用 xterm（訊號傳遞單純）
        import os
        env = os.environ.copy()
        shell_cmd = (
            f'source ~/catkin_ws/devel/setup.bash && {command}; '
            'echo "[ended] press Enter to close"; read'
        )
        proc = subprocess.Popen(
            ['xterm', '-hold', '-e', 'bash', '-c', shell_cmd],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            start_new_session=True, env=env
        )
    running_pids[name] = proc.pid
    update_all_buttons()

def on_stop():
    kill_all()

# ===== GUI State =====
btn_refs = {}   # {name: button_widget}

def update_all_buttons():
    for name, btn in btn_refs.items():
        if running_pids.get(name) or persistent_pids.get(name):
            btn.configure(style='Active.TButton')
        else:
            btn.configure(style='TButton')

# ===== Process Monitor (按鈕狀態同步) =====
def monitor_processes():
    """每2秒檢查所有程序是否還活著，自動更新按鈕狀態"""
    while True:
        dead = []
        for name, pid in running_pids.items():
            if not pid:
                continue
            result = subprocess.run(['ps', '-p', str(pid)],
                                   capture_output=True, timeout=2)
            if result.returncode != 0:
                dead.append(name)
        if dead:
            for name in dead:
                running_pids[name] = None
            if _root:
                _root.after(0, update_all_buttons)
        time.sleep(2)

def start_monitor(root):
    global _root
    _root = root
    t = threading.Thread(target=monitor_processes, daemon=True)
    t.start()

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
    ("M7 隧道(舊)",    "m7",     "roslaunch detect detect_tunnel.launch"),
    ("M7 校正",        "m7cal",  "roslaunch detect detect_tunnel.launch mode:=calibration"),
    ("M7 隧道(新)",    "m7new",  "roslaunch detect detect_tunnel_new.launch"),
]

tools = [  # 未使用，保留給架構參考（實際用 tool_defs）
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

def tb3_forward():   tb3_cmd(linear_x=0.1)
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

# ---- Left Panel: Control Tools + Missions ----
left_panel = tk.Frame(root, bg='#2b2b2b')
left_panel.pack(side=tk.LEFT, padx=15, pady=10)

# 控制工具（疊在任務節點上方）
tk.Label(left_panel, text="控制工具",
         font=('Arial', 11, 'bold'),
         fg='#dddddd', bg='#2b2b2b').pack(pady=(0, 6))

# 特殊按鈕：lane (dl+cl 分開跑)
def run_lane():
    run_bg("lane_dl", "roslaunch detect detect_lane.launch")
    run_bg("lane_cl", "roslaunch control control_lane.launch")
    update_all_buttons()

def run_persistent(name, cmd):
    """rqt / image_view 專用，不被 STOP ALL 殺掉"""
    kill_process(name)  # 先乾淨 kill
    import os
    env = os.environ.copy()
    proc = subprocess.Popen(
        ['bash', '-c', f'source ~/catkin_ws/devel/setup.bash && {cmd}'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True, env=env
    )
    persistent_pids[name] = proc.pid
    update_all_buttons()

def make_tool_btn(label, name, cmd):
    """工廠函式，避免 for 迴圈閉包問題"""
    if name in ("rr", "riv"):
        runner = lambda: run_persistent(name, cmd)
    else:
        runner = lambda: run_bg(name, cmd)
    btn = ttk.Button(left_panel, text=label,
                     command=runner,
                     style='TButton', width=20)
    btn.pack(pady=3, fill='x')
    btn_refs[name] = btn

tool_defs = [
    ("運動控制",           "cmov",   "roslaunch control control_moving.launch"),
    ("影像檢視",           "riv",    "rosrun rqt_image_view rqt_image_view"),
    ("rqt設定參數",        "rr",     "rosrun rqt_reconfigure rqt_reconfigure"),
]
for label, name, cmd in tool_defs:
    make_tool_btn(label, name, cmd)

# 循線按鈕（dl + cl 分別背景執行）
btn_lane = ttk.Button(left_panel, text="循線 (dl+cl)",
                      command=run_lane,
                      style='TButton', width=20)
btn_lane.pack(pady=3, fill='x')
btn_refs["lane"] = btn_lane

# 任務節點 grid（疊在控制工具下方）
tk.Label(left_panel, text="任務節點",
         font=('Arial', 11, 'bold'),
         fg='#dddddd', bg='#2b2b2b').pack(pady=(12, 6))

mission_frame = tk.Frame(left_panel, bg='#2b2b2b')
mission_frame.pack(pady=(0, 0))

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

# ---- Right Panel: STOP + Controller + Tool + D-Pad ----
right_panel = tk.Frame(root, bg='#2b2b2b')
right_panel.pack(side=tk.LEFT, padx=15, pady=10)

# Top row: STOP ALL | rosn | rosnn
top_row = tk.Frame(right_panel, bg='#2b2b2b')
top_row.pack(pady=(0, 12))

stop_btn = ttk.Button(top_row, text="■  STOP ALL",
                      command=on_stop,
                      style='Stop.TButton', width=10)
stop_btn.pack(side=tk.LEFT, padx=3)

def make_controller_btn(label, name, cmd):
    runner = lambda: run_terminal(name, cmd)
    btn = ttk.Button(top_row, text=label,
                     command=runner,
                     style='TButton', width=12)
    btn.pack(side=tk.LEFT, padx=3)
    btn_refs[name] = btn

make_controller_btn("舊 Controller", "rosn",  "rosrun core core_node_controller")
make_controller_btn("新 Controller", "rosnn", "rosrun core core_node_controller_new")

# SLAM / 導航工具
tk.Label(right_panel, text="SLAM / 導航",
         font=('Arial', 11, 'bold'),
         fg='#dddddd', bg='#2b2b2b').pack(pady=(10, 6))

# 定位重置 - 一次性 rostopic pub（非同步，不卡 GUI）
def run_reset():
    threading.Thread(target=lambda:
        subprocess.run(['bash', '-c',
                        'source ~/catkin_ws/devel/setup.bash && '
                        'rostopic pub /reset std_msgs/Empty \'{}\' --once'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
        daemon=True
    ).start()

# 儲存地圖 - 開 Terminal（需要用視窗互動）
def run_save_map():
    run_terminal("savmap", "rosrun map_server map_saver -f ~/map")

slam_btn_defs = [
    ("SLAM建圖",      "slam",    "terminal"),    # 開 Terminal（含 rviz）
    ("鍵盤遙控",      "teleop",  "terminal"),    # 開 Terminal 互動
    ("隧道導航",      "tunnel",  "terminal"),    # 開 Terminal（含 rviz）
    ("儲存地圖",      "savmap",  "save"),        # 開 Terminal 存圖
    ("定位重置",      "reset",   "reset"),       # rostopic pub 一次性
]

def make_slam_btn(label, name, mode):
    """工廠函式，每個按鈕封裝自己的邏輯，閉包問題掰掰"""
    if mode == "terminal":
        if name == "slam":
            cmd = "roslaunch turtlebot3_slam turtlebot3_slam.launch"
        elif name == "teleop":
            cmd = "roslaunch turtlebot3_teleop turtlebot3_teleop_key.launch"
        else:  # tunnel
            cmd = "roslaunch control control_tunnel.launch"
        runner = lambda n=name, c=cmd: run_terminal(n, c)  # 閉包安全：預設參數綁定當下值
    elif mode == "save":
        runner = run_save_map
    elif mode == "reset":
        runner = run_reset
    else:  # bg mode
        if name == "slam":
            cmd = "roslaunch turtlebot3_slam turtlebot3_slam.launch"
        elif name == "teleop":
            cmd = "roslaunch turtlebot3_teleop turtlebot3_teleop_key.launch"
        else:
            cmd = "roslaunch control control_tunnel.launch"
        runner = lambda n=name, c=cmd: run_bg(n, c)  # 閉包安全
    btn = ttk.Button(right_panel, text=label, command=runner,
                     style='TButton', width=20)
    btn.pack(pady=3, fill='x')
    btn_refs[name] = btn

for label, name, mode in slam_btn_defs:
    make_slam_btn(label, name, mode)

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
    persist = [n for n, p in persistent_pids.items() if p]
    if active:
        status.configure(text=f"Running: {', '.join(active)}", fg='#88ff88')
    elif persist:
        status.configure(text=f"Tools: {', '.join(persist)}", fg='#88aaff')
    else:
        status.configure(text="Idle", fg='#888888')
    root.after(500, poll_status)

poll_status()

# 視窗關閉時自動 kill 所有程序
def on_closing():
    kill_all()
    root.destroy()
root.protocol("WM_DELETE_WINDOW", on_closing)

# 啟動程序監控執行緒
start_monitor(root)

root.mainloop()
