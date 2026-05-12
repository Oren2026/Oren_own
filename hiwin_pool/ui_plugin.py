# ui_plugin.py
"""UI Plugin — Tkinter GUI，替換 cv2.imshow"""

import tkinter as tk
from tkinter import ttk
from typing import Optional
import numpy as np
from PIL import Image, ImageTk

from base_plugin import BasePlugin
from event_bus import EventBus, Event


class UIPlugin(BasePlugin):
    """
    UI Plugin（Tkinter）

    訂閱：
      - vision.frame           → webcam 原始畫面
      - vision.ball_position   → 球偵測結果
      - comm.arm_position      → 手臂目前座標
      - comm.arduino_status    → Arduino 連線狀態

    發佈：
      - ui.command             → quit / strike / calibrate

    力道：線性 0.0 ~ 1.0（連續可調，非段數）
    """

    name = "ui"

    def __init__(self, bus: EventBus = None, window_title: str = "Pool Robot Control"):
        super().__init__(bus)
        self.window_title = window_title
        self.root: Optional[tk.Tk] = None

        # 狀態
        self.frame: Optional[np.ndarray] = None
        self.ball_pos: Optional[dict] = None
        self.arm_pos: Optional[dict] = None
        self.arduino_status: bool = False
        self.current_force: float = 0.0

        # GUI 元件
        self._video_label = None
        self._photo: Optional[ImageTk.PhotoImage] = None
        self._status_labels: dict = {}
        self._force_slider = None

    # ── BasePlugin 實作 ─────────────────────────────────────

    def init(self) -> bool:
        try:
            self._init_tkinter()
            print(f"[UIPlugin] 視窗建立: {self.window_title}")
            return True
        except Exception as e:
            print(f"[UIPlugin] Tkinter 初始化失敗（無顯示環境或 DISPLAY 未設定）: {e}")
            return False

    def update(self) -> None:
        """Tkinter 主循環靠 after() 推動，這裡不做任何事"""
        if self.root:
            self.root.update()

    def shutdown(self) -> None:
        if self.root:
            self.root.destroy()
            self.root = None
        # Clear all state
        self.frame = None
        self.ball_pos = None
        self.arm_pos = None
        self.arduino_status = False
        self.current_force = 0.0
        print("[UIPlugin] 已關閉視窗")

    # ── 事件處理 ─────────────────────────────────────────────

    def on_event(self, event: Event) -> None:
        if event.type == "vision.frame":
            self.frame = event.data
            self._update_video(event.data)
        elif event.type == "vision.ball_position":
            self.ball_pos = event.data
            self._update_ball_status(event.data)
        elif event.type == "comm.arm_position":
            self.arm_pos = event.data
            self._update_arm_status(event.data)
        elif event.type == "comm.arduino_status":
            self.arduino_status = event.data
            self._update_arduino_status(event.data)

    # ── 私有：GUI 初始化 ────────────────────────────────────

    def _init_tkinter(self):
        self.root = tk.Tk()
        self.root.title(self.window_title)
        self.root.geometry("900x500")
        self.root.resizable(True, True)

        # 左側：視訊
        left_frame = ttk.Frame(self.root, padding=10)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        ttk.Label(left_frame, text="Webcam Feed", font=("Arial", 12, "bold")).pack()

        video_frame = ttk.LabelFrame(left_frame, text="Camera", padding=5)
        video_frame.pack(fill=tk.BOTH, expand=True)

        self._video_label = ttk.Label(video_frame)
        self._video_label.pack(fill=tk.BOTH, expand=True)

        # 右側：狀態 + 控制
        right_frame = ttk.Frame(self.root, padding=10)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=False)

        ttk.Label(right_frame, text="System Status", font=("Arial", 12, "bold")).pack()

        status_frame = ttk.LabelFrame(right_frame, text="Ball Position", padding=10)
        status_frame.pack(fill=tk.X, pady=(0, 10))

        self._status_labels["ball_x"] = ttk.Label(status_frame, text="X: -- mm")
        self._status_labels["ball_x"].pack(anchor="w")

        self._status_labels["ball_y"] = ttk.Label(status_frame, text="Y: -- mm")
        self._status_labels["ball_y"].pack(anchor="w")

        self._status_labels["ball_conf"] = ttk.Label(status_frame, text="Confidence: --")
        self._status_labels["ball_conf"].pack(anchor="w")

        arm_frame = ttk.LabelFrame(right_frame, text="Arm Position", padding=10)
        arm_frame.pack(fill=tk.X, pady=(0, 10))

        self._status_labels["arm_x"] = ttk.Label(arm_frame, text="X: -- mm")
        self._status_labels["arm_x"].pack(anchor="w")

        self._status_labels["arm_y"] = ttk.Label(arm_frame, text="Y: -- mm")
        self._status_labels["arm_y"].pack(anchor="w")

        self._status_labels["arm_z"] = ttk.Label(arm_frame, text="Z: -- mm")
        self._status_labels["arm_z"].pack(anchor="w")

        control_frame = ttk.LabelFrame(right_frame, text="Control", padding=10)
        control_frame.pack(fill=tk.X, pady=(0, 10))

        # 力道滑桿（線性 0.0 ~ 1.0）
        ttk.Label(control_frame, text="Force (linear)").pack(anchor="w")
        force_container = ttk.Frame(control_frame)
        force_container.pack(fill=tk.X, pady=(5, 0))

        self._force_slider = ttk.Scale(
            force_container,
            from_=0.0,
            to=1.0,
            orient=tk.HORIZONTAL,
            value=self.current_force,
            command=self._on_force_changed
        )
        self._force_slider.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self._status_labels["force_value"] = ttk.Label(force_container, text="0.00")
        self._status_labels["force_value"].pack(side=tk.LEFT, padx=(5, 0))

        # 按鈕
        btn_frame = ttk.Frame(control_frame)
        btn_frame.pack(fill=tk.X, pady=(10, 0))

        strike_btn = ttk.Button(btn_frame, text="STRIKE", style="Accent.TButton")
        strike_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        strike_btn.configure(command=lambda: self.publish_command("strike"))

        reset_btn = ttk.Button(btn_frame, text="RESET")
        reset_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        reset_btn.configure(command=lambda: self.publish_command("reset"))

        quit_btn = ttk.Button(btn_frame, text="QUIT")
        quit_btn.pack(side=tk.LEFT, fill=tk.X, expand=True)
        quit_btn.configure(command=lambda: self.publish_command("quit"))

        # Arduino 狀態
        self._status_labels["arduino"] = ttk.Label(right_frame, text="Arduino: --")
        self._status_labels["arduino"].pack(anchor="w", pady=(10, 0))

        # 設定定時更新（ Tkinter 非 blocking）
        self._schedule_update()

    def _schedule_update(self):
        """定時更新視訊畫面（每 30ms）"""
        if self.root and self.frame is not None:
            self._update_video(self.frame)
        if self.root:
            self.root.after(30, self._schedule_update)

    # ── 私有：UI 更新 ────────────────────────────────────────

    def _update_video(self, frame: np.ndarray):
        """將 numpy frame 轉換為 Tkinter PhotoImage 並顯示"""
        if self._video_label is None or self.root is None:
            return

        try:
            # BGR → RGB
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)

            # 調整大小以符合 label
            label_w = self._video_label.winfo_width() or 400
            label_h = self._video_label.winfo_height() or 300
            pil_img = pil_img.resize((label_w, label_h), Image.Resampling.LANCZOS)

            self._photo = ImageTk.PhotoImage(pil_img)
            self._video_label.configure(image=self._photo)
        except Exception:
            pass  # 忽略轉換錯誤

    def _update_ball_status(self, data: dict):
        if self._status_labels.get("ball_x"):
            self._status_labels["ball_x"].configure(text=f"X: {data.get('x', 0):.1f} mm")
        if self._status_labels.get("ball_y"):
            self._status_labels["ball_y"].configure(text=f"Y: {data.get('y', 0):.1f} mm")
        if self._status_labels.get("ball_conf"):
            conf = data.get('confidence', 0)
            self._status_labels["ball_conf"].configure(text=f"Confidence: {conf:.2f}")

    def _update_arm_status(self, data: dict):
        if self._status_labels.get("arm_x"):
            self._status_labels["arm_x"].configure(text=f"X: {data.get('x', 0):.1f} mm")
        if self._status_labels.get("arm_y"):
            self._status_labels["arm_y"].configure(text=f"Y: {data.get('y', 0):.1f} mm")
        if self._status_labels.get("arm_z"):
            self._status_labels["arm_z"].configure(text=f"Z: {data.get('z', 0):.1f} mm")

    def _update_arduino_status(self, status: bool):
        if self._status_labels.get("arduino"):
            text = "Arduino: Connected" if status else "Arduino: Disconnected"
            color = "green" if status else "red"
            self._status_labels["arduino"].configure(text=text, foreground=color)

    # ── 私有：力道控制 ──────────────────────────────────────

    def _on_force_changed(self, value):
        """力道滑桿變更時更新狀態"""
        self.current_force = float(value)
        if self._status_labels.get("force_value"):
            self._status_labels["force_value"].configure(text=f"{self.current_force:.2f}")

    def set_force(self, value: float):
        """設定力道（外部呼叫用）"""
        self.current_force = max(0.0, min(1.0, value))
        if self._force_slider:
            self._force_slider.set(self.current_force)

    # ── 發佈命令 ─────────────────────────────────────────────

    def publish_command(self, cmd: str):
        """發佈 ui.command 事件"""
        if self.bus:
            self.bus.publish("ui.command", cmd)


# ── 解決 cv2 循環依賴 ────────────────────────────────────────
# 注意：Tkinter GUI 不需要在 update() 裡讀 webcam
# frame 從 EventBus 的 vision.frame 事件取得
import cv2  # 只用於 BGR→RGB 轉換，放在這裡避免頂層 import