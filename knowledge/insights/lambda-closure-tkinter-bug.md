# Python Lambda 閉包陷阱 — tkinter 按鈕 loop

## 發生時間
2026-04-20

## 錯誤模式
在 Python 的 `for` 迴圈中建立多個 `lambda`，直接捕捉迴圈變數（如 `name`）：

```python
# 錯誤示範（所有按鈕都會用最後一個 name）
for label, name, cmd in btn_defs:
    runner = lambda: run_bg(name, cmd)  # name 是 reference，loop 跑完後是最後一個值
    btn = ttk.Button(..., command=runner)

# 另一種錯誤 — 看似綁定但仍有問題
for label, name, cmd in btn_defs:
    runner = lambda n=name, c=cmd: run_bg(n, c)  # 只有一行時可能ok，但複雜一點就出事
```

## 正確做法 — 工廠函式

```python
def make_btn(label, name, mode):
    """工廠函式：每個按鈕在建立時捕捉當下的值"""
    if mode == "bg":
        runner = lambda n=name, c=cmd: run_bg(n, c)
    elif mode == "terminal":
        runner = lambda: run_terminal(name, cmd)
    elif mode == "reset":
        runner = run_reset  # 直接參照函式，沒問題
    btn = ttk.Button(..., command=runner)
    btn.pack()
    btn_refs[name] = btn

for label, name, mode in btn_defs:
    make_btn(label, name, mode)
```

## 為什麼這樣有效
- 工廠函式在**每次呼叫時**建立新的 `runner` lambda
- `n=name, c=cmd` 這兩個參數在**函式建立時**被綁定（預設參數），不是執行時
- `run_reset` 直接取函式本體，完全沒有閉包捕捉

## 這個案例
launcher_gui.py 的 slam 按鈕 loop 本來有三個按鈕用 `name` 直接做 lambda closure，
結果所有按鈕都去執行最後一個 `tunnel` 的邏輯，D-pad 按鈕本身沒問題但整個 loop 的錯誤綁定導致預期外的行為。

## 預防
建立按鈕 loop 時，一律用工廠函式或明確函式，不要在 for 迴圈內直接建立 lambda。
