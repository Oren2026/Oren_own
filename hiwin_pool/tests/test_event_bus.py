# tests/test_event_bus.py
"""EventBus 單元測試"""

import pytest
from event_bus import EventBus, Event
from datetime import datetime


class TestEvent:
    def test_event_creation(self):
        e = Event(type="test.type", data={"key": "value"})
        assert e.type == "test.type"
        assert e.data == {"key": "value"}
        assert e.timestamp is not None
        assert isinstance(e.timestamp, datetime)

    def test_event_timestamp_auto(self):
        """時間戳應該自動產生"""
        e1 = Event(type="a", data=1)
        e2 = Event(type="b", data=2)
        assert e1.timestamp <= e2.timestamp


class TestEventBus:
    def test_publish_subscribe(self):
        bus = EventBus()
        received = []

        def handler(event):
            received.append(event.data)

        bus.subscribe("test.event", handler)
        bus.publish("test.event", "hello")

        assert received == ["hello"]

    def test_multiple_handlers(self):
        bus = EventBus()
        r1, r2 = [], []

        bus.subscribe("test", lambda e: r1.append(e.data))
        bus.subscribe("test", lambda e: r2.append(e.data))

        bus.publish("test", "msg")

        assert r1 == ["msg"]
        assert r2 == ["msg"]

    def test_unsubscribe(self):
        bus = EventBus()
        received = []

        def handler(event):
            received.append(event.data)

        bus.subscribe("test", handler)
        bus.unsubscribe("test", handler)
        bus.publish("test", "should not receive")

        assert received == []

    def test_subscriber_count(self):
        bus = EventBus()

        def h1(e): pass
        def h2(e): pass

        assert bus.subscriber_count("test") == 0
        bus.subscribe("test", h1)
        assert bus.subscriber_count("test") == 1
        bus.subscribe("test", h2)
        assert bus.subscriber_count("test") == 2
        bus.unsubscribe("test", h1)
        assert bus.subscriber_count("test") == 1

    def test_list_subscriptions(self):
        bus = EventBus()

        def h(e): pass

        bus.subscribe("a", h)
        bus.subscribe("b", h)
        bus.subscribe("b", h)

        subs = bus.list_subscriptions()
        assert subs["a"] == 1
        assert subs["b"] == 2

    def test_handler_exception_does_not_crash_bus(self):
        """ handler 發生錯誤時，EventBus 不應崩潰 """
        bus = EventBus()

        def bad_handler(event):
            raise RuntimeError("handler error")

        bus.subscribe("test", bad_handler)
        # 不應拋出異常
        bus.publish("test", "data")
        bus.publish("test", "more_data")  # 仍能繼續處理

    def test_no_subscription_no_error(self):
        """發佈到沒有訂閱者的事件不應報錯"""
        bus = EventBus()
        bus.publish("nonexistent", "data")  # 不應拋出異常
