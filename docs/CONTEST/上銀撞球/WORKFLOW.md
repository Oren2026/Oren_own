# 上銀撞球 — 測試流程手冊

> 本文件定義每次測試前應依序執行的檢查流程，確保各模組正常後再進行整合測試。
> 每次進實驗室之前建議從頭跑一遍，發現問題當場處理。

---

## 環境與前提

### 必要條件
- Python 3.8+
- 已安裝依賴：`pip install -r requirements.txt`
- 網路：Mac mini 與 HIWIN 手臂在同一網段（對應 IP 設定）
- USB：Arduino 連接 Mac mini
- Webcam：俯瞰視角已固定

### 確認工作目錄
```bash
cd ~/Desktop/Oren_own/hiwin_pool
```

---

## Phase 0 — 系統環境確認

### 0.1 Python 環境
```bash
python3 --version        # 確認 Python 版本
pip install -r requirements.txt  # 安裝依賴（如有更動）
```

### 0.2 IP 設定確認
```bash
# 確認 Mac mini 網段與手臂相同
ifconfig | grep "192.168"

# 測試手臂是否能 ping 到
ping -c 1 192.168.1.100
```

### 0.3 Arduino COM Port 確認
```bash
# macOS
ls /dev/cu.*

# 找到類似 /dev/cu.usbmodem14101 的裝置
# 記下這個路徑，更新 config/strike_config.py 的 ARDUINO_COM
```

### 0.4 Webcam 確認
```bash
# 確認 webcam ID（0 或 1）
python3 -c "import cv2; cap=cv2.VideoCapture(0); print('CAM0 OK' if cap.isOpened() else 'FAIL'); cap.release()"
```

---

## Phase 1 — Webcam 影像確認（OpenCV）

### 目標：確認 webcam 視角正確、影像品質可用

### 執行
```bash
python3 vision/ball_test_tool.py
```

### 觀察重點
- [ ] 影像是否流暢（無明顯延遲）
- [ ] 球檯是否完整出現在畫面中（四個角落都在）
- [ ] 光源是否穩定（無明顯反光或陰影飄動）
- [ ] 白球是否為畫面中最大面積的白色物件

### 判斷標準
| 狀況 | 原因 | 處理 |
|------|------|------|
| 看不到球檯 | webcam 視角歪斜 | 重新調整 webcam 位置 |
| 反光嚴重 | 光源直射球檯 | 調整光源角度或加柔光布 |
| 白球不明顯 | HSV 閾值不合 | Phase 2 調整 BALL_COLOR |

---

## Phase 2 — Homography 校正

### 目標：建立像素座標 → 球檯 mm 座標 的轉換矩陣

### 前置條件
- Phase 1 確認完成（ webcam 視角固定不動）

### 執行
```bash
python3 vision/homography_calibrator.py
```

### 操作流程
1. 選擇模式：
   - **`1`** → Marker 模式（鏡頭沒動過，直接用球檯已知尺寸）
   - **`2`** → Manual 模式（鏡頭有移動，需重新量測 mm 座標）
2. 依序點擊球檯四個角落（**左上 → 右上 → 右下 → 左下**）
3. Marker 模式：自動計算，結束
4. Manual 模式：依序輸入各點的世界座標（mm）

### 驗證
校正完成後，回到 Phase 1 的 `ball_test_tool.py`，按 **`[g]`** 開啟網格：
- [ ] 網格線是否與球檯邊線重疊
- [ ] 格線是否為直線（不應有明顯扭曲）
- [ ] 球檯四個角是否與邊線對齊

### 誤差判斷
- 最大重投影誤差 > 10mm → 重新校正
- 誤差稍大但穩定 → 記錄在案，持續觀察

### 注意
每次移動 webcam 後都必須重新執行此步驟。

---

## Phase 3 — 白球偵測參數調整

### 目標：確認 HSV 閾值和面積閾值能正確辨識白球

### 執行
```bash
python3 vision/ball_test_tool.py
```

### 觀察重點
- [ ] 白球是否被偵測到（有黃色十字標記）
- [ ] 桌面座標 `(TABLE: X, Y mm)` 是否合理（在球檯範圍內：1200×630mm）
- [ ] 是否誤偵測到數字白斑（數字白斑應被 BALL_MIN_AREA 過濾）

### 調整參數
如發現問題，修改 `config/camera_config.py`：

```python
# HSV 閾值（白球：低彩度、高亮度）
BALL_COLOR_LOWER = {"h": 0, "s": 0, "v": 180}   # 提高 V 下限
BALL_COLOR_UPPER = {"h": 180, "s": 60, "v": 255}

# 面積閾值（像素²）
BALL_MIN_AREA = 200   # 如數字白斑漏過，提高此值
```

調整後重新執行 `ball_test_tool.py` 驗證。

### 面積參考
- 白球直徑 ≈ 50mm
- 在 640×480  webcam 視角下 ≈ 30-50 像素半徑
- 白球輪廓面積 ≈ 2500-8000 像素²
- 數字白斑面積通常 < 500 像素²

---

## Phase 4 — 手臂通訊確認

### 目標：確認 TCP/IP 連線正常、HRL 指令能驅動手臂

### 前置條件
- 手臂已開機、網路正常
- 手臂處於手動模式（允許遠端控制）

### 4.1 連線測試
```bash
# 終端機手動測試
nc -v 192.168.1.100 5000
```

### 4.2 執行連線測試腳本
```bash
python3 -c "
from comm.hiwin_arm import HIWINArm
arm = HIWINArm()
ok = arm.connect()
print('手臂連線:', '成功' if ok else '失敗')
if ok:
    arm.disconnect()
"
```

### 4.3 讀取位置測試
```bash
python3 -c "
from comm.hiwin_arm import HIWINArm
arm = HIWINArm()
arm.connect()
pos = arm.get_position()
print('位置:', pos)
arm.disconnect()
"
```

### 觀察重點
- [ ] TCP 連線是否成功
- [ ] `get_position()` 是否回傳合理的 XYZ 座標
- [ ] 手臂是否在安全範圍內（Z > 50mm）

### 緊急停止
如手臂失控，**立即按下手持終端上的緊急開關**。

---

## Phase 5 — Arduino / 桿弟機構確認

### 目標：確認 Arduino 序列通訊正常、馬達復位一致

### 前置條件
- Arduino 已供電（USB 連接 Mac mini）
- 馬達電源已開
- 確認 COM Port：`config/strike_config.py` 的 `ARDUINO_COM`

### 5.1 確認 COM Port
```bash
# 插入 Arduino 前
ls /dev/cu.*

# 插入 Arduino 後
ls /dev/cu.* | grep usbmodem
```

更新 `config/strike_config.py`：
```python
ARDUINO_COM = "/dev/cu.usbmodem14101"  # 替換為實際路徑
```

### 5.2 序列通訊測試
```bash
python3 -c "
from comm.arduino_serial import ArduinoController
ard = ArduinoController()
ok = ard.connect()
print('Arduino 連線:', '成功' if ok else '失敗')
if ok:
    st = ard.read_status()
    print('狀態:', st)
    ard.disconnect()
"
```

### 5.3 復位測試（關鍵）
```bash
python3 -c "
from comm.arduino_serial import ArduinoController
ard = ArduinoController()
ard.connect()
# 執行 3 次復位，觀察每次是否一致完成
for i in range(3):
    r = ard.reset()
    print(f'第{i+1}次復位:', '成功' if r['complete'] else f'失敗: {r[\"error\"]}')
    import time; time.sleep(1)
ard.disconnect()
"
```

### 觀察重點
- [ ] 3 次復位是否都成功完成
- [ ] 復位時間是否穩定（一致性是重點）
- [ ] 馬達是否有異常聲音

### 如復位不一致
- 檢查馬達供電是否足夠
- 檢查桿弟機構是否有機械干涉
- 確認 `reset()` 的輪詢超時設定（`config/strike_config.py`）

---

## Phase 6 — 完整整合測試（手臂 + 視覺）

### 目標：驗證「視覺偵測球 → 手臂移動到球上方」的完整流程

### 前置條件
- Phase 2（Homography 校正）完成
- Phase 3（白球偵測）確認正常
- Phase 4（手臂連線）確認正常
- Phase 5（Arduino 復位）確認正常

### 執行
```bash
python3 test_arm_to_ball.py
```

### 操作
- **`[空白鍵]`** — 偵測球位置 → 手臂移到球上方（Z固定200mm）
- **`[r]`** — 復位 Arduino
- **`[q]`** — 結束

### 觀察重點
- [ ] 球偵測座標是否穩定（連續兩幀差不過大）
- [ ] 手臂是否移動到正確位置（上方俯視圖驗證）
- [ ] Z軸是否維持在 SAFE_Z=200mm（不應下降）
- [ ] 移動結束後終端機顯示 `Result: OK`

### 驗證手臂位置
手臂移動到球上方後，終端機會顯示：
```
ARM → (Bx, By, 200)mm
Result: OK
```
此時應確認手臂確實在球正上方（從 webcam 影像觀察）。

### 移動邏輯說明
```
1. PTP 到 (Bx, By, 300mm)  ← 先上升到安全高度
2. LIN 到 (Bx, By, 200mm)  ← Z軸下降至懸停高度
```
Z軸先升後降是為了避免手臂攜帶桿弟機構擦到球檯。

---

## Phase 7 — UI 面板確認（tune_panel）

### 目標：確認力道選擇 UI 能正確操作

### 執行
```bash
python3 -c "from ui.tune_panel import TunePanel; print('UI 模組 OK')"
```

### 確認項目
- [ ] 12 段力道都能選擇
- [ ] Arduino reset 按鈕正常
- [ ] 選單不會卡住

---

## 快速疑難排解

| 問題 | 檢查順序 |
|------|----------|
| Webcam 無影像 | 確認 CAM_GLOBAL 是否正確（0 或 1） |
| 手臂連線失敗 | 確認 IP/Port 正確、手臂已開機 |
| Arduino 無法連線 | 確認 COM Port 正確 |
| 球偵測不到 | 調整 HSV 閾值或 BALL_MIN_AREA |
| Homography 誤差大 | 確認4點點擊位置準確、光線穩定 |
| 手臂不動 | 確認處於遠端控制模式、非緊急停止 |
| 復位不一致 | 檢查馬達供電、機械干涉 |

---

## 每次測試前的最短流程

如果時間有限，至少跑以下步驟：

```
Phase 1  →  python3 vision/ball_test_tool.py（確認 webcam 正常）
Phase 2  →  python3 vision/homography_calibrator.py（如有移動 webcam）
Phase 6  →  python3 test_arm_to_ball.py（完整整合測試）
```

---

## 參數速查

| 參數 | 檔案 | 預設值 |
|------|------|--------|
| 手臂 IP | `config/arm_config.py` | 192.168.1.100 |
| 手臂 Port | `config/arm_config.py` | 5000 |
| Arduino COM | `config/strike_config.py` | COM3（需確認） |
| 安全高度 Z | `config/arm_config.py` | SAFE_Z_HEIGHT = 200mm |
| Z 軟限制 | `config/arm_config.py` | Z_MIN = 50mm, Z_MAX = 300mm |
| Webcam ID | `config/camera_config.py` | CAM_GLOBAL = 0 |
| 白球面積閾值 | `config/camera_config.py` | BALL_MIN_AREA = 200 px² |
| 力道段數 | `config/strike_config.py` | 1-12（共12段） |
| 球檯尺寸 | `config/camera_config.py` | 1200 × 630mm |
