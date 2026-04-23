#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TB3 動作序列編輯器（簡化版）
拼接 moving 指令，匯出可執行的 parking/construction 程式碼
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import time
import threading


# ============================
# Block 定義
# ============================
class SequenceBlock(tk.Frame):
    """序列中的單一指令區塊"""

    TYPE_NAMES = {3: "旋轉", 4: "前進", 5: "後退", 0: "等待", 6: "fake_lane"}
    TYPE_UNITS = {3: "度", 4: "cm", 5: "cm", 0: "秒", 6: ""}

    def __init__(self, parent, block_type, value, on_delete, on_change, index, extra_label=""):
        super().__init__(parent, bg='#2b2b2b', relief='solid', bd=1)
        self.block_type = block_type
        self.value = value
        self.on_delete = on_delete
        self.on_change = on_change
        self.index = index
        self.extra_label = extra_label
        self._build()

    def _build(self):
        type_name = self.TYPE_NAMES.get(self.block_type, "?")
        lbl_text = f"{type_name}{self.extra_label}"
        lbl = tk.Label(self, text=lbl_text,
                       bg='#4a4a4a', fg='white', font=('Arial', 11, 'bold'),
                       width=8, relief='raised')
        lbl.pack(side=tk.LEFT, padx=5, pady=5)

        unit = self.TYPE_UNITS.get(self.block_type, "")
        val_frame = tk.Frame(self, bg='#2b2b2b')
        val_frame.pack(side=tk.LEFT, padx=5)
        self.val_var = tk.StringVar(value=str(self.value))
        ent = tk.Entry(val_frame, textvariable=self.val_var, width=7,
                       font=('Arial', 11), bg='#3a3a3a', fg='white',
                       insertbackground='white')
        ent.pack(side=tk.LEFT)
        tk.Label(val_frame, text=unit, bg='#2b2b2b', fg='#aaaaaa',
                font=('Arial', 10)).pack(side=tk.LEFT, padx=3)
        self.val_var.trace('w', lambda *_: self._notify_change())

        del_btn = tk.Button(self, text="✕", command=self.on_delete,
                           bg='#8b0000', fg='white', font=('Arial', 10, 'bold'),
                           width=3, relief='raised')
        del_btn.pack(side=tk.RIGHT, padx=5, pady=5)

        up_btn = tk.Button(self, text="▲",
                          command=lambda: self.on_change(self.index, self.block_type, self.value, -1),
                          bg='#3a3a3a', fg='white', font=('Arial', 8), width=3, relief='raised')
        up_btn.pack(side=tk.RIGHT, padx=2)
        dn_btn = tk.Button(self, text="▼",
                          command=lambda: self.on_change(self.index, self.block_type, self.value, 1),
                          bg='#3a3a3a', fg='white', font=('Arial', 8), width=3, relief='raised')
        dn_btn.pack(side=tk.RIGHT, padx=2)

        tk.Label(self, text=f"#{self.index+1}", bg='#2b2b2b', fg='#888888',
                font=('Arial', 9)).pack(side=tk.LEFT, padx=(0, 5))

    def _notify_change(self):
        try:
            val = float(self.val_var.get())
        except ValueError:
            val = self.value
        self.on_change(self.index, self.block_type, val, 0)


# ============================
# ROS 指令發送（與 launcher_gui 方向鍵同原理）
# ============================
def send_moving(block_type, value):
    """
    與 launcher_gui 方向鍵相同邏輯：直接發 rostopic pub --once
    control_moving 會自己處理車子何時停（靠 /odom 迴圈判斷）
    """
    if block_type == 0:
        time.sleep(value)
        return

    if block_type == 3:  # 旋轉：value = 度數（正=左，負=右）
        angular = abs(value)
        mtype = 2 if value > 0 else 3  # 2=left, 3=right
        cmd = (f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
               f"'{{moving_type: {mtype}, moving_value_linear: 0.0, moving_value_angular: {angular}}}' --once")
    elif block_type == 4:  # 前進：value = 公分，轉公尺
        linear = value / 100.0
        cmd = (f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
               f"'{{moving_type: 4, moving_value_linear: {linear}, moving_value_angular: 0.0}}' --once")
    elif block_type == 5:  # 後退：value = 公分，轉公尺
        linear = value / 100.0
        cmd = (f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
               f"'{{moving_type: 5, moving_value_linear: {linear}, moving_value_angular: 0.0}}' --once")
    else:
        return

    subprocess.run(
        ['bash', '-c', f'cd /home/autorace && source ~/catkin_ws/devel/setup.bash && {cmd}'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


# ============================
# 主視窗
# ============================
class MotionEditor:
    TYPE_LABELS = {
        4: "前進 (cm)",
        5: "後退 (cm)",
        3: "旋轉 (度)",
        0: "等待 (秒)",
    }

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("TB3 動作序列編輯器")
        self.root.configure(bg='#2b2b2b')
        self.root.geometry("860x800")
        self.root.minsize(860, 800)

        self.sequence = []
        self.block_widgets = []
        self.is_running = False

        self._build()

    def _build(self):
        # ===== 中間：序列區 =====
        center = tk.Frame(self.root, bg='#2b2b2b')
        center.pack(side=tk.LEFT, fill='both', expand=True, padx=10, pady=10)

        tk.Label(center, text="動作序列（▲▼ 調整順序）",
                font=('Arial', 11, 'bold'),
                fg='white', bg='#2b2b2b').pack(anchor='w', pady=(0, 8))

        seq_frame = tk.Frame(center, bg='#252525', relief='solid', bd=1)
        seq_frame.pack(fill='both', expand=True, pady=(0, 0))

        self.canvas = tk.Canvas(seq_frame, bg='#252525', highlightthickness=0)
        scrollbar = ttk.Scrollbar(seq_frame, orient='vertical', command=self.canvas.yview)
        self.seq_view = tk.Frame(self.canvas, bg='#252525')

        self.canvas.configure(yscrollcommand=scrollbar.set)
        self.canvas.pack(side=tk.LEFT, fill='both', expand=True)
        scrollbar.pack(side=tk.RIGHT, fill='y')

        self.canvas_window = self.canvas.create_window(
            (4, 4), window=self.seq_view, anchor='nw')
        self.seq_view.bind('<Configure>',
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox('all')))
        self.canvas.bind('<Configure>',
            lambda e: self.canvas.itemconfig(self.canvas_window, width=e.width - 8))

        self.empty_label = tk.Label(self.seq_view, text="（空序列，按左側按鈕新增）",
                                    fg='#555', bg='#252525', font=('Arial', 10))
        self.empty_label.pack(pady=40)

        # ===== 右側面板 =====
        right = tk.Frame(self.root, bg='#1e1e1e')
        right.pack(side=tk.LEFT, fill='y', padx=(0, 10), pady=10)

        # ---- 1. 執行控制（緊湊）----
        tk.Label(right, text="執行控制",
                font=('Arial', 11, 'bold'),
                fg='white', bg='#1e1e1e').pack(pady=(10, 4))

        self.status_label = tk.Label(right, text="待機",
                                     fg='#aaaaaa', bg='#1e1e1e', font=('Arial', 10))
        self.status_label.pack()

        self.exec_btn = tk.Button(right, text="▶ 執行序列",
                                  command=self.execute_sequence,
                                  bg='#1a3a1a', fg='#88ff88',
                                  font=('Arial', 10, 'bold'),
                                  relief='raised', width=16)
        self.exec_btn.pack(pady=3)

        self.stop_btn = tk.Button(right, text="■ 停止",
                                  command=self.stop_execute,
                                  bg='#3a1a1a', fg='#ff8888',
                                  font=('Arial', 10, 'bold'),
                                  state='disabled',
                                  relief='raised', width=16)
        self.stop_btn.pack(pady=3)

        # ---- 分隔線 ----
        tk.Label(right, text="─" * 16, bg='#1e1e1e', fg='#333').pack(pady=4)

        # ---- 2. 即時遙控（方向鍵，給足夠空間）----
        tk.Label(right, text="即時遙控",
                font=('Arial', 10, 'bold'),
                fg='#dddddd', bg='#1e1e1e').pack()

        dpad_frame = tk.Frame(right, bg='#1e1e1e')
        dpad_frame.pack(pady=5)

        dpad_btn = {'relief': 'raised', 'bd': 2,
                    'font': ('Arial', 11, 'bold'),
                    'width': 5, 'height': 1}

        # ▲ 前進
        tk.Button(dpad_frame, text="▲",
                 command=lambda: self._dpad_add(4, 10),
                 bg='#3a3a3a', fg='white', **dpad_btn).grid(row=0, column=1, padx=3, pady=2)

        # ◀ 左旋   X 停止   ▶ 右旋
        tk.Button(dpad_frame, text="◀",
                 command=lambda: self._dpad_add(3, 90),
                 bg='#3a3a3a', fg='white', **dpad_btn).grid(row=1, column=0, padx=3, pady=2)
        tk.Button(dpad_frame, text="X",
                 command=self._dpad_stop,
                 bg='#5a3a3a', fg='#ffcccc', **dpad_btn).grid(row=1, column=1, padx=3, pady=2)
        tk.Button(dpad_frame, text="▶",
                 command=lambda: self._dpad_add(3, -90),
                 bg='#3a3a3a', fg='white', **dpad_btn).grid(row=1, column=2, padx=3, pady=2)

        # ▼ 後退
        tk.Button(dpad_frame, text="▼",
                 command=lambda: self._dpad_add(5, 10),
                 bg='#3a3a3a', fg='white', **dpad_btn).grid(row=2, column=1, padx=3, pady=2)

        tk.Label(dpad_frame, text="前進/後退 10cm · 左/右旋 90°",
                bg='#1e1e1e', fg='#666',
                font=('Arial', 8)).grid(row=3, column=0, columnspan=3, pady=(4, 0))

        # ---- 分隔線 ----
        tk.Label(right, text="─" * 16, bg='#1e1e1e', fg='#333').pack(pady=4)

        # ---- 3. fake_lane 測試 ----
        tk.Label(right, text="fake_lane 測試",
                font=('Arial', 10, 'bold'),
                fg='#dddddd', bg='#1e1e1e').pack()

        fl_frame = tk.Frame(right, bg='#1e1e1e')
        fl_frame.pack(pady=5)

        fl_btn_style = {'relief': 'raised', 'bd': 2,
                        'font': ('Arial', 10, 'bold'),
                        'width': 8, 'height': 1}

        def _send_fake_lane(lane_val, direction):
            """發送 fake_lane：lane_toggle False → fake_lane ×6 → lane_toggle True"""
            self.status_label.config(text=f"fake_lane {direction} ({lane_val}) 執行中...",
                                     fg='#ffaa00')

            # 加入序列（左側區塊顯示）
            self.sequence.append((6, lane_val, direction))
            self._rebuild()

            def run():
                # 按鈕：只發 1 次（無迴圈，測試專用）
                cmd = ("cd /home/autorace && source ~/catkin_ws/devel/setup.bash && "
                       "rostopic pub /control/lane std_msgs/Float64 '{{data: {lane_val}}}' --once"
                       .format(lane_val=lane_val))
                subprocess.run(['bash', '-c', cmd],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                self.root.after(0, lambda: self.status_label.config(
                    text=f"fake_lane {direction} 完成（1次）", fg='#88ff88'))

            threading.Thread(target=run, daemon=True).start()

        tk.Button(fl_frame, text="◀ 左 380",
                 command=lambda: _send_fake_lane(380, "左"),
                 bg='#3a3a1a', fg='#ffff88', **fl_btn_style).pack(side=tk.LEFT, padx=2)
        tk.Button(fl_frame, text="▲ 直 500",
                 command=lambda: _send_fake_lane(500, "直"),
                 bg='#1a3a3a', fg='#88ffff', **fl_btn_style).pack(side=tk.LEFT, padx=2)
        tk.Button(fl_frame, text="▶ 右 610",
                 command=lambda: _send_fake_lane(610, "右"),
                 bg='#3a1a3a', fg='#ff88ff', **fl_btn_style).pack(side=tk.LEFT, padx=2)

        # ---- 分隔線 ----
        tk.Label(right, text="─" * 16, bg='#1e1e1e', fg='#333').pack(pady=4)

        # ---- 3.5 Lane 控制（前置作業）----
        tk.Label(right, text="Lane 控制（前置作業）",
                font=('Arial', 10, 'bold'),
                fg='#dddddd', bg='#1e1e1e').pack()

        lane_ctrl_frame = tk.Frame(right, bg='#1e1e1e')
        lane_ctrl_frame.pack(pady=5)

        lane_btn_style = {'relief': 'raised', 'bd': 2,
                          'font': ('Arial', 9, 'bold'),
                          'width': 8, 'height': 1}

        def _pub_lane_toggle(state, label):
            self.status_label.config(text=f"lane_toggle {label}...", fg='#ffaa00')

            def run():
                cmd = (f"cd /home/autorace && source ~/catkin_ws/devel/setup.bash && "
                       f"rostopic pub /detect/lane_toggle std_msgs/Bool '{{data: {str(state).lower()}}}' --once")
                result = subprocess.run(['bash', '-c', cmd],
                                        capture_output=True, text=True)
                output = (result.stdout + result.stderr).strip() or "OK"
                self.root.after(0, lambda: self.status_label.config(
                    text=f"lane_toggle {label}: {output[:40]}", fg='#88ff88'))

            threading.Thread(target=run, daemon=True).start()

        def _launch_pkg(pkg_node, label):
            self.status_label.config(text=f"{label} 啟動中...", fg='#ffaa00')
            cmd = f"cd /home/autorace && source ~/catkin_ws/devel/setup.bash && roslaunch {pkg_node} &"
            threading.Thread(target=lambda: (
                subprocess.run(['bash', '-c', cmd],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
                self.root.after(0, lambda: self.status_label.config(
                    text=f"{label} 啟動完成", fg='#88ff88'))
            ), daemon=True).start()

        tk.Button(lane_ctrl_frame, text="dl ON",
                 command=lambda: _launch_pkg("detect detect_lane.launch", "dl"),
                 bg='#1a2a1a', fg='#88ff88', **lane_btn_style).pack(side=tk.LEFT, padx=2)
        tk.Button(lane_ctrl_frame, text="cl ON",
                 command=lambda: _launch_pkg("camera camera.launch", "cl"),
                 bg='#1a2a2a', fg='#88ffff', **lane_btn_style).pack(side=tk.LEFT, padx=2)

        # 第二列：dl OFF, cl OFF, LT OFF, LT ON
        lane_ctrl_row2 = tk.Frame(right, bg='#1e1e1e')
        lane_ctrl_row2.pack(pady=(2, 0))

        def _kill_pkg(keyword, label):
            self.status_label.config(text=f"{label} 關閉中...", fg='#ffaa00')
            cmd = (f"cd /home/autorace && source ~/catkin_ws/devel/setup.bash && "
                   f"rosnode list | grep -i {keyword} | xargs -r rosnode kill")
            threading.Thread(target=lambda: (
                subprocess.run(['bash', '-c', cmd],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
                self.root.after(0, lambda: self.status_label.config(
                    text=f"{label} 關閉完成", fg='#88ff88'))
            ), daemon=True).start()

        tk.Button(lane_ctrl_row2, text="dl OFF",
                 command=lambda: _kill_pkg("detect_lane", "dl"),
                 bg='#3a1a1a', fg='#ff8888', **lane_btn_style).pack(side=tk.LEFT, padx=2)
        tk.Button(lane_ctrl_row2, text="cl OFF",
                 command=lambda: _kill_pkg("camera", "cl"),
                 bg='#2a1a1a', fg='#ff8888', **lane_btn_style).pack(side=tk.LEFT, padx=2)
        tk.Button(lane_ctrl_row2, text="LT OFF",
                 command=lambda: _pub_lane_toggle(False, "LT OFF"),
                 bg='#3a2a2a', fg='#ff8888', **lane_btn_style).pack(side=tk.LEFT, padx=2)
        tk.Button(lane_ctrl_row2, text="LT ON",
                 command=lambda: _pub_lane_toggle(True, "LT ON"),
                 bg='#2a2a3a', fg='#8888ff', **lane_btn_style).pack(side=tk.LEFT, padx=2)

        tk.Label(right, text="提示：先 dl+cl → LT OFF → 按 fake_lane → 隨時可 LT ON 恢復camera循線",
                bg='#1e1e1e', fg='#666',
                font=('Arial', 8)).pack(pady=(0, 2))
        fn_frame = tk.Frame(right, bg='#1e1e1e')
        fn_frame.pack(pady=2)
        tk.Label(fn_frame, text="fn:", bg='#1e1e1e', fg='#aaa',
                font=('Arial', 10)).pack(side=tk.LEFT)
        self.fn_var = tk.StringVar(value="parking_moving")
        tk.Entry(fn_frame, textvariable=self.fn_var,
                bg='#2a2a2a', fg='white', font=('Arial', 10),
                width=13).pack(side=tk.LEFT, padx=3)

        # 匯出版本選擇
        ver_frame = tk.Frame(right, bg='#1e1e1e')
        ver_frame.pack(pady=2)
        self.export_ver = tk.StringVar(value='A')
        tk.Radiobutton(ver_frame, text="A (moving)", variable=self.export_ver, value='A',
                       bg='#1e1e1e', fg='#aaa', font=('Arial', 9),
                       selectcolor='#3a3a1a').pack(side=tk.LEFT, padx=4)
        tk.Radiobutton(ver_frame, text="B (fake_lane)", variable=self.export_ver, value='B',
                       bg='#1e1e1e', fg='#aaa', font=('Arial', 9),
                       selectcolor='#3a3a1a').pack(side=tk.LEFT, padx=4)

        btn_row = tk.Frame(right, bg='#1e1e1e')
        btn_row.pack(pady=4)
        tk.Button(btn_row, text="匯出 .py",
                 command=self.export_code,
                 bg='#1a1a3a', fg='#aaaaff',
                 font=('Arial', 9), relief='raised', width=9).pack(side=tk.LEFT, padx=2)
        tk.Button(btn_row, text="清除",
                 command=self.clear_all,
                 bg='#2a2a2a', fg='#cccccc',
                 font=('Arial', 9), relief='raised', width=6).pack(side=tk.LEFT, padx=2)

    # ============================
    # 即時遙控（方向鍵）- 與 launcher_gui 方向鍵同原理
    # ============================
    def _dpad_add(self, block_type, value):
        """
        按方向鍵：車子移動 + block 加入序列
        使用 /control/moving/state + --once（封閉迴圈，精準定位）
        """
        def run():
            if block_type == 3:    # 旋轉：value = 度數（正=左，負=右）
                angular = abs(value)
                mtype = 2 if value > 0 else 3  # 2=left, 3=right
                cmd = (f"cd /home/autorace && source ~/catkin_ws/devel/setup.bash && "
                       f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
                       f"'{{moving_type: {mtype}, moving_value_linear: 0.0, moving_value_angular: {angular}}}' --once")
            elif block_type == 4:  # 前進：value = 公分，轉公尺
                linear = value / 100.0
                cmd = (f"cd /home/autorace && source ~/catkin_ws/devel/setup.bash && "
                       f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
                       f"'{{moving_type: 4, moving_value_linear: {linear}, moving_value_angular: 0.0}}' --once")
            elif block_type == 5:  # 後退：value = 公分，轉公尺
                linear = value / 100.0
                cmd = (f"cd /home/autorace && source ~/catkin_ws/devel/setup.bash && "
                       f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
                       f"'{{moving_type: 5, moving_value_linear: {linear}, moving_value_angular: 0.0}}' --once")
            else:
                return

            subprocess.run(['bash', '-c', cmd],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        threading.Thread(target=run, daemon=True).start()

        # 2. 同步加入序列（block 的 value = 使用者看到的公分/度數）
        # forward/backward: value=10cm, rotation: value=90/-90度
        self.sequence.append((block_type, value))
        self._rebuild()

        # 3. 更新狀態列
        names = {3: "旋轉", 4: "前進", 5: "後退"}
        unit = "cm" if block_type in (4, 5) else "度"
        self.status_label.config(
            text=f"#{len(self.sequence)} {names.get(block_type,'?')} {abs(value)}{unit}",
            fg='#ffaa00')

    def _dpad_stop(self):
        """發送零速度，車子停止"""
        cmd = (f"rostopic pub /cmd_vel geometry_msgs/Twist "
               f"{{linear: {{x: 0, y: 0, z: 0}}, angular: {{x: 0, y: 0, z: 0}}}} --once")
        subprocess.run(
            ['bash', '-c', f'source ~/catkin_ws/devel/setup.bash && {cmd}'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        self.status_label.config(text="已停止", fg='#ff6666')

    # ============================
    # Block 操作
    # ============================
    def add_block(self, block_type):
        defaults = {4: 30, 5: 15, 3: 90, 0: 2}
        self.sequence.append((block_type, defaults.get(block_type, 0)))
        self._rebuild()

    def delete_block(self, index):
        if 0 <= index < len(self.sequence):
            self.sequence.pop(index)
            self._rebuild()

    def change_block(self, index, block_type, value, delta=0):
        if delta != 0:
            ni = index + delta
            if 0 <= ni < len(self.sequence):
                self.sequence[index], self.sequence[ni] = self.sequence[ni], self.sequence[index]
                self._rebuild()
        else:
            if 0 <= index < len(self.sequence):
                self.sequence[index] = (block_type, value)

    def _rebuild(self):
        for w in self.block_widgets:
            w.destroy()
        self.block_widgets.clear()

        if not self.sequence:
            self.empty_label.pack(pady=40)
        else:
            self.empty_label.pack_forget()

        for i, item in enumerate(self.sequence):
            # fake_lane blocks are 3-tuples: (6, lane_val, direction)
            if isinstance(item, tuple) and len(item) == 3:
                btype, val, direction = item
                block = SequenceBlock(
                    self.seq_view, btype, val,
                    on_delete=lambda idx=i: self.delete_block(idx),
                    on_change=lambda idx, bt, v, d=0: self.change_block(idx, bt, v, d),
                    index=i,
                    extra_label=f" {direction}"
                )
            else:
                btype, val = item
                block = SequenceBlock(
                    self.seq_view, btype, val,
                    on_delete=lambda idx=i: self.delete_block(idx),
                    on_change=lambda idx, bt, v, d=0: self.change_block(idx, bt, v, d),
                    index=i
                )
            block.pack(fill='x', padx=4, pady=3)
            self.block_widgets.append(block)

    # ============================
    # 執行
    # ============================
    def execute_sequence(self):
        if not self.sequence:
            messagebox.showwarning("空序列", "請先新增指令")
            return

        self.is_running = True
        self.exec_btn.config(state='disabled', bg='#1a2a1a')
        self.stop_btn.config(state='normal', bg='#5a1a1a')

        def run():
            type_names = SequenceBlock.TYPE_NAMES
            for i, item in enumerate(self.sequence):
                if not self.is_running:
                    break
                # fake_lane blocks are 3-tuple: (6, lane_val, direction)
                if isinstance(item, tuple) and len(item) == 3:
                    btype, val, direction = item
                else:
                    btype, val = item
                unit = "cm" if btype in (4, 5) else ("度" if btype == 3 else "秒")
                disp_val = int(val)
                self.root.after(0, lambda n=type_names.get(btype, "?"), v=disp_val, u=unit, idx=i:
                    self.status_label.config(text=f"#{idx+1} {n} {v}{u}..."))
                send_moving(btype, val)
                time.sleep(0.5)

            self.is_running = False
            self.root.after(0, self._done)

        import threading
        threading.Thread(target=run, daemon=True).start()

    def stop_execute(self):
        self.is_running = False
        self.status_label.config(text="已停止", fg='#ff6666')
        self.exec_btn.config(state='normal', bg='#1a3a1a')
        self.stop_btn.config(state='disabled', bg='#3a1a1a')

    def _done(self):
        self.status_label.config(text="執行完成", fg='#88ff88')
        self.exec_btn.config(state='normal', bg='#1a3a1a')
        self.stop_btn.config(state='disabled', bg='#3a1a1a')

    # ============================
    # 匯出
    # ============================
    def export_code(self):
        fn = self.fn_var.get().strip().replace(' ', '_') or "parking_moving"
        MISSION = fn.split('_')[0].upper() or "PARKING"
        ver = self.export_ver.get()

        # ---- 偵測序列模式 ----
        has_fake = any(isinstance(item, tuple) and len(item) == 3 for item in self.sequence)
        has_moving = any(not (isinstance(item, tuple) and len(item) == 3) for item in self.sequence)

        if has_fake and has_moving:
            messagebox.showerror("模式衝突", "序列混合了 moving 指令與 fake_lane，請分開處理")
            return

        if has_fake and ver == 'A':
            messagebox.showerror("模式錯誤", "序列包含 fake_lane，請選擇「B (fake_lane)」匯出")
            return

        if has_moving and ver == 'B':
            messagebox.showerror("模式錯誤", "序列包含 moving 指令，請選擇「A (moving)」匯出")
            return

        # ---- 自動總結：合併同 type 連續指令 ----
        consolidated = []
        for item in self.sequence:
            if isinstance(item, tuple) and len(item) == 3:
                btype, val, direction = item
            else:
                btype, val = item

            if not consolidated:
                consolidated.append([btype, val])
            else:
                last = consolidated[-1]
                if last[0] == btype and btype in (3, 4, 5):
                    last[1] += val
                else:
                    consolidated.append([btype, val])

        if ver == 'A':
            lines = []
            for btype, val in consolidated:
                if btype == 0:
                    lines.append(f"                rospy.loginfo('[{MISSION}] WAIT {val}s')")
                    lines.append(f"                rospy.sleep({val})")
                elif btype == 3:
                    direction = 'L' if val > 0 else 'R'
                    lines.append(f"                rospy.loginfo('[{MISSION}] {direction}')")
                    lines.append(f"                msg_moving.moving_type= {2 if val > 0 else 3}")
                    lines.append(f"                msg_moving.moving_value_angular= {abs(val)}")
                    lines.append(f"                msg_moving.moving_value_linear= 0.0")
                    lines.append(f"                self.pub_moving.publish(msg_moving)")
                    lines.append(f"                while True:")
                    lines.append(f"                    if self.is_moving_complete == True:")
                    lines.append(f"                        break")
                    lines.append(f"                self.is_moving_complete = False")
                    lines.append(f"                rospy.sleep(2)")
                elif btype == 4:
                    linear_m = val / 100.0
                    lines.append(f"                rospy.loginfo('[{MISSION}] S')")
                    lines.append(f"                msg_moving.moving_type= 4")
                    lines.append(f"                msg_moving.moving_value_angular= 0.0")
                    lines.append(f"                msg_moving.moving_value_linear= {linear_m}")
                    lines.append(f"                self.pub_moving.publish(msg_moving)")
                    lines.append(f"                while True:")
                    lines.append(f"                    if self.is_moving_complete == True:")
                    lines.append(f"                        break")
                    lines.append(f"                self.is_moving_complete = False")
                    lines.append(f"                rospy.sleep(2)")
                elif btype == 5:
                    linear_m = val / 100.0
                    lines.append(f"                rospy.loginfo('[{MISSION}] B')")
                    lines.append(f"                msg_moving.moving_type= 5")
                    lines.append(f"                msg_moving.moving_value_angular= 0.0")
                    lines.append(f"                msg_moving.moving_value_linear= {linear_m}")
                    lines.append(f"                self.pub_moving.publish(msg_moving)")
                    lines.append(f"                while True:")
                    lines.append(f"                    if self.is_moving_complete == True:")
                    lines.append(f"                        break")
                    lines.append(f"                self.is_moving_complete = False")
                    lines.append(f"                rospy.sleep(2)")
        else:
            # B 版本：fake_lane 格式（Intersection 風格）
            # fake_lane: 500=正中前進, 380=左偏, 610=右偏
            # type 6 block: val = lane_val (380/500/610)
            lines = []
            for item in consolidated:
                btype, val = item
                if btype == 0:
                    lines.append(f"                rospy.loginfo('[{MISSION}] WAIT {val}s')")
                    lines.append(f"                rospy.sleep({val})")
                elif btype == 3:
                    direction = 'RIGHT' if val < 0 else 'LEFT'
                    lane_val = 610 if val < 0 else 380
                    loops = int(abs(val) / 90 * 12)
                    lines.append(f"                rospy.loginfo('[{MISSION}] {direction}')")
                    lines.append(f"                for x in range(0, {loops}):")
                    lines.append(f"                    self.pub_fake_lane.publish({lane_val})")
                    lines.append(f"                    rospy.sleep(0.1)")
                    lines.append(f"                self.pub_lane_toggle.publish(True)")
                elif btype == 4:
                    loops = int(val / 10 * 12)
                    lines.append(f"                rospy.loginfo('[{MISSION}] S')")
                    lines.append(f"                for x in range(0, {loops}):")
                    lines.append(f"                    self.pub_fake_lane.publish(500)")
                    lines.append(f"                    rospy.sleep(0.1)")
                    lines.append(f"                self.pub_lane_toggle.publish(True)")
                    lines.append(f"                rospy.sleep({int(val / 10) + 1})")
                    lines.append(f"                self.pub_lane_toggle.publish(False)")
                elif btype == 5:
                    loops = int(val / 10 * 12)
                    lines.append(f"                rospy.loginfo('[{MISSION}] B')")
                    lines.append(f"                for x in range(0, {loops}):")
                    lines.append(f"                    self.pub_fake_lane.publish(500)")
                    lines.append(f"                    rospy.sleep(0.1)")
                    lines.append(f"                self.pub_lane_toggle.publish(True)")
                    lines.append(f"                rospy.sleep({int(val / 10) + 1})")
                    lines.append(f"                self.pub_lane_toggle.publish(False)")
                elif btype == 6:
                    # 按鈕：1次 publish｜匯出：5層×publish+sleep
                    lines.append(f"                rospy.loginfo('[{MISSION}] FAKE {int(val)}')")
                    lines.append(f"                for x in range(0, 5):")
                    lines.append(f"                    self.pub_fake_lane.publish({int(val)})")
                    lines.append(f"                    rospy.sleep(0.1)")

        code = '\n'.join(lines)
        self._show_code(fn, code)

    def _show_code(self, fn, code):
        win = tk.Toplevel(self.root)
        win.title(f"匯出：{fn}.py")
        win.geometry("600x450")

        ta = tk.Text(win, bg='#1e1e1e', fg='#d4d4d4',
                     font=('Courier New', 10), insertbackground='white')
        ta.pack(fill='both', expand=True, side=tk.LEFT)
        tk.Scrollbar(win, command=ta.yview).pack(side=tk.RIGHT, fill='y')
        ta.configure(yscrollcommand=lambda f, l: None)
        ta.insert('1.0', code)

        frame = tk.Frame(win, bg='#1e1e1e')
        frame.pack(fill='x', side=tk.BOTTOM, pady=5)
        tk.Button(frame, text="複製到剪貼簿",
                 command=lambda: [self.root.clipboard_clear(),
                                self.root.clipboard_append(code),
                                btn.config(text="已複製！", bg='#1a3a1a')],
                 bg='#2a2a4a', fg='white', font=('Arial', 10)).pack(side=tk.RIGHT, padx=10)
        btn = frame.pack_slaves()[0]

    def clear_all(self):
        if self.sequence and messagebox.askyesno("確認", "清除所有指令？"):
            self.sequence.clear()
            self._rebuild()

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    MotionEditor().run()
