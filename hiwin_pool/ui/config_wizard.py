"""
config_wizard.py - 環境設定精靈介面

本程式提供 GUI 介面用於設定系統各項參數，包括：
- 手臂連線設定（IP、Port）
- Arduino 序列連線設定（COM Port）
- 相機設定（Camera ID）
- 球檯設定（寬度、高度、原點位置）

使用 Tkinter + TTK 實作，支援獨立測試連線功能。
"""

import os
import socket
import tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path

# Optional imports - handle gracefully if not available
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


# Config file path
CONFIG_DIR = Path("/Users/oren/Desktop/Oren_own/hiwin_pool/config")
CONFIG_FILE = CONFIG_DIR / "local_config.py"


class ConfigWizard:
    """環境設定精靈主類別"""

    def __init__(self, root):
        """
        初始化設定精靈視窗

        Args:
            root: Tkinter 根視窗
        """
        self.root = root
        self.root.title("環境設定精靈")
        self.root.geometry("500x600")
        self.root.resizable(False, False)

        # Variables
        self.arm_ip_var = tk.StringVar(value="192.168.1.100")
        self.arm_port_var = tk.StringVar(value="5000")
        self.arduino_com_var = tk.StringVar()
        self.arduino_enabled = tk.BooleanVar(value=False)
        self.camera_id_var = tk.StringVar(value="0")
        self.table_width_var = tk.StringVar(value="1200")
        self.table_height_var = tk.StringVar(value="630")
        self.table_origin_var = tk.StringVar(value="bottom_left")

        # Arduino frame reference for show/hide
        self.arduino_frame = None

        # Build UI
        self._create_widgets()

        # Load existing config
        self._load_config()

    def _create_widgets(self):
        """建立所有 UI 元件"""
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # ===== 手臂設定 =====
        arm_frame = ttk.LabelFrame(main_frame, text="手臂設定", padding="10")
        arm_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(arm_frame, text="IP 位址:").grid(row=0, column=0, sticky=tk.W, pady=5)
        ttk.Entry(arm_frame, textvariable=self.arm_ip_var, width=25).grid(row=0, column=1, pady=5)

        ttk.Label(arm_frame, text="Port:").grid(row=1, column=0, sticky=tk.W, pady=5)
        ttk.Entry(arm_frame, textvariable=self.arm_port_var, width=25).grid(row=1, column=1, pady=5)

        ttk.Button(arm_frame, text="測試連線", command=self._test_arm).grid(row=2, column=1, sticky=tk.E, pady=5)

        # ===== Arduino 設定 =====
        self.arduino_frame = ttk.LabelFrame(main_frame, text="Arduino 設定", padding="10")
        self.arduino_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(self.arduino_frame, text="COM Port:").grid(row=0, column=0, sticky=tk.W, pady=5)

        # COM Port dropdown
        self.arduino_combo = ttk.Combobox(self.arduino_frame, textvariable=self.arduino_com_var, width=22)
        self.arduino_combo.grid(row=0, column=1, pady=5)
        self._refresh_com_ports()

        ttk.Button(self.arduino_frame, text="重新整理", command=self._refresh_com_ports).grid(row=0, column=2, padx=(5, 0))
        ttk.Button(self.arduino_frame, text="測試連線", command=self._test_arduino).grid(row=1, column=1, sticky=tk.E, pady=5)

        # Hide Arduino frame by default
        self.arduino_frame.pack_forget()

        # ===== 相機設定 =====
        camera_frame = ttk.LabelFrame(main_frame, text="相機設定", padding="10")
        camera_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(camera_frame, text="Camera ID:").grid(row=0, column=0, sticky=tk.W, pady=5)
        ttk.Entry(camera_frame, textvariable=self.camera_id_var, width=25).grid(row=0, column=1, pady=5)
        ttk.Button(camera_frame, text="測試連線", command=self._test_camera).grid(row=1, column=1, sticky=tk.E, pady=5)

        # ===== 球檯設定 =====
        table_frame = ttk.LabelFrame(main_frame, text="球檯設定", padding="10")
        table_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(table_frame, text="寬度:").grid(row=0, column=0, sticky=tk.W, pady=5)
        ttk.Entry(table_frame, textvariable=self.table_width_var, width=25).grid(row=0, column=1, pady=5)

        ttk.Label(table_frame, text="高度:").grid(row=1, column=0, sticky=tk.W, pady=5)
        ttk.Entry(table_frame, textvariable=self.table_height_var, width=25).grid(row=1, column=1, pady=5)

        ttk.Label(table_frame, text="原點位置:").grid(row=2, column=0, sticky=tk.W, pady=5)
        origin_combo = ttk.Combobox(
            table_frame,
            textvariable=self.table_origin_var,
            values=["bottom_left", "top_left", "top_right", "bottom_right"],
            width=22,
            state="readonly"
        )
        origin_combo.grid(row=2, column=1, pady=5)

        # ===== 底部按鈕區 =====
        bottom_frame = ttk.Frame(main_frame)
        bottom_frame.pack(fill=tk.X, pady=(10, 0))

        # Arduino enable checkbox
        arduino_check = ttk.Checkbutton(
            bottom_frame,
            text="我有使用 Arduino",
            variable=self.arduino_enabled,
            command=self._toggle_arduino
        )
        arduino_check.pack(side=tk.LEFT)

        # Save and Cancel buttons
        ttk.Button(bottom_frame, text="取消", command=self.root.destroy).pack(side=tk.RIGHT)
        ttk.Button(bottom_frame, text="儲存", command=self._save_config).pack(side=tk.RIGHT, padx=(0, 5))

    def _refresh_com_ports(self):
        """重新整理可用 COM Port 清單"""
        if not SERIAL_AVAILABLE:
            self.arduino_combo["values"] = ["(未安裝 pyserial)"]
            return

        try:
            ports = serial.tools.list_ports.comports()
            port_list = [p.device for p in ports]
            if not port_list:
                port_list = ["(無可用連接埠)"]
            self.arduino_combo["values"] = port_list
            if port_list and port_list[0] != "(無可用連接埠)":
                self.arduino_combo.current(0)
        except Exception as e:
            self.arduino_combo["values"] = [f"(錯誤: {e})"]

    def _toggle_arduino(self):
        """切換 Arduino 區塊顯示/隱藏"""
        if self.arduino_enabled.get():
            self.arduino_frame.pack(fill=tk.X, pady=(0, 10))
        else:
            self.arduino_frame.pack_forget()

    def _test_arm(self):
        """測試手臂 TCP/IP 連線"""
        ip = self.arm_ip_var.get().strip()
        port_str = self.arm_port_var.get().strip()

        if not ip:
            messagebox.showwarning("警告", "請輸入 IP 位址")
            return
        if not port_str:
            messagebox.showwarning("警告", "請輸入 Port")
            return

        try:
            port = int(port_str)
        except ValueError:
            messagebox.showerror("錯誤", "Port 必須為數字")
            return

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            sock.connect((ip, port))
            sock.close()
            messagebox.showinfo("連線測試", "連線成功")
        except socket.timeout:
            messagebox.showerror("連線測試", "連線失敗：連線逾時")
        except socket.error as e:
            messagebox.showerror("連線測試", f"連線失敗：{e}")
        except Exception as e:
            messagebox.showerror("連線測試", f"連線失敗：{e}")

    def _test_arduino(self):
        """測試 Arduino 序列連線"""
        if not SERIAL_AVAILABLE:
            messagebox.showerror("連線測試", " pyserial 未安裝，無法測試")
            return

        com = self.arduino_com_var.get().strip()
        if not com or com.startswith("("):
            messagebox.showwarning("警告", "請選擇有效的 COM Port")
            return

        try:
            ser = serial.Serial(com, 9600, timeout=2)
            ser.close()
            messagebox.showinfo("連線測試", "連線成功")
        except serial.SerialException as e:
            messagebox.showerror("連線測試", f"連線失敗：{e}")
        except Exception as e:
            messagebox.showerror("連線測試", f"連線失敗：{e}")

    def _test_camera(self):
        """測試相機連線"""
        if not CV2_AVAILABLE:
            messagebox.showerror("連線測試", "OpenCV 未安裝，無法測試")
            return

        camera_id_str = self.camera_id_var.get().strip()
        if not camera_id_str:
            messagebox.showwarning("警告", "請輸入 Camera ID")
            return

        try:
            camera_id = int(camera_id_str)
        except ValueError:
            messagebox.showerror("錯誤", "Camera ID 必須為數字")
            return

        try:
            cap = cv2.VideoCapture(camera_id)
            if cap.isOpened():
                cap.release()
                messagebox.showinfo("連線測試", "相機正常")
            else:
                messagebox.showerror("連線測試", "無法開啟相機")
        except Exception as e:
            messagebox.showerror("連線測試", f"無法開啟相機：{e}")

    def _load_config(self):
        """載入現有的設定檔"""
        if not CONFIG_FILE.exists():
            return

        try:
            # Read the config file and extract values
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                content = f.read()

            # Parse ARM_IP
            for line in content.split("\n"):
                if line.startswith("ARM_IP"):
                    value = line.split("=", 1)[1].strip().strip('"').strip("'")
                    self.arm_ip_var.set(value)
                elif line.startswith("ARM_PORT"):
                    value = line.split("=", 1)[1].strip()
                    self.arm_port_var.set(value)
                elif line.startswith("ARDUINO_COM"):
                    value = line.split("=", 1)[1].strip().strip('"').strip("'").strip("#").split("#")[0].strip()
                    if value and value != "None":
                        self.arduino_com_var.set(value)
                        self.arduino_enabled.set(True)
                        self._toggle_arduino()
                elif line.startswith("CAMERA_ID"):
                    value = line.split("=", 1)[1].strip()
                    self.camera_id_var.set(value)
                elif line.startswith("TABLE_WIDTH"):
                    value = line.split("=", 1)[1].strip()
                    self.table_width_var.set(value)
                elif line.startswith("TABLE_HEIGHT"):
                    value = line.split("=", 1)[1].strip()
                    self.table_height_var.set(value)
                elif line.startswith("TABLE_ORIGIN"):
                    value = line.split("=", 1)[1].strip().strip('"').strip("'")
                    self.table_origin_var.set(value)
        except Exception as e:
            print(f"載入設定失敗: {e}")

    def _save_config(self):
        """儲存設定到 local_config.py"""
        # Validate required fields
        arm_ip = self.arm_ip_var.get().strip()
        arm_port = self.arm_port_var.get().strip()
        camera_id = self.camera_id_var.get().strip()
        table_width = self.table_width_var.get().strip()
        table_height = self.table_height_var.get().strip()
        table_origin = self.table_origin_var.get().strip()

        if not arm_ip:
            messagebox.showwarning("警告", "請填寫手臂 IP 位址")
            return
        if not arm_port:
            messagebox.showwarning("警告", "請填寫手臂 Port")
            return
        if not camera_id:
            messagebox.showwarning("警告", "請填寫 Camera ID")
            return
        if not table_width:
            messagebox.showwarning("警告", "請填寫球檯寬度")
            return
        if not table_height:
            messagebox.showwarning("警告", "請填寫球檯高度")
            return

        # Validate numeric fields
        try:
            int(arm_port)
        except ValueError:
            messagebox.showerror("錯誤", "手臂 Port 必須為數字")
            return

        try:
            int(camera_id)
        except ValueError:
            messagebox.showerror("錯誤", "Camera ID 必須為數字")
            return

        try:
            int(table_width)
        except ValueError:
            messagebox.showerror("錯誤", "球檯寬度必須為數字")
            return

        try:
            int(table_height)
        except ValueError:
            messagebox.showerror("錯誤", "球檯高度必須為數字")
            return

        # Arduino COM
        arduino_com = self.arduino_com_var.get().strip() if self.arduino_enabled.get() else None

        # Ensure config directory exists
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)

        # Write config file
        config_content = f'''# config/local_config.py
# 自動產生，請勿手動修改

ARM_IP = "{arm_ip}"
ARM_PORT = {arm_port}
ARDUINO_COM = {f'"{arduino_com}"' if arduino_com else "None"}  # None if not used
CAMERA_ID = {camera_id}
TABLE_WIDTH = {table_width}
TABLE_HEIGHT = {table_height}
TABLE_ORIGIN = "{table_origin}"  # "bottom_left" | "top_left" | "top_right" | "bottom_right"
'''

        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                f.write(config_content)
            messagebox.showinfo("儲存", "設定已儲存到 config/local_config.py")
        except Exception as e:
            messagebox.showerror("錯誤", f"儲存失敗：{e}")


def main():
    """主程式入口"""
    root = tk.Tk()
    app = ConfigWizard(root)
    root.mainloop()


if __name__ == "__main__":
    main()
