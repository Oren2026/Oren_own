# tests/test_ui.py
"""UI 模組單元測試

注意：Tkinter 在無顯示環境（CI/headless）下 init() 會失敗。
測試分為兩類：
  - 架構測試（不需 init）：狀態管理、事件處理、command 發佈
  - GUI 測試（需 init）：需要在有顯示環境中手動測試
"""

import pytest
import numpy as np

from event_bus import EventBus, Event
from ui_plugin import UIPlugin


# ── 輔助： Mock Tkinter ──────────────────────────────────────

class MockTkinter:
    """讓 UIPlugin 在無顯示環境也能運作的 Mock"""
    class Tk:
        def __init__(self):
            pass
        def title(self, *args): pass
        def geometry(self, *args): pass
        def resizable(self, *args): pass
        def pack(self, *args, **kwargs): pass
        def after(self, *args): pass
        def destroy(self): pass
    class Frame:
        def __init__(self, *args, **kwargs): pass
        def pack(self, *args, **kwargs): pass
    class Label:
        def __init__(self, *args, **kwargs): pass
        def pack(self, *args, **kwargs): pass
        def configure(self, *args, **kwargs): pass
    class Button:
        def __init__(self, *args, **kwargs): pass
        def pack(self, *args, **kwargs): pass
        def configure(self, *args, **kwargs): pass
    class Scale:
        def __init__(self, *args, **kwargs): pass
        def pack(self, *args, **kwargs): pass
        def set(self, *args): pass
        def get(self, *args): return 0.0
    class LabelFrame:
        def __init__(self, *args, **kwargs): pass
        def pack(self, *args, **kwargs): pass


# ── 測試：狀態管理（不需 init）────────────────────────────────

class TestUIPluginState:
    """UIPlugin 狀態儲存測試（不需 Tkinit）"""

    def test_default_force_is_zero(self):
        plugin = UIPlugin()
        assert plugin.current_force == 0.0

    def test_set_force(self):
        plugin = UIPlugin()
        plugin.current_force = 0.0  # 繞過 init
        plugin.set_force(0.65)
        assert plugin.current_force == 0.65

    def test_force_clamp_zero(self):
        plugin = UIPlugin()
        plugin.current_force = 0.0
        plugin.set_force(-0.5)
        assert plugin.current_force == 0.0

    def test_force_clamp_one(self):
        plugin = UIPlugin()
        plugin.current_force = 0.0
        plugin.set_force(1.5)
        assert plugin.current_force == 1.0

    def test_initial_state_none(self):
        plugin = UIPlugin()
        assert plugin.frame is None
        assert plugin.ball_pos is None
        assert plugin.arm_pos is None
        assert plugin.arduino_status is False


class TestUIPluginEvents:
    """UIPlugin 事件處理測試（不需 init）"""

    def test_ball_position_event(self):
        plugin = UIPlugin()
        plugin.on_event(Event(
            type="vision.ball_position",
            data={"x": 234.5, "y": 156.0, "confidence": 0.87}
        ))
        assert plugin.ball_pos["x"] == 234.5
        assert plugin.ball_pos["y"] == 156.0
        assert plugin.ball_pos["confidence"] == 0.87

    def test_arm_position_event(self):
        plugin = UIPlugin()
        plugin.on_event(Event(
            type="comm.arm_position",
            data={"x": 100.0, "y": 200.0, "z": 50.0}
        ))
        assert plugin.arm_pos["x"] == 100.0
        assert plugin.arm_pos["z"] == 50.0

    def test_arduino_status_true(self):
        plugin = UIPlugin()
        plugin.on_event(Event(type="comm.arduino_status", data=True))
        assert plugin.arduino_status is True

    def test_arduino_status_false(self):
        plugin = UIPlugin()
        plugin.arduino_status = True
        plugin.on_event(Event(type="comm.arduino_status", data=False))
        assert plugin.arduino_status is False

    def test_frame_event(self):
        plugin = UIPlugin()
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        plugin.on_event(Event(type="vision.frame", data=mock_frame))
        assert plugin.frame is not None
        assert plugin.frame.shape == (480, 640, 3)

    def test_multiple_events_accumulate(self):
        plugin = UIPlugin()
        plugin.on_event(Event(type="vision.ball_position", data={"x": 100, "y": 200, "confidence": 0.9}))
        plugin.on_event(Event(type="comm.arm_position", data={"x": 50, "y": 150, "z": 30}))
        plugin.on_event(Event(type="comm.arduino_status", data=True))
        plugin.on_event(Event(type="vision.frame", data=np.zeros((10, 10, 3), dtype=np.uint8)))

        assert plugin.ball_pos["x"] == 100
        assert plugin.arm_pos["z"] == 30
        assert plugin.arduino_status is True
        assert plugin.frame.shape == (10, 10, 3)

    def test_ignore_unknown_event(self):
        plugin = UIPlugin()
        plugin.on_event(Event(type="some.unknown.event", data="anything"))
        # 不應拋異常，狀態不變
        assert plugin.ball_pos is None


class TestUIPluginPublish:
    """UIPlugin 發佈事件測試（不需 init）"""

    def test_strike_command_published(self):
        bus = EventBus()
        plugin = UIPlugin(bus)
        plugin.current_force = 0.5

        received = []
        bus.subscribe("ui.command", lambda e: received.append(e.data))

        plugin.publish_command("strike")
        assert len(received) == 1
        assert received[0] == "strike"

    def test_quit_command_published(self):
        bus = EventBus()
        plugin = UIPlugin(bus)

        received = []
        bus.subscribe("ui.command", lambda e: received.append(e.data))

        plugin.publish_command("quit")
        assert len(received) == 1
        assert received[0] == "quit"

    def test_calibrate_command_published(self):
        bus = EventBus()
        plugin = UIPlugin(bus)

        received = []
        bus.subscribe("ui.command", lambda e: received.append(e.data))

        plugin.publish_command("calibrate")
        assert len(received) == 1
        assert received[0] == "calibrate"

    def test_reset_command_published(self):
        bus = EventBus()
        plugin = UIPlugin(bus)

        received = []
        bus.subscribe("ui.command", lambda e: received.append(e.data))

        plugin.publish_command("reset")
        assert len(received) == 1
        assert received[0] == "reset"

    def test_no_bus_does_not_crash(self):
        plugin = UIPlugin(bus=None)
        plugin.publish_command("strike")  # 不應拋異常


class TestUIPluginShutdown:
    """UIPlugin 關閉測試"""

    def test_shutdown_no_bus_no_crash(self):
        plugin = UIPlugin()
        plugin.ball_pos = {"x": 100, "y": 200, "confidence": 0.9}
        plugin.current_force = 0.5
        plugin.shutdown()  # 不應拋異常
        assert plugin.ball_pos is None  # shutdown 清除狀態

    def test_shutdown_clears_frame(self):
        plugin = UIPlugin()
        plugin.frame = np.zeros((480, 640, 3), dtype=np.uint8)
        plugin.shutdown()
        assert plugin.frame is None

    def test_shutdown_clears_force(self):
        plugin = UIPlugin()
        plugin.current_force = 0.8
        plugin.shutdown()
        assert plugin.current_force == 0.0


class TestUIPluginName:
    """Plugin 識別測試"""

    def test_name_is_ui(self):
        plugin = UIPlugin()
        assert plugin.name == "ui"


class TestUIPluginUpdate:
    """update() 測試"""

    def test_update_no_crash_without_root(self):
        """update() 在沒有 init 的情況下不應崩潰"""
        plugin = UIPlugin()
        plugin.update()  # 不應拋異常

    def test_update_no_crash_with_root(self):
        """update() 在有 root 的情況下也不應崩潰"""
        plugin = UIPlugin()
        plugin.root = None  # 未 init
        plugin.update()  # 不應拋異常