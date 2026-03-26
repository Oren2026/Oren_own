# TB3 2026 - FIRA AutoRace 機器人

> TurtleBot 3 Burger × ROS × OpenCV
> 任務狀態機系統

## 🌐 網頁版本

**本專案有可互動的網頁版本：**

- 📍 **網頁版**：https://Oren2026.github.io/Oren_own/docs/TB3_2026/
- 📂 **GitHub**：https://github.com/Oren2026/Oren_own/tree/main/docs/TB3_2026

---

## 📁 資料夾結構

```
TB3_2026/
├── README.md（本檔案）
├── index.html              ← 網頁儀表板
├── assets/                ← CSS/JS（共用語式）
├── 01-研究資料/           ← 比賽規則、研究文件
├── 02-系統架構/           ← 技術架構設計
├── 03-採購清單/           ← 材料採購（若有）
└── 04-技術文檔/           ← 技術文件、開發日誌
```

---

## 🤖 任務關卡（從賽道圖分析）

| 任務 | 說明 | 對應賽道區域 |
|------|------|-------------|
| 車道置中 | 維持車子在車道中央行駛 | 全域基礎 |
| 交通號誌 | 紅燈停、綠燈行 | 起點左側三色號誌 |
| 圓環/交叉路口 | 藍色箭頭標誌決策出口 | 中央環狀區域 |
| 障礙物/減速區 | 青藍色橫向標記觸發減速 | 左下角減速帶 |
| 停車 | 白色虛線車格 + P 標誌 | 底部停車區 |
| 平交道柵欄 | 紅白條紋偵測，確認柵欄升起 | 右下角柵欄區 |
| S 彎道 | 連續變向考驗 PID 穩定性 | 右側連續彎道 |
| 隧道/暗區 | 低光源，切換 LiDAR 里程計 | 右上方黑色區域 |

---

## ⚙️ 系統架構

### 核心控制流程

```
core_node_controller
  ├── roslaunch 動態啟閉各 detect_* 節點
  ├── 訂閱 /mission（狀態報告）
  └── 核心協調層（core_node_mission）— 規劃中
```

### 節點結構

```
TB3_AutoRace/
├── core/
│   ├── core_node_controller.py   ← 主控制器（roslaunch調度）
│   └── nodes/
│
├── detect/                       ← 各偵測節點（獨立運作）
│   ├── detect_traffic_light.py   ✅ 已完成
│   ├── detect_intersection.py    🚧 框架完成
│   ├── detect_construction.py    🚧 框架完成
│   ├── detect_parking.py         🚧 框架完成
│   ├── detect_level.py           🚧 框架完成
│   └── detect_tunnel.py          🚧 框架完成
│
├── control/
│   └── core_node_mission.py      🚧 規劃中
│
└── lane/                         ← PID 循線基底
---

## 📍 當前進度

- [x] 建立專案資料夾架構
- [x] 研究 FIRA AutoRace 官方規則（賽道圖分析）
- [x] `detect_traffic_light` 節點開發完成
- [x] `core_node_controller` 骨架建立
- [x] `detect_*` 節點框架結構確認
- [ ] `core_node_mission` 協調層（規劃中）
- [ ] `detect_intersection` 完成
- [ ] `detect_construction` 完成
- [ ] `detect_parking` 完成
- [ ] `detect_level` 完成
- [ ] `detect_tunnel` 完成
- [ ] 任務堆疊整合測試
- [ ] 完整流程測試

---

## 🔗 相關連結

- [FIRA AutoRace 官網](http://www.fira.net/)
- [TurtleBot 3 官網](https://www.turtlebot.com/)
- [ROS 官網](https://www.ros.org/)

---

*最後更新：2026-03-26 by Oren*
