# 上銀撞球比賽

## 基本資訊
- **比賽時間**: 2026-08（決賽）
- **初審截止**: 2026-05-22（繳交複審影片）
- **使用**: HIWIN RA605-710-GC 六軸手臂
- **Repo**: `~/Desktop/Oren_own/hiwin_pool/`（branch: `hiwin_pool`）
- **展示網站**: `https://oren2026.github.io/Oren_own/docs/CONTEST/上銀撞球/`

## 比賽內容
- 第十八屆上銀智慧機器手實作競賽 — 撞球組
- 主辦單位提供手臂，參賽者需自行設計末端機構
- 撞球組決賽名額 8 隊，小組賽分 A/B 組前两名晉級四強

## 獎項獎金
- 冠軍 10 萬、亞軍 8 萬、季軍 6 萬×2隊、評審特別獎 2 萬
- 外島補助最高 15,000 元

## 控制系統架構

```
webcam → vision → strategy → motion → hiwin_arm / arduino
                          ↑
                    analysis（feedback learning）
```

## 手臂通訊
- **Modbus TCP**（Ethernet）：IP `192.168.1.100:5000`（⚠️ 待確認）
- **Arduino**：COM port 待確認

## 撞擊力道方案（待確認）
- 純手臂撞擊（最簡）
- 彈簧蓄能（複雜）
- 舵機拉桿（中等）

## 機構方向
- **方向**：半齒齒輪 + 直流/伺服馬達 + 齒輪傳動
- **桿弟機構**：半齒齒輪脫離設計，撞擊瞬間動力中斷靠慣性前進
- **復位方式**：馬達反轉自動復位

## 程式碼
- `~/Desktop/Oren_own/hiwin_pool/`（Python）
- v0.1.0

## 軟體優先順序
1. Modbus TCP + 基本指令（PTP/LIN）— comm 骨架 ~70%
2. 手臂到位偵測
3. PR 位置暫存器
4. 撞擊機構控制（等機構確認）
5. 視覺系統（OpenCV）— 最後階段
6. Strategy（YOUR_VERSION/）— 預留同學實作

## 待確認
- [ ] 撞擊力道方案取捨
- [ ] 手臂 IP 確認
- [ ] Arduino COM port 確認
- [ ] 桿弟馬達選型

## 最後更新
2026-04-30（黑輪：與黑輪_OVERVIEW.md 同步、加入機構方向與獎項資訊）
