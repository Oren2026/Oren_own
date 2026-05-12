# event_bus.py
"""事件匯流排 — Plugin 之间通讯的唯一渠道"""

from typing import Callable, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Event:
    """事件载体"""
    type: str
    data: Any
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class EventBus:
    """
    Pub/Sub 事件匯流排

    使用方式：
        bus = EventBus()

        # 訂閱
        def on_ball_detected(event: Event):
            print(f"球位置: {event.data}")

        bus.subscribe("vision.ball_position", on_ball_detected)

        # 發佈
        bus.publish("vision.ball_position", {"x": 100, "y": 200})
    """

    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = {}

    # ── 訂閱 ─────────────────────────────────────────────────

    def subscribe(self, event_type: str, callback: Callable[[Event], None]):
        """
        訂閱事件

        Args:
            event_type: 事件類型（如 "vision.ball_position"）
            callback:    收到事件時的處理函式
        """
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    def unsubscribe(self, event_type: str, callback: Callable[[Event], None]):
        """取消訂閱"""
        if event_type in self._subscribers:
            self._subscribers[event_type].remove(callback)

    # ── 發佈 ─────────────────────────────────────────────────

    def publish(self, event_type: str, data: Any):
        """
        發佈事件

        Args:
            event_type: 事件類型
            data:       事件資料（任意型別，建議用 dataclass）
        """
        event = Event(type=event_type, data=data)
        if event_type in self._subscribers:
            for callback in self._subscribers[event_type]:
                try:
                    callback(event)
                except Exception as e:
                    print(f"[EventBus] 處理者 {callback.__name__} 發生錯誤: {e}")

    # ── 查詢 ─────────────────────────────────────────────────

    def subscriber_count(self, event_type: str) -> int:
        """查詢某事件有多少訂閱者"""
        return len(self._subscribers.get(event_type, []))

    def list_subscriptions(self) -> dict[str, int]:
        """列出所有訂閱（除錯用）"""
        return {etype: len(cbs) for etype, cbs in self._subscribers.items()}
