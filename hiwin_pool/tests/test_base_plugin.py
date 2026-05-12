# tests/test_base_plugin.py
"""BasePlugin 單元測試"""

import pytest
from base_plugin import BasePlugin
from event_bus import EventBus, Event


class ConcretePlugin(BasePlugin):
    """實作抽象方法的測試用子類"""

    name = "test_plugin"

    def init(self) -> bool:
        self._init_called = True
        return True

    def update(self) -> None:
        self._update_count = getattr(self, "_update_count", 0) + 1

    def shutdown(self) -> None:
        self._shutdown_called = True


class TestBasePlugin:
    def test_init_and_shutdown(self):
        plugin = ConcretePlugin()
        assert plugin.init() is True
        assert plugin._init_called is True
        plugin.shutdown()
        assert plugin._shutdown_called is True

    def test_start_stop(self):
        plugin = ConcretePlugin()
        assert plugin.is_running is False
        plugin.start()
        assert plugin.is_running is True
        plugin.stop()
        assert plugin.is_running is False

    def test_update_counter(self):
        plugin = ConcretePlugin()
        plugin.init()
        plugin.update()
        plugin.update()
        plugin.update()
        assert plugin._update_count == 3

    def test_register_sets_bus(self):
        bus = EventBus()
        plugin = ConcretePlugin()
        assert plugin.bus is None
        plugin.register(bus)
        assert plugin.bus is bus

    def test_on_event_default_does_nothing(self):
        """預設 on_event 不應拋出異常"""
        plugin = ConcretePlugin()
        plugin.init()
        plugin.on_event(Event(type="any", data="any"))  # 不應拋異常


class TestPluginRegistration:
    """測試 Plugin 向 EventBus 註冊的行為"""

    def test_plugin_can_subscribe_to_bus(self):
        bus = EventBus()
        plugin = ConcretePlugin(bus)
        received = []

        def handler(e):
            received.append(e.data)

        bus.subscribe("test.event", handler)
        plugin.register(bus)

        bus.publish("test.event", "value")
        assert received == ["value"]
