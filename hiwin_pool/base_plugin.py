# base_plugin.py
"""Plugin 抽象類別 — 所有模組的共同介面"""

from abc import ABC, abstractmethod
from event_bus import EventBus
from typing import Optional


class BasePlugin(ABC):
    """
    所有 Plugin 的基底類別

    子類別必須實作：
      - name       — 插件名稱（唯一識別）
      - init()     — 初始化（如：連線、載入參數）
      - update()   — 主循環每次迭代要執行的邏輯
      - shutdown() — 結束時的清理（如：關閉連線）

    可選覆寫：
      - on_event() — 處理 EventBus 發來的事件
    """

    name: str = "base_plugin"

    def __init__(self, bus: Optional[EventBus] = None):
        """
        Args:
            bus: EventBus 實例。Plugin 透過 bus 與其他模組通訊。
                 如果傳 None，會在 register() 時由系統注入。
        """
        self.bus = bus
        self._running = False

    # ── 生命週期 ─────────────────────────────────────────────

    @abstractmethod
    def init(self) -> bool:
        """
        初始化插件

        Returns:
            bool: 初始化是否成功。False 表示插件無法正常啟動。
        """
        raise NotImplementedError

    @abstractmethod
    def update(self) -> None:
        """
        主循環每次迭代要執行的邏輯

        注意：這個 method 會在主循環中被頻繁呼叫。
              不要在這裡做 blocking I/O 或長時間運算。
        """
        raise NotImplementedError

    @abstractmethod
    def shutdown(self) -> None:
        """結束時的資源清理"""
        raise NotImplementedError

    # ── 事件處理（可選覆寫）────────────────────────────────

    def on_event(self, event) -> None:
        """
        處理 EventBus 發來的事件

        預設實作不做事。
        子類別可覆寫以訂閱感興趣的事件。
        """
        pass

    def register(self, bus: EventBus) -> None:
        """
        向 EventBus 註冊自己（由 main.py 呼叫）

        子類別可覆寫以訂閱特定事件。
        預設行為：向 bus 訂閱所有感興趣的 event。
        """
        self.bus = bus

    # ── 狀態查詢 ─────────────────────────────────────────────

    def start(self) -> None:
        """標記插件為運行中"""
        self._running = True

    def stop(self) -> None:
        """標記插件為停止"""
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running
