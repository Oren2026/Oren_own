# 黑輪負責專案總覽

> 更新時間：2026-05-05
> 範圍：FIRA、TDK、上銀撞球

---

## 三個比賽優先級

| 比賽 | 截止日期 | 優先級 | 備註 |
|------|---------|--------|------|
| 上銀撞球 | 2026-05-22 複審 | 🔴 緊急 | 5月底繳交複審影片 |
| FIRA | 2026-04 完成 | ✅ 佳作 | 已結束，供 ROS2 轉換參考 |
| TDK | 2026-11 初審 | 🟢 初期 | 機構設計階段 |

---

## 專案檔案路徑（快速對齊用）

### 上銀撞球 🔴

| 用途 | 路徑 |
|------|------|
| **程式碼** | `~/Desktop/Oren_own/hiwin_pool/`（branch: `hiwin_pool`） |
| **網站** | `~/Desktop/Oren_own/docs/CONTEST/上銀撞球/index.html` |
| **動態資料（網站用）** | `~/Desktop/Oren_own/docs/CONTEST/上銀撞球/status.json` |
| **展示網站** | `https://oren2026.github.io/Oren_own/docs/CONTEST/上銀撞球/` |
| **文件** | `~/Desktop/Oren_own/docs/CONTEST/上銀撞球/` |
| **知識庫** | `~/Desktop/Oren_own/knowledge/projects/上銀/status.md` |
| **採購文件** | `~/Desktop/Oren_own/docs/CONTEST/上銀撞球/04-採購清單/` |
| **Workflow 手冊** | `~/Desktop/Oren_own/docs/CONTEST/上銀撞球/WORKFLOW.md` |

### FIRA 🟡

| 用途 | 路徑 |
|------|------|
| **程式碼** | `~/Desktop/Oren_own/` |
| **網站** | `~/Desktop/Oren_own/docs/CONTEST/FIRA_2026/` |
| **動態資料（網站用）** | `~/Desktop/Oren_own/docs/CONTEST/FIRA_2026/status.json` |
| **知識庫** | `~/Desktop/Oren_own/knowledge/projects/FIRA/status.md` |

### TDK 🟢

| 用途 | 路徑 |
|------|------|
| **程式碼** | `~/Desktop/Oren_own/` |
| **網站** | `~/Desktop/Oren_own/docs/CONTEST/TDK_2026/index.html` |
| **動態資料（網站用）** | `~/Desktop/Oren_own/docs/CONTEST/TDK_2026/status.json` |
| **文件** | `~/Desktop/Oren_own/docs/CONTEST/TDK_2026/` |
| **知識庫** | `~/Desktop/Oren_own/knowledge/projects/TDK/status.md` |
| **系統架構** | `~/Desktop/Oren_own/docs/CONTEST/TDK_2026/02-系統架構/00_系統架構規劃.md` |

---

## 上銀撞球 🔴（詳細）

### 基本資訊

| 項目 | 值 |
|------|-----|
| 比賽 | 第十八屆上銀智慧機器手實作競賽 — 撞球組 |
| 比賽時間 | 2026-08（決賽） |
| 初審截止 | 2026-05-22（繳交複審影片） |
| 手臂 | HIWIN RA605-710-GC（六軸，主辦提供） |
| Repo | `~/Desktop/Oren_own/hiwin_pool/` |
| 版本 | v0.1.0 |

### 資料流

```
webcam → vision → strategy → motion → hiwin_arm / arduino
                          ↑
                    analysis（feedback learning）
```

### hiwin_pool/ 程式碼結構

```
hiwin_pool/
├── config/                  ← 參數設定（IP/COM/力道/校正）
│   ├── arm_config.py        # HIWIN IP/Port/Z限制
│   ├── strike_config.py     # 12段力道（0.25~3.0 m/s）
│   ├── camera_config.py     # Webcam ID/透視矩陣
│   └── calibration_data.py  # 擊球記錄/校正參數
├── interfaces/              ← I/O 介面標準（固定不動）
│   ├── vision_output.py     # 球偵測輸出
│   ├── strategy_output.py   # 擊球規劃輸出
│   ├── motion_command.py    # 手臂+機構指令
│   ├── shot_record.py       # 擊球記錄（JSON）
│   └── data_structures.py   # dataclass 結構
├── comm/                    ← 通訊（框架層）
│   ├── hiwin_arm.py        # TCP/IP 手臂控制
│   └── arduino_serial.py   # USB 序列擊球控制
├── motion/                  ← 運動執行（框架層）
│   ├── executor.py          # 復位時序
│   ├── strike.py            # 擊球序列
│   ├── trajectory.py        # 路徑規劃
│   └── safety.py            # 碰撞檢測
├── vision/                  ← 視覺系統
│   ├── ball_detector.py    # 球偵測（OpenCV）
│   ├── cue_align.py         # 桿頭對位
│   ├── table_transform.py   # 透視座標轉換
│   ├── homography_calibrator.py  # 校正工具
│   └── YOUR_VERSION/        # 同學自行替換實作
├── strategy/                ← 擊球策略
│   └── YOUR_VERSION/        # 同學自行替換實作
├── analysis/                ← 反饋學習
│   ├── shot_logger.py      # ✅ 擊球記錄（JSON）
│   ├── trajectory_model.py  # ✅ 物理軌跡模型
│   └── calibrator.py       # 🔶 校正框架
├── ui/                      ← GUI（待安裝測試）
│   ├── dashboard.py        # 儀表板
│   ├── tune_panel.py       # 參數調整
│   └── config_wizard.py    # 安裝精靈
├── main.py                  # 主程式入口
├── setup.py                 # 跨平台建環境
├── update.py               # git pull + 版本比對
└── requirements.txt
```

### 子專案完成度

| 子專案 | 完成度 | 備註 |
|--------|--------|------|
| ✅ Installer | 100% | setup.py 跨平台 |
| ✅ I/O 介面標準化 | 100% | dataclass + shot_record JSON |
| ✅ analysis/shot_logger | 100% | JSON 記錄 |
| ✅ analysis/trajectory_model | 100% | 物理模型 |
| 🔶 comm/hiwin_arm.py | ~70% | TCP skeleton，IP 待確認 |
| 🔶 comm/arduino_serial.py | ~70% | COM port 待確認 |
| 🔶 motion/strike.py | ~50% | 序列框架 |
| 🔶 motion/trajectory.py | ~60% | 路徑點計算 |
| 🔶 motion/safety.py | ~50% | 範圍檢查框架 |
| 🔶 vision/（全模組） | ~20-40% | 框架完成，演算法未實作 |
| 🔶 analysis/calibrator | ~50% | 校正邏輯框架 |
| 🔴 ui/ | ~20-40% | 待黑皮安裝測試 |
| ⚪ strategy/YOUR_VERSION/ | 0% | 預留同學實作 |
| 🔴 機構 | 待確認 | 步進馬達推動 + 舵機調水平角度 |

**圖例**：✅完成  🔶進行中  🔴待GUI測試  ⚪未啟動



---

## FIRA 🟡

### 基本資訊
- **現況**: 2026-04 參賽獲得佳作（已完成）
- **下一步**: 整理 ROS1 經驗，供未來 ROS2 轉換

### 檔案路徑
- 程式碼：`~/Desktop/Oren_own/`（含 TB3 與 FIRA 相關）
- 網站：`~/Desktop/Oren_own/docs/CONTEST/FIRA_2026/`
- status.json：`~/Desktop/Oren_own/docs/CONTEST/FIRA_2026/status.json`

---

## TDK 🟢

### 基本資訊
- **截止**: 2026-11 初審
- **參賽組別**: 遙控組
- **比賽主題**: 讓世界看見雲林
- **主控制器**: Raspberry Pi 5 8GB
- **四大關卡**: 成龍濕地救護、文蛤分級、稻草堆放、北港迎媽祖

### 檔案路徑
- 網站：`~/Desktop/Oren_own/docs/CONTEST/TDK_2026/`
- status.json：`~/Desktop/Oren_own/docs/CONTEST/TDK_2026/status.json`
- 系統架構：`~/Desktop/Oren_own/docs/CONTEST/TDK_2026/02-系統架構/00_系統架構規劃.md`
- 知識庫：`~/Desktop/Oren_own/knowledge/projects/TDK/status.md`

### 已採購硬體
- Arduino Mega 2560 × 1
- 擴充板 × 1、B0315 馬達驅動板 × 1、BTS7960 馬達驅動板 × 1
- 超音波感測器 HC-SR04 × 5

### 待採購
- 直流減速馬達（帶編碼器）× 4
- L298N 馬達驅動模組 × 2
- LiPo 電池 11.1V × 2、7.4V × 1
- 深度相機、鋁合金底盤、3D 列印線材

### 進度
- 機構設計：爪手框架確認（叉形，固定形狀）
- 控制系統：訊號定義、遙控器對頻待確認

---

## 跨專案模組地圖（黑輪維護）

用於識別哪些模組可以被挪用而不跑 context 髒亂度。

### comm/arduino_serial.py（上銀）
- **內容**：Arduino 序列通訊（pyserial）
- **TKD 可挪用性**：⚠️ TDK 用 Arduino Mega，但 protocol 不同（Arduino Mega vs 上銀的桿弟控制），建議重寫不做挪用
- **FIRA 可挪用性**：❌ FIRA 用 TB3，不涉及 Arduino

### analysis/ 模組（上銀）
- **內容**：trajectory_model（物理軌跡）、shot_logger（JSON 記錄）
- **TKD 可挪用性**：🟡 trajectory_model 可簡化挪用（物理模型概念通用）
- **FIRA 可挪用性**：❌ 比賽已結束

### vision/ 模組（上銀）
- **內容**：ball_detector、table_transform、homography_calibrator
- **TKD 可挪用性**：🟡 homography_calibrator 觀念可參考（透視變換通用）
- **FIRA 可挪用性**：❌ 比賽已結束

### setup.py / update.py（上銀）
- **內容**：跨平台建環境、版本管理
- **TKD 可挪用性**：✅ 完全可以，直接複製到 TDK 程式碼目錄使用

### config/ 結構（上銀）
- **內容**：分層參數管理（arm/strike/camera/calibration）
- **TKD 可挪用性**：✅ 架構模式可挪用，具體參數需重寫

### 結論
| 模組 | 建議 |
|------|------|
| setup.py / update.py | ✅ 直接挪用 TDK |
| config/ 架構 | ✅ 模式挪用 TDK |
| analysis/trajectory_model | 🟡 可簡化挪用 |
| comm/arduino_serial | ❌ 不挪用（protocol 不同） |
| vision/ | ❌ 不挪用（場景差異太大） |

---

## 最後更新
2026-04-30（黑輪：完整檔案路徑對齊、跨專案模組地圖、hiwin_pool 子專案狀態）
