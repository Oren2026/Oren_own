#!/usr/bin/env python3
# setup.py — 跨平台Installer（Windows/Mac/Linux Ubuntu）
"""
hiwin_pool 環境安裝腳本

功能：
  1. 建立目錄結構
  2. 互動式問答建立基本設定
  3. 產生 config/local_config.py
  4. 產生 config/version 檔案（版本 0.1.0）
  5. 檢查 Python 環境

用法：
  python setup.py

不要覆蓋已存在的檔案（會跳過並告知）。
"""

import os
import sys
from pathlib import Path

# ============================================================
# 基础路径
# ============================================================
REPO_ROOT = Path(__file__).parent.resolve()


# ============================================================
# 目錄結構定義
# ============================================================
DIRECTORIES = [
    "interfaces",
    "vision/YOUR_VERSION",
    "strategy/YOUR_VERSION",
    "motion",
    "comm",
    "config",
    "ui",
    "tests",
    "shot_log",
]

# 必須存在的核心檔案（用於檢查是否已有框架）
EXISTING_FILES = {
    REPO_ROOT / "comm" / "hiwin_arm.py",
    REPO_ROOT / "config" / "strike_config.py",
    REPO_ROOT / "vision" / "ball_detector.py",
    REPO_ROOT / "interfaces" / "__init__.py",  # 剛建立
}


# ============================================================
# 顏色輸出（跨平台）
# ============================================================
class Colors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"

    @staticmethod
    def disable():
        for attr in ["HEADER", "OKBLUE", "OKGREEN", "WARNING", "FAIL", "ENDC", "BOLD"]:
            setattr(Colors, attr, "")


# ============================================================
# 工具函式
# ============================================================
def print_step(msg):
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}▶ {msg}{Colors.ENDC}")

def print_ok(msg):
    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} {msg}")

def print_skip(msg):
    print(f"  {Colors.WARNING}⊘ 跳過{Colors.ENDC} {msg}")

def print_fail(msg):
    print(f"  {Colors.FAIL}✗{Colors.ENDC} {msg}")

def confirm(prompt):
    while True:
        ans = input(f"  {Colors.WARNING}{prompt} [y/N]: {Colors.ENDC}").strip().lower()
        if ans in ("y", "yes"):
            return True
        elif ans in ("n", "no", ""):
            return False
        print("  請輸入 y 或 n")


# ============================================================
# 步驟1：建立目錄結構
# ============================================================
def create_directories():
    print_step("步驟 1/5：建立目錄結構")

    for d in DIRECTORIES:
        dir_path = REPO_ROOT / d
        if dir_path.exists():
            print_skip(f"目錄已存在 → {d}/")
        else:
            dir_path.mkdir(parents=True, exist_ok=True)
            print_ok(f"建立目錄 → {d}/")


# ============================================================
# 步驟2：檢查 Python 環境
# ============================================================
REQUIRED_PACKAGES = ["cv2", "serial", "numpy"]  # cv2=opencv-python, serial=pyserial
PYTHON_MIN_VERSION = (3, 8)

def check_python_env():
    print_step("步驟 2/5：檢查 Python 環境")

    # 版本檢查
    version = sys.version_info
    if version < PYTHON_MIN_VERSION:
        print_fail(f"Python {version.major}.{version.minor} — 需要 Python {'.'.join(map(str, PYTHON_MIN_VERSION))} 或以上")
        return False
    print_ok(f"Python {version.major}.{version.minor}.{version.micro}")

    # 套件檢查
    missing = []
    for pkg in REQUIRED_PACKAGES:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if missing:
        print_fail(f"缺少必要套件：{', '.join(missing)}")
        print(f"\n  請執行以下指令安裝：")
        print(f"  {Colors.BOLD}pip install opencv-python pyserial numpy{Colors.ENDC}")
        if confirm("現在自動安裝？"):

            import subprocess
            for m in missing:
                pkg_map = {"cv2": "opencv-python", "serial": "pyserial", "numpy": "numpy"}
                subprocess.check_call([sys.executable, "-m", "pip", "install", pkg_map.get(m, m)])
            print_ok("套件安裝完成")
        else:
            print("  略過套件安裝（稍後手動執行 pip install）")
    else:
        print_ok(f"必要套件齊全：opencv-python, pyserial, numpy")

    return True


# ============================================================
# 步驟3：互動式問答
# ============================================================
PLATFORM_HINTS = {
    "windows": "COM3",
    "darwin": "/dev/cu.usbmodem14101",
    "linux": "/dev/ttyUSB0",
}

def interactive_config():
    print_step("步驟 3/5：互動式設定（optional）")

    if not confirm("是否要透過問答建立 config/local_config.py？"):
        print("  略過設定精靈（可稍後執行 python setup.py 重新進入）")
        return None

    print(f"\n  請回答以下問題（直接按 Enter 使用預設值）：\n")

    defaults = {
        "hiwin_ip": "192.168.0.100",
        "hiwin_port": "5555",
        "arduino_com": PLATFORM_HINTS.get(sys.platform, "COM3"),
        "camera_index": "0",
        "table_width": "2540",   # mm
        "table_height": "1270",  # mm
    }

    result = {}

    # IP
    result["hiwin_ip"] = input(f"  HIWIN 手臂 IP [{defaults['hiwin_ip']}]: ").strip() or defaults["hiwin_ip"]

    # Port
    result["hiwin_port"] = input(f"  HIWIN 手臂通訊 Port [{defaults['hiwin_port']}]: ").strip() or defaults["hiwin_port"]

    # COM port
    result["arduino_com"] = input(f"  Arduino COM port [{defaults['arduino_com']}]: ").strip() or defaults["arduino_com"]

    # Camera index
    result["camera_index"] = input(f"  相機索引 (通常 0) [{defaults['camera_index']}]: ").strip() or defaults["camera_index"]

    # Table size
    result["table_width"] = input(f"  球檯寬度 mm [{defaults['table_width']}]: ").strip() or defaults["table_width"]
    result["table_height"] = input(f"  球檯高度 mm [{defaults['table_height']}]: ").strip() or defaults["table_height"]

    print(f"\n{Colors.OKGREEN}設定完成！{Colors.ENDC}")
    return result


# ============================================================
# 步驟4：寫入設定檔
# ============================================================
def write_config(answers):
    print_step("步驟 4/5：寫入設定檔")

    if answers is None:
        print_skip("使用者略過設定")
        return

    config_path = REPO_ROOT / "config" / "local_config.py"

    if config_path.exists():
        print_skip(f"檔案已存在 → config/local_config.py（不覆蓋）")
        print(f"  如需重新產生，請先刪除該檔案後再執行 setup.py")
        return

    content = f'''# config/local_config.py
# 由 setup.py 自動產生（{sys.platform}）
# 此檔案為使用者自定義設定，會被 .gitignore 排除

# ============ HIWIN 手臂設定 ============
HIWIN_IP = "{answers["hiwin_ip"]}"
HIWIN_PORT = {answers["hiwin_port"]}

# ============ Arduino 序列設定 ============
ARDUINO_COM = "{answers["arduino_com"]}"   # 視作業系統不同
BAUD_RATE = 115200

# ============ 相機設定 ============
CAMERA_INDEX = {answers["camera_index"]}

# ============ 球檯尺寸（mm）============
TABLE_WIDTH_MM = {answers["table_width"]}
TABLE_HEIGHT_MM = {answers["table_height"]}

# ============ 框架參數（不需修改）=======
SAFE_Z = 200        # 安全高度（mm）
Z_HOME = 300        # 歸零高度（mm）
STRIKE_Z = 65       # 擊球高度（mm）
'''

    config_path.write_text(content, encoding="utf-8")
    print_ok(f"寫入 → config/local_config.py")

    # 寫入 version 檔案
    version_path = REPO_ROOT / "config" / "version"
    if version_path.exists():
        print_skip("version 檔案已存在")
    else:
        version_path.write_text('__version__ = "0.1.0"\n', encoding="utf-8")
        print_ok("寫入 → config/version")


# ============================================================
# 步驟5：印出目錄結構
# ============================================================
def print_tree():
    print_step("步驟 5/5：目錄結構確認")

    def walk(root, prefix="", is_last=True):
        parts = []
        if root == REPO_ROOT:
            pass
        else:
            parts.append(root.name)

        # Get children
        try:
            children = sorted(root.iterdir(), key=lambda p: (p.is_file(), p.name))
        except PermissionError:
            return []

        lines = []
        for i, child in enumerate(children):
            is_last_child = (i == len(children) - 1)
            connector = "└── " if is_last_child else "├── "
            color = Colors.OKGREEN if child.is_dir() else Colors.ENDC
            lines.append(f"{prefix}{connector}{color}{child.name}/{Colors.ENDC if child.is_dir() else ''}")
            if child.is_dir():
                extension = "    " if is_last_child else "│   "
                lines.extend(walk(child, prefix + extension, is_last_child))
        return lines

    print(f"\n  {Colors.BOLD}{REPO_ROOT}{Colors.ENDC}/")
    for line in walk(REPO_ROOT):
        print(f"  {line}")

    print(f"\n{Colors.OKGREEN}{Colors.BOLD}✓ 安裝完成！{Colors.ENDC}")
    print(f"\n下一步：")
    print(f"  1. 確認通訊設定（IP / COM port）")
    print(f"  2. 執行 python main.py 測試系統")
    print(f"  3. 修改 vision/YOUR_VERSION/ 和 strategy/YOUR_VERSION/ 加入你的程式")


# ============================================================
# 主程式
# ============================================================
def main():
    # 關閉顏色（Windows 非 ANSI 環境）
    if sys.platform == "win32":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:
            Colors.disable()

    print(f"{Colors.BOLD}{'='*60}")
    print(f"  hiwin_pool Installer — 版本 0.1.0")
    print(f"{'='*60}{Colors.ENDC}")

    print(f"\n工作目錄：{REPO_ROOT}")

    # 先檢查是否在正確的位置
    if not all(f.exists() for f in EXISTING_FILES):
        print_fail("警告：似乎不在正確的 hiwin_pool 根目錄")
        print("  預期找到：comm/hiwin_arm.py, config/strike_config.py, vision/ball_detector.py")
        if not confirm("是否繼續？" ):
            sys.exit(1)

    create_directories()
    check_python_env()
    answers = interactive_config()
    write_config(answers)
    print_tree()


if __name__ == "__main__":
    main()