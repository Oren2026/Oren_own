# HIWIN Pool Robot

上銀撞球機器手臂專案——影像辨識 + 擊球策略 + 手臂控制。

## 快速開始

```bash
# 安裝依賴
pip install -r requirements.txt

# 環境設定（第一次）
python setup.py

# 啟動設定精靈
python ui/config_wizard.py

# 更新
python update.py
```

## 目錄結構

```
hiwin_pool/
├── interfaces/        # I/O 介面標準（訊號從哪進、從哪出）
├── vision/            # 影像辨識
├── strategy/          # 擊球策略（YOUR_VERSION/ 預留自定義區）
├── motion/            # 運動執行（自動復位時序）
├── comm/             # 通訊（HIWIN 手臂 / Arduino）
├── config/           # 設定檔
├── ui/               # GUI
├── analysis/         # 擊球分析與軌跡模型
└── tests/            # 測試
```

## 訊號流向

```
webcam → vision → strategy → motion → hiwin_arm / arduino
```

詳見 [docs/CONTEST/上銀撞球/workflow.html](docs/CONTEST/上銀撞球/workflow.html)

## 主要腳本

- `ui/config_wizard.py` — 環境設定精靈
- `vision/ball_test_tool.py` — 球偵測驗證工具
- `test_arm_to_ball.py` — 整合測試（球偵測→手臂移動）
