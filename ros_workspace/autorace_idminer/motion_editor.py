#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
TB3 動作序列編輯器
用來視覺化拼接 moving 指令，產出可執行的 parking/construction moving 程式碼
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import threading
import time


# ============================
# ROS 通訊（用 rostopic 命令，不需 ROS node）
# ============================
class MotionCommander:
    """用 subprocess + rostopic 發送 moving 指令"""

    def __init__(self):
        self.running = False
        self.step_done = False
        self.moving_type_names = {3: "旋轉", 4: "前進", 5: "後退"}

    def _send_rostopic(self, mtype, linear=0.0, angular=0.0):
        """用 rostopic pub 發送一筆 MovingParam"""
        cmd = (
            f"rostopic pub /control/moving/state turtlebot3_autorace_msgs/MovingParam "
            f"{{moving_type: {mtype}, moving_value_linear: {linear}, moving_value_angular: {angular}}} --once"
        )
        subprocess.run(['bash', '-c', f'source ~/catkin_ws/devel/setup.bash && {cmd}'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _wait_complete(self, timeout=30):
        """監聽 /control/moving/complete 直到收到訊號或超時"""
        cmd = "source ~/catkin_ws/devel/setup.bash && rostopic echo -n 1 /control/moving/complete"
        start = time.time()
        while self.running and (time.time() - start) < timeout:
            result = subprocess.run(['bash', '-c', cmd],
                                   capture_output=True, text=True, timeout=1)
            if result.returncode == 0 and result.stdout.strip():
                return True
            time.sleep(0.1)
        return False

    def execute_sequence(self, sequence, progress_callback=None):
        """
        sequence: [(moving_type, value), ...]
        moving_type 3=旋轉(度), 4=前進(公尺), 5=後退(公尺)
        value: 度數或公尺
        """
        self.running = True
        for i, (mtype, val) in enumerate(sequence):
            if not self.running:
                break
            name = self.moving_type_names.get(mtype, "等待")
            unit = "度" if mtype == 3 else "公分"
            display_val = int(val * 100) if mtype in (4, 5) else val

            if progress_callback:
                progress_callback(i, f"{name} {display_val}{unit}")

            if mtype == 0:
                time.sleep(val)
            else:
                linear = val if mtype in (4, 5) else 0.0
                angular = val if mtype == 3 else 0.0
                self._send_rostopic(mtype, linear, angular)
                self._wait_complete()

            time.sleep(0.3)

        self.running = False
        if progress_callback:
            progress_callback(len(sequence), "完成")

    def stop(self):
        self.running = False


# ============================
# Block 物件（用於 GUI 顯示）
# ============================
class SequenceBlock(tk.Frame):
    """序列中的單一指令區塊"""

    TYPE_NAMES = {
        3: "旋轉",
        4: "前進",
        5: "後退",
        0: "等待",
    }
    TYPE_UNITS = {
        3: "度",
        4: "公分",
        5: "公分",
        0: "秒",
    }

    def __init__(self, parent, block_type, value, on_delete, on_change, index):
        super().__init__(parent, bg='#2b2b2b', relief='solid', bd=1)
        self.block_type = block_type
        self.value = value
        self.on_delete = on_delete
        self.on_change = on_change
        self.index = index

        self._build()

    def _build(self):
        # 類型標籤
        lbl_type = tk.Label(self, text=self.TYPE_NAMES.get(self.block_type, "?"),
                           bg='#4a4a4a', fg='white', font=('Arial', 11, 'bold'),
                           width=6, relief='raised')
        lbl_type.pack(side=tk.LEFT, padx=5, pady=5)

        # 數值輸入
        unit = self.TYPE_UNITS.get(self.block_type, "")
        val_frame = tk.Frame(self, bg='#2b2b2b')
        val_frame.pack(side=tk.LEFT, padx=5)
        self.val_var = tk.StringVar(value=str(self.value))
        val_entry = tk.Entry(val_frame, textvariable=self.val_var, width=8,
                            font=('Arial', 11), bg='#3a3a3a', fg='white',
                            insertbackground='white')
        val_entry.pack(side=tk.LEFT)
        tk.Label(val_frame, text=unit, bg='#2b2b2b', fg='#aaaaaa',
                font=('Arial', 10)).pack(side=tk.LEFT, padx=3)

        self.val_var.trace('w', lambda *_: self._notify_change())

        # 刪除按鈕
        del_btn = tk.Button(self, text="✕", command=self.on_delete,
                           bg='#8b0000', fg='white', font=('Arial', 10, 'bold'),
                           width=3, relief='raised')
        del_btn.pack(side=tk.RIGHT, padx=5, pady=5)

        # 上移 / 下移按鈕
        up_btn = tk.Button(self, text="▲", command=lambda: self._notify_change(delta=-1),
                          bg='#3a3a3a', fg='white', font=('Arial', 8),
                          width=3, relief='raised')
        up_btn.pack(side=tk.RIGHT, padx=2)
        dn_btn = tk.Button(self, text="▼", command=lambda: self._notify_change(delta=1),
                          bg='#3a3a3a', fg='white', font=('Arial', 8),
                          width=3, relief='raised')
        dn_btn.pack(side=tk.RIGHT, padx=2)

        # 序號
        tk.Label(self, text=f"#{self.index+1}", bg='#2b2b2b', fg='#888888',
                font=('Arial', 9)).pack(side=tk.LEFT, padx=(0, 5))

    def _notify_change(self, delta=0):
        try:
            val = float(self.val_var.get())
        except ValueError:
            val = self.value
        self.on_change(self.index, self.block_type, val, delta)

    def update_index(self, i):
        self.index = i


# ============================
# 主視窗
# ============================
class MotionSequenceEditor:
    TYPE_LABELS = {
        4: "前進 (公分)",
        5: "後退 (公分)",
        3: "旋轉 (度數)",
        0: "等待 (秒)",
    }

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("TB3 動作序列編輯器")
        self.root.configure(bg='#2b2b2b')
        self.root.geometry("900x600")

        self.commander = MotionCommander()
        self.sequence = []  # [(type, value), ...]
        self.block_widgets = []
        self.is_running = False

        self._build()

    def _build(self):
        # ===== 左側：新增按鈕 =====
        left_panel = tk.Frame(self.root, bg='#1e1e1e', width=180)
        left_panel.pack(side=tk.LEFT, fill='y', padx=10, pady=10)
        left_panel.pack_propagate(False)

        tk.Label(left_panel, text="新增指令",
                font=('Arial', 12, 'bold'),
                fg='white', bg='#1e1e1e').pack(pady=(10, 15))

        for btype, label in self.TYPE_LABELS.items():
            btn = tk.Button(left_panel, text=label,
                           command=lambda t=btype: self.add_block(t),
                           bg='#3a3a3a', fg='white', font=('Arial', 10),
                           relief='raised', bd=2, width=16)
            btn.pack(pady=4)

        # ROS 狀態測試
        tk.Label(left_panel, text="─" * 18, bg='#1e1e1e', fg='#555').pack(pady=10)
        self.conn_label = tk.Label(left_panel, text="⚫ 未確認",
                                   fg='#888', bg='#1e1e1e', font=('Arial', 9))
        self.conn_label.pack()
        tk.Button(left_panel, text="確認 ROS 正常",
                  command=self.test_ros,
                  bg='#1a3a1a', fg='#88ff88',
                  font=('Arial', 9), relief='raised').pack(pady=5)

        # ===== 中間：序列區 =====
        center_panel = tk.Frame(self.root, bg='#2b2b2b')
        center_panel.pack(side=tk.LEFT, fill='both', expand=True, padx=10, pady=10)

        tk.Label(center_panel, text="動作序列（按 ▲▼ 調整順序）",
                font=('Arial', 11, 'bold'),
                fg='white', bg='#2b2b2b').pack(anchor='w', pady=(0, 8))

        seq_frame = tk.Frame(center_panel, bg='#252525', relief='solid', bd=1)
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
            lambda e: self.canvas.itemconfig(self.canvas_window, width=e.width-8))

        # 空狀態提示
        self.empty_label = tk.Label(self.seq_view, text="（空序列，按左側按鈕新增指令）",
                                    fg='#555', bg='#252525', font=('Arial', 10))
        self.empty_label.pack(pady=40)

        # ===== 右側：控制面板 =====
        right_panel = tk.Frame(self.root, bg='#1e1e1e', width=200)
        right_panel.pack(side=tk.LEFT, fill='y', padx=(0, 10), pady=10)
        right_panel.pack_propagate(False)

        tk.Label(right_panel, text="執行控制",
                font=('Arial', 12, 'bold'),
                fg='white', bg='#1e1e1e').pack(pady=(10, 15))

        self.status_label = tk.Label(right_panel, text="狀態：待機",
                                     fg='#aaaaaa', bg='#1e1e1e', font=('Arial', 10))
        self.status_label.pack(pady=5)

        self.exec_btn = tk.Button(right_panel, text="▶ 執行序列",
                                  command=self.execute_sequence,
                                  bg='#1a3a1a', fg='#88ff88',
                                  font=('Arial', 11, 'bold'),
                                  relief='raised', width=15)
        self.exec_btn.pack(pady=8)

        self.stop_btn = tk.Button(right_panel, text="■ 停止",
                                  command=self.stop_sequence,
                                  bg='#3a1a1a', fg='#ff8888',
                                  font=('Arial', 11, 'bold'),
                                  state='disabled',
                                  relief='raised', width=15)
        self.stop_btn.pack(pady=8)

        tk.Label(right_panel, text="─" * 16, bg='#1e1e1e', fg='#444').pack(pady=10)

        tk.Label(right_panel, text="匯出程式碼",
                font=('Arial', 11, 'bold'),
                fg='white', bg='#1e1e1e').pack(pady=(0, 8))

        self.fn_name_var = tk.StringVar(value="parking_moving")
        tk.Entry(right_panel, textvariable=self.fn_name_var,
                bg='#2a2a2a', fg='white', font=('Arial', 10)).pack(pady=3, fill='x', padx=5)

        tk.Button(right_panel, text="匯出 .py",
                  command=self.export_code,
                  bg='#1a1a3a', fg='#aaaaff',
                  font=('Arial', 10),
                  relief='raised', width=15).pack(pady=8)

        tk.Button(right_panel, text="清除序列",
                  command=self.clear_sequence,
                  bg='#2a2a2a', fg='#cccccc',
                  font=('Arial', 10),
                  relief='raised', width=15).pack(pady=8)

    # ============================
    # Block 操作
    # ============================
    def add_block(self, block_type):
        default_vals = {4: 30, 5: 15, 3: 90, 0: 2}
        val = default_vals.get(block_type, 0)
        self.sequence.append((block_type, val))
        self._rebuild_blocks()

    def delete_block(self, index):
        if 0 <= index < len(self.sequence):
            self.sequence.pop(index)
            self._rebuild_blocks()

    def change_block(self, index, block_type, value, delta=0):
        if delta != 0:
            # 上移/下移
            ni = index + delta
            if 0 <= ni < len(self.sequence):
                self.sequence[index], self.sequence[ni] = self.sequence[ni], self.sequence[index]
                self._rebuild_blocks()
        else:
            if 0 <= index < len(self.sequence):
                self.sequence[index] = (block_type, value)
                self._refresh_values()

    def _rebuild_blocks(self):
        """清除並重建所有 block widget"""
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
                on_change=lambda idx, bt, v, d=0, ii=i: self.change_block(idx, bt, v, d),
                index=i
            )
            block.pack(fill='x', padx=4, pady=3)
            self.block_widgets.append(block)

    def _refresh_values(self):
        """只更新數值，不重建 widget"""
        for i, (btype, val) in enumerate(self.sequence):
            if i < len(self.block_widgets):
                self.block_widgets[i].val_var.set(str(val))

    # ============================
    # ROS 狀態確認
    # ============================
    def test_ros(self):
        def check():
            result = subprocess.run(
                ['bash', '-c', 'source ~/catkin_ws/devel/setup.bash && rostopic list | grep -q "/control/moving/state" && echo OK'],
                capture_output=True, text=True
            )
            if result.stdout.strip() == 'OK':
                self.conn_label.config(text="⚫ ROS 正常", fg='#88ff88')
            else:
                self.conn_label.config(text="⚫ ROS 異常", fg='#ff8888')
                messagebox.showerror("ROS 異常",
                    "無法找到 /control/moving/state\n請確認：\n1. roscore 已啟動\n2. control_moving 節點已 launch")
        threading.Thread(target=check, daemon=True).start()

    # ============================
    # 執行序列
    # ============================
    def execute_sequence(self):
        if not self.sequence:
            messagebox.showwarning("空序列", "請先新增指令")
            return

        self.is_running = True
        self.exec_btn.config(state='disabled', bg='#1a2a1a')
        self.stop_btn.config(state='normal', bg='#5a1a1a')

        def progress(step, msg):
            self.status_label.config(text=f"狀態：{msg}", fg='#ffaa00')
            self.root.update_idletasks()

        def run():
            seq = list(self.sequence)  # copy
            self.commander.execute_sequence(seq, progress_callback=progress)
            self.is_running = False
            self.root.after(0, self._execution_done)

        threading.Thread(target=run, daemon=True).start()

    def stop_sequence(self):
        self.commander.stop()
        self.is_running = False
        self.status_label.config(text="狀態：已停止", fg='#ff6666')

    def _execution_done(self):
        self.exec_btn.config(state='normal', bg='#1a3a1a')
        self.stop_btn.config(state='disabled', bg='#3a1a1a')
        self.status_label.config(text="狀態：執行完成", fg='#88ff88')

    # ============================
    # 匯出程式碼
    # ============================
    def export_code(self):
        fn_name = self.fn_name_var.get().strip() or "motion_sequence"
        fn_name = fn_name.replace(' ', '_')

        type_names = {3: "旋轉", 4: "前進", 5: "後退", 0: "等待"}
        type_funcs = {3: "turn", 4: "forward", 5: "backward", 0: "wait"}

        lines = [
            "#!/usr/bin/env python",
            "# -*- coding: utf-8 -*-",
            f'"""',
            f"自動產出：{fn_name}",
            f"共 {len(self.sequence)} 個指令",
            f'"""',
            "",
            "import rospy",
            "from std_msgs.msg import UInt8",
            "from turtlebot3_autorace_msgs.msg import MovingParam",
            "",
            "",
            f"def {fn_name}(pub_moving, pub_mission_parking=None, is_moving_complete_flag_ref=None):",
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

        for i, (btype, val) in enumerate(self.sequence):
            if btype == 0:
                lines.append(f"    rospy.loginfo('[{fn_name}] 等待 {val} 秒')")
                lines.append(f"    rospy.sleep({val})")
            elif btype == 3:
                lines.append(f"    rospy.loginfo('[{fn_name}] 旋轉 {val} 度')")
                lines.append(f"    send(3, angular={val})")
                lines.append(f"    wait_complete()")
            elif btype == 4:
                cm = int(val * 100)
                lines.append(f"    rospy.loginfo('[{fn_name}] 前進 {cm} 公分')")
                lines.append(f"    send(4, linear={val})")
                lines.append(f"    wait_complete()")
            elif btype == 5:
                cm = int(val * 100)
                lines.append(f"    rospy.loginfo('[{fn_name}] 後退 {cm} 公分')")
                lines.append(f"    send(5, linear={val})")
                lines.append(f"    wait_complete()")
            lines.append("")

        lines.append("    rospy.loginfo('[MOTION] 序列執行完成')")

        code = '\n'.join(lines)

        # 顯示在新的文字視窗
        self._show_exported_code(fn_name, code)

    def _show_exported_code(self, fn_name, code):
        win = tk.Toplevel(self.root)
        win.title(f"匯出：{fn_name}.py")
        win.geometry("700x500")

        ta = tk.Text(win, bg='#1e1e1e', fg='#d4d4d4',
                     font=('Courier New', 10), insertbackground='white')
        ta.pack(fill='both', expand=True, side=tk.LEFT)
        sb = ttk.Scrollbar(win, command=ta.yview)
        sb.pack(side=tk.RIGHT, fill='y')
        ta.configure(yscrollcommand=sb.set)

        # 按 block 類型著色（簡單分色）
        keywords = {"def ", "import ", "from ", "rospy", "MovingParam",
                   "send(", "wait_complete()", "linear", "angular"}
        ta.insert('1.0', code)

        # 複製按鈕
        def copy():
            self.root.clipboard_clear()
            self.root.clipboard_append(code)
            copy_btn.config(text="已複製！", bg='#1a3a1a')

        btn_frame = tk.Frame(win, bg='#1e1e1e')
        btn_frame.pack(fill='x', side=tk.BOTTOM, pady=5)
        copy_btn = tk.Button(btn_frame, text="複製到剪貼簿",
                            command=copy, bg='#2a2a4a', fg='white')
        copy_btn.pack(side=tk.RIGHT, padx=10)

    def clear_sequence(self):
        if self.sequence:
            if messagebox.askyesno("清除確認", "確定要清除所有指令？"):
                self.sequence.clear()
                self._rebuild_blocks()

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    editor = MotionSequenceEditor()
    editor.run()
