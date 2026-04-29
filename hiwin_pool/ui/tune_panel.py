# ui/tune_panel.py
"""參數調整面板（開發/測試用）"""

from config.strike_config import FORCE_LEVELS


class TunePanel:
    """參數調整面板（CLI 版本）"""

    def __init__(self):
        self.current_force = 3
        self.current_settings = FORCE_LEVELS.copy()

    def select_force_level(self):
        """互動式力道段選擇"""
        print("\n選擇力道段 (1-12):")
        for i in range(1, 13):
            params = FORCE_LEVELS[i]
            print(f"  {i:2d}: velocity={params['velocity']} m/s, pullback={params['pullback']} mm")

        try:
            choice = int(input("選擇: "))
            if 1 <= choice <= 12:
                self.current_force = choice
                print(f"已選擇力道段 {choice}")
            else:
                print("無效選擇（需為 1-12）")
        except ValueError:
            print("請輸入數字")

    def display_current(self):
        """顯示目前設定"""
        print(f"\n目前力道段: {self.current_force}")
        params = FORCE_LEVELS[self.current_force]
        print(f"  velocity: {params['velocity']} m/s")
        print(f"  pullback: {params['pullback']} mm")
        print(f"  hold_time: {params['hold_time']} s")

    def run(self):
        """執行調整面板"""
        while True:
            print("\n=== 參數調整面板 ===")
            print("1. 選擇力道段")
            print("2. 顯示目前設定")
            print("3. 離開")
            
            choice = input("選擇: ")
            if choice == "1":
                self.select_force_level()
            elif choice == "2":
                self.display_current()
            elif choice == "3":
                break
            else:
                print("無效選擇")
