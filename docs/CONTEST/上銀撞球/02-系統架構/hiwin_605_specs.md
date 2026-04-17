# HIWIN 605-710 關節式機械手臂 規格書

> 蒐集日期：2026-04-14
> 機器人型號：HIWIN 605-710 (HH100 系列)
> 用途：上銀智慧機器手實作競賽 - 撞球任務

---

## 1. 機器人型號確認

根據搜尋結果，**605-710** 為 HIWIN **HH100 系列**機械手臂的型號之一。

- **完整型號**：HIWIN HH100 (或稱 605-710)
- **類型**：6軸關節式機械手臂 (6-DOF Articulated Robot Arm)
- **定位**： compact and agile 6-axis jointed-arm robot for precise assembly, part transfer and workpiece loading/unloading

---

## 2. 馬達/關節規格

| 關節軸 | 馬達類型 | 備註 |
|--------|----------|------|
| J1 (Base旋轉) | AC Servo Motor | - |
| J2 (肩部俯仰) | AC Servo Motor | - |
| J3 (肘部) | AC Servo Motor | - |
| J4 (手腕俯仰) | AC Servo Motor | - |
| J5 (手腕翻轉) | AC Servo Motor | - |
| J6 (末端旋轉) | AC Servo Motor | - |

> **注意**：實際規格需以 HIWIN 官方型錄為準。605-710 可能為客製化或特定競賽用配置。

---

## 3. 法蘭盤規格 (Flange Dimensions)

### 末端法蘭 (End-Effector Flange)

根據取得的 HIWIN 工業機器人 PDF 資料 (來源: hiwinmectrol.com)：

- **法蘭直徑**：標準 80mm 或 100mm 等級 (需確認準確尺寸)
- **安裝孔距 (PCD)**：需查閱官方型錄
- **螺絲孔數量**：通常為 4 孔或 6 孔
- **螺絲規格**：M6 或 UNC 1/4 等

### 建議獲取方式

1. **下載官方型錄 PDF**：
   - https://hiwinmectrol.com/uploads/2356/product/file_5f6a4fb357103.pdf
   - (此為 HH100 系列工業機器手臂 PDF 文件)

2. **聯繫 HIWIN 技術支援**取得精確法蘭圖面

---

## 4. 控制介面 (Control Interface)

根據 HIWIN 工業機器人標準配置：

### 通訊介面
| 介面類型 | 支援狀態 |
|----------|----------|
| Ethernet (TCP/IP) | 支援 |
| RS-232/RS-485 | 支援 |
| Modbus RTU/TCP | 可能支援 |
| EtherCAT | 高端控制器支援 |

### 控制箱 (Controller)
- **控制器型號**：HIWIN 自有控制器 或 相容控制器
- **運動控制**：位置控制、速度控制、力控制 (可能)
- **I/O 擴展**：數位輸入/輸出 擴展埠

### 軟體/SDK
- **程式語言支援**：C、C++、Python (可能需要額外SDK)
- **示教器**：HIWIN 專用示教盒 (Teach Pendant)
- **离线编程软件**：可能提供 (需確認)

---

## 5. 工作範圍與負載

| 參數 | 數值 (預估) |
|------|-------------|
| 最大工作半徑 | ~700-1000 mm (605-710 型號) |
| 負載能力 | 3-10 kg 等級 |
| 重複精度 | ±0.01 - ±0.05 mm |
| 重量 | ~50-80 kg |

> **警告**：以上數值為根據 HH100 系列預估，實際規格請以官方型錄為準。

---

## 6. 撞球應用相關建議

### TCP (Tool Center Point) 設定
- 撞球桿夾爪的 TCP 需設定在夾爪中心
- 建議使用 3 點校正法進行 TCP 標定

### 夾爪法蘭匹配
- 確認夾爪法蘭與機械手臂末端的螺絲孔位匹配
- 常見法蘭規格：ISO 9409-1 或 同等規格

### 運動軌跡規劃
- 使用直線運動 (Linear interpolation) 進行撞球桿移動
- 避免在撞球動作中產生過大慣性

---

## 7. 參考資源

### 官方網站
- **HIWIN 台灣**：https://www.hiwin.com.tw
- **HIWIN 全球**：https://www.hiwin.com
- **產品頁面**：搜尋 "6DOF robot" 或 "HH100"

### 型錄下載
- **PDF 檔案** (已嘗試下載)：https://hiwinmectrol.com/uploads/2356/product/file_5f6a4fb357103.pdf

### 競賽相關
- **上銀智慧機器手實作競賽**：確認主辦單位提供的機械手臂型號與文件
- 605-710 可能為競賽特定型號，需向主辦單位索取詳細規格

---

## 8. 待確認事項

以下資訊需要進一步確認：

1. **法蘭精確尺寸**：直徑、螺絲孔位置、螺絲規格
2. **控制SDK**：是否提供 Python/C++ SDK
3. **通訊協定**：TCP/IP 控制命令格式
4. **夾爪相容性**：法蘭螺絲孔規格是否與標準夾爪匹配
5. **運動範圍**：各軸角度限制
6. **CAD 模型**：是否有可下載的 3D 模型

### 建議行動

1. 向 HIWIN 台灣業務/技術支援索取 605-710 完整規格書
2. 聯繫 上銀智慧機器手實作競賽 主辦單位取得機器手臂詳細文件
3. 下載並分析 PDF 型錄：https://hiwinmectrol.com/uploads/2356/product/file_5f6a4fb357103.pdf

---

*本文件由網路搜尋與分析整理，規格資訊可能與實際產品有出入，請以官方文件為準。*
