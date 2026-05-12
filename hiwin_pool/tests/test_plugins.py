# tests/test_plugins.py
"""各 Plugin 單元測試"""

import pytest
import numpy as np
import sys
from event_bus import EventBus, Event
from vision_plugin import VisionPlugin
from comm_plugin import CommPlugin
from motion_plugin import MotionPlugin
from ui_plugin import UIPlugin


class TestCommPlugin:
    def test_init_returns_true(self):
        plugin = CommPlugin()
        assert plugin.init() is True
        assert plugin.arm_connected is True
        assert plugin.arduino_connected is True

    def test_arm_command_event(self):
        """收到 motion.arm_command 事件時不應報錯"""
        bus = EventBus()
        plugin = CommPlugin(bus)
        plugin.init()

        bus.subscribe("motion.arm_command", lambda e: plugin.on_event(e))
        bus.publish("motion.arm_command", {"x": 100, "y": 200, "z": 50})

    def test_strike_command_event(self):
        """收到 motion.strike_command 事件時不應報錯"""
        bus = EventBus()
        plugin = CommPlugin(bus)
        plugin.init()

        bus.subscribe("motion.strike_command", lambda e: plugin.on_event(e))
        bus.publish("motion.strike_command", {"force": 5})

    def test_shutdown_clears_status(self):
        plugin = CommPlugin()
        plugin.init()
        plugin.shutdown()
        assert plugin.arm_connected is False
        assert plugin.arduino_connected is False


class TestMotionPlugin:
    def test_init_returns_true(self):
        plugin = MotionPlugin()
        assert plugin.init() is True

    def test_low_confidence_ball_ignored(self):
        """confidence < 0.5 的球位置不應產生 arm_command"""
        bus = EventBus()
        plugin = MotionPlugin(bus)
        plugin.init()

        arm_cmds = []
        bus.subscribe("motion.arm_command", lambda e: arm_cmds.append(e.data))

        plugin.on_event(Event(
            type="vision.ball_position",
            data={"x": 100, "y": 200, "confidence": 0.3}
        ))

        assert arm_cmds == []

    def test_ball_position_generates_arm_command(self):
        """confidence >= 0.5 應產生 arm_command"""
        bus = EventBus()
        plugin = MotionPlugin(bus)
        plugin.init()

        arm_cmds = []
        bus.subscribe("motion.arm_command", lambda e: arm_cmds.append(e.data))

        plugin.on_event(Event(
            type="vision.ball_position",
            data={"x": 100, "y": 200, "confidence": 0.8}
        ))

        assert len(arm_cmds) == 1
        assert "x" in arm_cmds[0]
        assert "y" in arm_cmds[0]
        assert "z" in arm_cmds[0]

    def test_shutdown(self):
        plugin = MotionPlugin()
        plugin.init()
        plugin.shutdown()  # 不應拋異常


@pytest.mark.skipif(sys.platform == "darwin", reason="macOS Tkinter in CI unreliable")
class TestUIPlugin:
    """Tkinter UI 測試 — 在無顯示環境會 skip"""

    @pytest.fixture(autouse=True)
    def check_display(self):
        """Tkinter 需要顯示環境，skip 如果不可用"""
        import os
        if "DISPLAY" not in os.environ:
            pytest.skip("No DISPLAY, Tkinter unavailable")
        try:
            import tkinter as tk
            root = tk.Tk()
            root.withdraw()
            root.destroy()
        except Exception:
            pytest.skip("Tkinter init failed (headless?)")

    def test_init_returns_true(self):
        plugin = UIPlugin()
        assert plugin.init() is True

    def test_frame_stored_from_event(self):
        """收到 vision.frame 事件後，frame 應被儲存"""
        plugin = UIPlugin()
        plugin.init()

        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        plugin.on_event(Event(type="vision.frame", data=dummy_frame))

        assert plugin.frame is not None

    def test_ball_position_stored_from_event(self):
        plugin = UIPlugin()
        plugin.init()

        plugin.on_event(Event(
            type="vision.ball_position",
            data={"x": 100, "y": 200, "confidence": 0.9}
        ))

        assert plugin.ball_pos == {"x": 100, "y": 200, "confidence": 0.9}

    def test_create_overlay_no_crash(self):
        """即使沒有 frame，_create_overlay 也不應報錯"""
        plugin = UIPlugin()
        plugin.init()

        result = plugin._create_overlay()
        assert result is not None
        assert result.shape[2] == 3  # BGR channel

    def test_shutdown(self):
        plugin = UIPlugin()
        plugin.init()
        plugin.shutdown()


class TestPluginIntegration:
    """測試 Plugin 之間透過 EventBus 的協作"""

    def test_vision_comm_motion_chain(self):
        """
        模擬完整事件鏈：
        Vision → BallPosition → Motion → ArmCommand → Comm
        """
        bus = EventBus()
        vision = VisionPlugin(bus, camera_id=99)  # 故意用錯誤ID
        comm = CommPlugin(bus)
        motion = MotionPlugin(bus)

        comm.init()
        motion.init()

        arm_cmds = []
        bus.subscribe("motion.arm_command", lambda e: arm_cmds.append(e.data))

        # Motion 處理 ball_position 事件
        motion.on_event(Event(
            type="vision.ball_position",
            data={"x": 150, "y": 300, "confidence": 0.9}
        ))

        assert len(arm_cmds) == 1
        assert arm_cmds[0]["x"] == 100  # motion stub 的預設值

    def test_multiple_plugins_subscribe_same_event(self):
        """多個 Plugin 可同時訂閱同一事件"""
        bus = EventBus()

        count = [0]

        def counter(e):
            count[0] += 1

        bus.subscribe("motion.arm_command", counter)
        bus.subscribe("motion.arm_command", counter)

        # 直接發佈到 bus（繞過 CommPlugin，因為 CommPlugin 的
        # on_event 不會重新 publish）
        bus.publish("motion.arm_command", {})

        assert count[0] == 2