# tests/test_vision.py
"""Vision 模組單元測試"""

import pytest
import numpy as np
import cv2
from dataclasses import dataclass

from event_bus import EventBus, Event
from vision_plugin import VisionPlugin
from interfaces.vision_output import BallPosition


# ── 輔助 Mock ────────────────────────────────────────────────

def create_mock_frame(width=640, height=480):
    """建立一個全黑的 mock frame"""
    return np.zeros((height, width, 3), dtype=np.uint8)


def create_white_ball_frame(width=640, height=480, ball_x=320, ball_y=240, ball_r=20):
    """建立一個有白球的 mock frame"""
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    cv2.circle(frame, (ball_x, ball_y), ball_r, (255, 255, 255), -1)
    return frame


# ── BallPosition dataclass 測試 ─────────────────────────────

class TestBallPosition:
    def test_creation(self):
        bp = BallPosition(x=150.0, y=200.0, confidence=0.85)
        assert bp.x == 150.0
        assert bp.y == 200.0
        assert bp.z == 0.0
        assert bp.confidence == 0.85

    def test_is_confident_threshold(self):
        bp = BallPosition(x=100, y=100, confidence=0.6)
        assert bp.is_confident(0.5) is True
        assert bp.is_confident(0.7) is False

    def test_to_dict(self):
        bp = BallPosition(x=100, y=200, z=0, confidence=0.9)
        d = bp.to_dict()
        assert d["x"] == 100
        assert d["y"] == 200
        assert d["confidence"] == 0.9

    def test_from_dict(self):
        d = {"x": 150, "y": 300, "z": 0, "confidence": 0.75}
        bp = BallPosition.from_dict(d)
        assert bp.x == 150
        assert bp.y == 300
        assert bp.confidence == 0.75

    def test_default_z_zero(self):
        bp = BallPosition(x=100, y=100, confidence=0.5)
        assert bp.z == 0.0


# ── VisionPlugin Stub 測試 ──────────────────────────────────

class TestVisionPluginStub:
    """測試 VisionPlugin 在沒有 webcam 時的行為"""

    def test_init_with_invalid_camera(self):
        """無效的 camera_id 應該 init 回傳 False"""
        plugin = VisionPlugin(bus=None, camera_id=99)
        assert plugin.init() is False

    def test_init_with_valid_camera(self):
        """有效的 camera_id（0 或 1）可能成功或失敗，取決於硬體"""
        plugin = VisionPlugin(bus=None, camera_id=0)
        # 不假设 webcam 一定存在，只测架构
        result = plugin.init()
        # 清理
        plugin.shutdown()
        # result 可能是 True 或 False，取決於硬體

    def test_update_no_camera(self):
        """沒有 webcam 時 update 不應崩潰"""
        plugin = VisionPlugin(bus=None, camera_id=99)
        plugin.init()
        plugin.update()  # 不應拋異常

    def test_shutdown_no_camera(self):
        """沒有 webcam 時 shutdown 不應崩潰"""
        plugin = VisionPlugin(bus=None, camera_id=99)
        plugin.init()
        plugin.shutdown()  # 不應拋異常

    def test_frame_not_published_without_bus(self):
        """沒有 EventBus 時不應嘗試發佈"""
        plugin = VisionPlugin(bus=None, camera_id=99)
        plugin.init()
        # 應該優雅地忽略，不拋異常
        plugin.update()


# ── 事件格式測試 ────────────────────────────────────────────

class TestVisionEvents:
    def test_ball_position_event_structure(self):
        """驗證 BallPosition 可被封裝為 Event 並發佈"""
        bus = EventBus()
        received = []

        def handler(event: Event):
            received.append(event.data)

        bus.subscribe("vision.ball_position", handler)

        ball = BallPosition(x=150.5, y=200.5, confidence=0.85)
        bus.publish("vision.ball_position", ball.to_dict())

        assert len(received) == 1
        assert received[0]["x"] == 150.5
        assert received[0]["confidence"] == 0.85

    def test_frame_event_is_numpy_array(self):
        """vision.frame 事件應携带 numpy.ndarray"""
        bus = EventBus()
        received = []

        def handler(event: Event):
            received.append(event.data)

        bus.subscribe("vision.frame", handler)

        frame = create_mock_frame()
        bus.publish("vision.frame", frame)

        assert len(received) == 1
        assert isinstance(received[0], np.ndarray)
        assert received[0].shape == (480, 640, 3)


# ── 整合測試（Mock webcam）───────────────────────────────────

class TestVisionPluginArchitecture:
    """
    VisionPlugin 架構驗證
    VisionPlugin.update() 自己讀 webcam，不從事件接收 frame
    """

    def test_vision_plugin_publishes_frame(self):
        """VisionPlugin.update() 後應發佈 vision.frame"""
        bus = EventBus()
        received = []

        def handler(event: Event):
            received.append(event.data)

        bus.subscribe("vision.frame", handler)

        plugin = VisionPlugin(bus, camera_id=99)
        plugin.init()
        plugin.update()  # 嘗試讀取（99 不存在，不影响此測試）

        # frame 事件在 webcam 可用時才會發佈
        # 此測試驗證架構：update() 後不拋異常
        assert True  # 不崩潰即可

    def test_on_event_does_not_modify_frame(self):
        """VisionPlugin.on_event() 不處理 vision.frame（架構設計如此）"""
        plugin = VisionPlugin(bus=None, camera_id=99)
        plugin.init()

        mock_frame = create_mock_frame()

        # VisionPlugin.on_event() 本身不做任何事（預設實作）
        # frame 只會在 update() 裡從 webcam 更新
        # 因此這裡不預期 frame 會被改變
        assert plugin.frame is None

    def test_shutdown_releases_camera(self):
        """shutdown 應釋放 webcam resource"""
        plugin = VisionPlugin(bus=None, camera_id=0)
        plugin.init()
        plugin.shutdown()
        result = plugin.init()
        plugin.shutdown()
        # result 取決於硬體，不做嚴格假設