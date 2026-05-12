# ui/tune_panel.py
"""參數調整面板（開發/測試用）"""

from config.strike_config import FORCE_MIN, FORCE_MAX, linear_interpolate


class TunePanel:
    """參數調整面板（CLI 版本）"""

    def __init__(self):
        self.current_force = 0.5

    def select_force(self):
        """互動式力道選擇（0.0 ~ 1.0）"""
        print(f"\n輸入力道值 ({FORCE_MIN} ~ {FORCE_MAX}):")
        try:
            val = float(input("力道: ").strip())
            if FORCE_MIN <= val <= FORCE_MAX:
                self.current_force = val
                print(f"已選擇力道 {val:.2f}")
            else:
                print(f"無效（需為 {FORCE_MIN} ~ {FORCE_MAX}）")
        except ValueError:
            print("請輸入數字")

    def display_current(self):
        """顯示目前設定"""
        print(f"\n目前力道: {self.current_force:.2f}")
        params = linear_interpolate(self.current_force)
        print(f"  velocity:  {params['velocity']} m/s")
        print(f"  pullback:  {params['pullback']} mm")
        print(f"  hold_time: {params['hold_time']} s")

    def run(self):
        """執行調整面板"""
        while True:
            print("\n=== 參數調整面板 ===")
            print("1. 選擇力道 (0.0 ~ 1.0)")
            print("2. 顯示目前設定")
            print("3. 離開")

            choice = input("選擇: ")
            if choice == "1":
                self.select_force()
            elif choice == "2":
                self.display_current()
            elif choice == "3":
                break
            else:
                print("無效選擇")