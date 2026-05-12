# main.py
"""
上銀撞球 — 主程式（Plugin + EventBus 架構）

職責：
  - 建立 EventBus
  - 实例化所有 Plugin 並注册
  - 執行主循環
  - 處理quit命令

不再包含任何業務邏輯。
"""

import sys
import time
from event_bus import EventBus
from vision_plugin import VisionPlugin
from comm_plugin import CommPlugin
from motion_plugin import MotionPlugin
from ui_plugin import UIPlugin


def main():
    print("=== 上銀撞球程式啟動 ===\n")

    # 1. 建立 EventBus
    bus = EventBus()

    # 2. 实例化所有 Plugin（被動註冊）
    plugins = [
        ("vision", VisionPlugin(bus, camera_id=0)),
        ("comm",   CommPlugin(bus)),
        ("motion", MotionPlugin(bus)),
        ("ui",     UIPlugin(bus)),
    ]

    # 3. 向 bus 註冊每個 plugin
    print("[Setup] 注册 Plugin 到 EventBus...")
    for name, plugin in plugins:
        plugin.register(bus)
        print(f"  - {name}: ✓")

    # 4. 初始化每個 plugin
    print("\n[Init] 初始化 Plugin...")
    failed = []
    for name, plugin in plugins:
        if not plugin.init():
            failed.append(name)
            print(f"  - {name}: ✗ 初始化失敗")
        else:
            print(f"  - {name}: ✓")

    if failed:
        print(f"\n!!! 以下 Plugin 初始化失敗: {failed}")
        print("    程式將繼續運行（取決於 failed 模組是否關鍵）")

    # 5. 啟動所有 plugin
    print("\n[Start] 啟動主循環...")
    for name, plugin in plugins:
        plugin.start()

    print("\n執行中，按 Q 結束\n")

    # 6. 主循環
    try:
        while True:
            # 6a. UI 先更新（接收按鍵）
            ui = next((p for n, p in plugins if n == "ui"), None)
            if ui:
                ui.update()

            # 6b. 檢查 quit 命令
            # （實際由 UI 的按鍵觸發，這裡做最後把關）
            if ui and not ui.is_running:
                print("[Main] 收到 quit 命令")
                break

            # 6c. Vision 更新（讀 webcam，發佈 frame）
            vision = next((n, p) for n, p in plugins if n == "vision")
            _, vision_plugin = vision
            vision_plugin.update()

            # 6d. Motion / Comm 在被事件觸發時被動更新
            # （目前架構下，update() 是 stub，
            #   真實邏輯在 on_event() 裡，Bus 自動分派）
            for name, plugin in plugins:
                if name not in ("vision", "ui"):
                    plugin.update()

            # 小延遲，防止過度佔用 CPU
            time.sleep(0.001)

    except KeyboardInterrupt:
        print("\n[Main] 收到 Ctrl+C")

    finally:
        # 7. 關閉所有 plugin（倒序）
        print("\n[Shutdown] 關閉所有 Plugin...")
        for name, plugin in reversed(plugins):
            try:
                plugin.shutdown()
                print(f"  - {name}: ✓")
            except Exception as e:
                print(f"  - {name}: ✗ {e}")

        print("\n程式結束")


if __name__ == "__main__":
    main()
