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


# ============================
# Block 定義
# ============================
class SequenceBlock(tk.Frame):
    """序列中的單一指令區塊"""

    TYPE_NAMES = {3: "旋轉", 4: "前進", 5: "後退", 0: "等待"}
    TYPE_UNITS = {3: "度", 4: "cm", 5: "cm", 0: "秒"}

    def __init__(self, parent, block_type, value, on_delete, on_change, index):
        super().__init__(parent, bg='#2b2b2b', relief='solid', bd=1)
        self.block_type = block_type
        self.value = value
        self.on_delete = on_delete
        self.on_change = on_change
        self.index = index
        self._build()

    def _build(self):
        lbl = tk.Label(self, text=self.TYPE_NAMES.get(self.block_type, "?"),
                       bg='#4a4a4a', fg='white', font=('Arial', 11, 'bold'),
                       width=6, relief='raised')
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

    if block_type == 3:  # 旋轉：value = 度數
        cmd = (f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
               f"{{moving_type: 3, moving_value_linear: 0.0, moving_value_angular: {value}}} --once")
    elif block_type == 4:  # 前進：value = 公分，轉公尺
        linear = value / 100.0
        cmd = (f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
               f"{{moving_type: 4, moving_value_linear: {linear}, moving_value_angular: 0.0}} --once")
    elif block_type == 5:  # 後退：value = 公分，轉公尺
        linear = value / 100.0
        cmd = (f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
               f"{{moving_type: 5, moving_value_linear: {linear}, moving_value_angular: 0.0}} --once")
    else:
        return

    subprocess.run(
        ['bash', '-c', f'source ~/catkin_ws/devel/setup.bash && {cmd}'],
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
        self.root.geometry("800x550")

        self.sequence = []
        self.block_widgets = []
        self.is_running = False

        self._build()

    def _build(self):
        # ===== 左側：新增按鈕 =====
        left = tk.Frame(self.root, bg='#1e1e1e', width=170)
        left.pack(side=tk.LEFT, fill='y', padx=10, pady=10)
        left.pack_propagate(False)

        tk.Label(left, text="新增指令",
                font=('Arial', 12, 'bold'),
                fg='white', bg='#1e1e1e').pack(pady=(10, 15))

        for btype, label in self.TYPE_LABELS.items():
            tk.Button(left, text=label,
                     command=lambda t=btype: self.add_block(t),
                     bg='#3a3a3a', fg='white', font=('Arial', 10),
                     relief='raised', bd=2, width=16).pack(pady=4)

        tk.Label(left, text="─" * 16, bg='#1e1e1e', fg='#444').pack(pady=10)

        # 匯出
        tk.Label(left, text="匯出", font=('Arial', 11, 'bold'),
                fg='white', bg='#1e1e1e').pack()
        self.fn_var = tk.StringVar(value="parking_moving")
        tk.Entry(left, textvariable=self.fn_var,
                bg='#2a2a2a', fg='white', font=('Arial', 10)).pack(pady=4, fill='x', padx=5)
        tk.Button(left, text="匯出 Python",
                  command=self.export_code,
                  bg='#1a1a3a', fg='#aaaaff',
                  font=('Arial', 10), relief='raised', width=15).pack(pady=6)

        tk.Button(left, text="清除全部",
                  command=self.clear_all,
                  bg='#2a2a2a', fg='#cccccc',
                  font=('Arial', 10), relief='raised', width=15).pack(pady=6)

        # ===== 中間：序列區 =====
        center = tk.Frame(self.root, bg='#2b2b2b')
        center.pack(side=tk.LEFT, fill='both', expand=True, padx=10, pady=10)

        tk.Label(center, text="動作序列（▲▼ 調整順序）",
                font=('Arial', 11, 'bold'),
                fg='white', bg='#2b2b2b').pack(anchor='w', pady=(0, 8))

        seq_frame = tk.Frame(center, bg='#252525', relief='solid', bd=1)
        seq_frame.pack(fill='both', expand=True)

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

        # ===== 右側：執行控制 =====
        right = tk.Frame(self.root, bg='#1e1e1e', width=180)
        right.pack(side=tk.LEFT, fill='y', padx=(0, 10), pady=10)
        right.pack_propagate(False)

        tk.Label(right, text="執行控制",
                font=('Arial', 12, 'bold'),
                fg='white', bg='#1e1e1e').pack(pady=(10, 15))

        self.status_label = tk.Label(right, text="待機",
                                     fg='#aaaaaa', bg='#1e1e1e', font=('Arial', 10))
        self.status_label.pack(pady=5)

        self.exec_btn = tk.Button(right, text="▶ 執行序列",
                                  command=self.execute_sequence,
                                  bg='#1a3a1a', fg='#88ff88',
                                  font=('Arial', 11, 'bold'),
                                  relief='raised', width=15)
        self.exec_btn.pack(pady=8)

        self.stop_btn = tk.Button(right, text="■ 停止",
                                  command=self.stop_execute,
                                  bg='#3a1a1a', fg='#ff8888',
                                  font=('Arial', 11, 'bold'),
                                  state='disabled',
                                  relief='raised', width=15)
        self.stop_btn.pack(pady=8)

        tk.Label(right, text="說明", font=('Arial', 10, 'bold'),
                fg='#aaaaaa', bg='#1e1e1e').pack(pady=(15, 3))
        tk.Label(right, text="按「執行」後，\n會依序發送指令，\n車子自己會停。\n\n可直接在車子\n還在移動時\n按下一個指令。",
                justify='left', fg='#777', bg='#1e1e1e',
                font=('Arial', 9)).pack(pady=5)

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

        for i, (btype, val) in enumerate(self.sequence):
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
            for i, (btype, val) in enumerate(self.sequence):
                if not self.is_running:
                    break
                name = SequenceBlock.TYPE_NAMES.get(btype, "?")
                self.root.after(0, lambda n=name, v=val, idx=i:
                    self.status_label.config(text=f"#{idx+1} {name} {val}..."))
                send_moving(btype, val)
                # 每個指令之間留 0.5 秒緩衝，讓車子有機會反應
                for _ in range(50):
                    if not self.is_running:
                        break
                    time.sleep(0.1)

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

        lines = [
            "#!/usr/bin/env python",
            "# -*- coding: utf-8 -*-",
            f'"""',
            f"自動產出：{fn}",
            f"共 {len(self.sequence)} 個指令",
            f'"""',
            "",
            "import rospy",
            "from std_msgs.msg import UInt8",
            "from turtlebot3_autorace_msgs.msg import MovingParam",
            "",
            "",
            f"def {fn}(pub_moving, is_moving_complete_flag_ref=None):",
            "    rospy.loginfo('[MOTION] 開始執行序列')",
            "",
            "    def wait_complete(timeout=30):",
            "        if is_moving_complete_flag_ref is not None:",
            "            is_moving_complete_flag_ref['value'] = False",
            "            start = rospy.Time.now()",
            "            while not is_moving_complete_flag_ref['value']:",
            "                if (rospy.Time.now() - start).to_sec() > timeout:",
            "                    rospy.logwarn('[MOTION] 等待完成超時')",
            "                    return",
            "                rospy.sleep(0.05)",
            "",
            "    def send(mtype, linear=0.0, angular=0.0):",
            "        msg = MovingParam()",
            "        msg.moving_type = mtype",
            "        msg.moving_value_linear = linear",
            "        msg.moving_value_angular = angular",
            "        pub_moving.publish(msg)",
            "",
        ]

        for btype, val in self.sequence:
            if btype == 0:
                lines.append(f"    rospy.loginfo('[MOTION] 等待 {val} 秒')")
                lines.append(f"    rospy.sleep({val})")
            elif btype == 3:
                lines.append(f"    rospy.loginfo('[MOTION] 旋轉 {val} 度')")
                lines.append(f"    send(3, angular={val})")
                lines.append(f"    wait_complete()")
            elif btype == 4:
                lines.append(f"    rospy.loginfo('[MOTION] 前進 {val} cm')")
                lines.append(f"    send(4, linear={val/100:.2f})")
                lines.append(f"    wait_complete()")
            elif btype == 5:
                lines.append(f"    rospy.loginfo('[MOTION] 後退 {val} cm')")
                lines.append(f"    send(5, linear={val/100:.2f})")
                lines.append(f"    wait_complete()")
            lines.append("")

        lines.append("    rospy.loginfo('[MOTION] 序列執行完成')")

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
