const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "ROS2swarm 介紹與應用";
pres.author = "黑皮";

const C = {
  primary: "0D4F8B",
  secondary: "1A7FC1",
  accent: "F4A261",
  light: "E8F4FC",
  dark: "0A2342",
  white: "FFFFFF",
  gray: "64748B",
  lightGray: "F1F5F9",
};

// ===== Slide 1: 封面 =====
let slide1 = pres.addSlide();
slide1.background = { color: C.dark };
slide1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.accent } });
slide1.addText("ROS2swarm", {
  x: 0.5, y: 1.4, w: 9, h: 1.0,
  fontSize: 54, fontFace: "Arial Black", color: C.white, bold: true, align: "center", margin: 0
});
slide1.addText("用於群體機器人行為的 ROS 2 軟體包", {
  x: 0.5, y: 2.5, w: 9, h: 0.6,
  fontSize: 22, fontFace: "Arial", color: C.accent, align: "center", margin: 0
});
slide1.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 3.3, w: 3, h: 0.03, fill: { color: C.secondary } });
slide1.addText("Tanja Katharina Kaiser 等", {
  x: 0.5, y: 3.6, w: 9, h: 0.4,
  fontSize: 14, fontFace: "Arial", color: C.white, align: "center"
});
slide1.addText("德國呂貝克大學", {
  x: 0.5, y: 3.95, w: 9, h: 0.35,
  fontSize: 12, fontFace: "Arial", color: C.gray, align: "center"
});
slide1.addText("arXiv:2405.02438v1  •  2024年5月", {
  x: 0.5, y: 4.3, w: 9, h: 0.35,
  fontSize: 11, fontFace: "Arial", color: C.gray, align: "center"
});
slide1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.1, w: 10, h: 0.525, fill: { color: C.secondary, transparency: 30 } });
slide1.addText("Swarm Robotics  •  ROS 2  •  去中心化架構", {
  x: 0.5, y: 5.18, w: 9, h: 0.4,
  fontSize: 12, fontFace: "Arial", color: C.white, align: "center"
});

// ===== Slide 2: 什麼是叢集機器人 =====
let slide2 = pres.addSlide();
slide2.background = { color: C.lightGray };
slide2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 3.8, h: 5.625, fill: { color: C.dark } });
slide2.addText("Swarm", {
  x: 0.3, y: 1.2, w: 3.2, h: 0.7,
  fontSize: 36, fontFace: "Arial Black", color: C.white, bold: true, margin: 0
});
slide2.addText("Robotics", {
  x: 0.3, y: 1.85, w: 3.2, h: 0.7,
  fontSize: 36, fontFace: "Arial Black", color: C.accent, bold: true, margin: 0
});
slide2.addText("叢集機器人學", {
  x: 0.3, y: 2.6, w: 3.2, h: 0.45,
  fontSize: 14, fontFace: "Arial", color: C.white, margin: 0
});

const concepts = [
  { title: "去中心化", desc: "沒有中央控制節點，每個機器人自主決策" },
  { title: "簡單規則", desc: "單一機器人行為簡單，依賴協作產生複雜行為" },
  { title: "湧現行為", desc: "大量個體互動後，產生預期外的整體行為" },
  { title: "高穩健性", desc: "部分成員失效不影響任務，無單點故障" },
];
concepts.forEach((c, i) => {
  const y = 1.05 + i * 1.05;
  slide2.addText(c.title, {
    x: 4.2, y: y, w: 5.3, h: 0.4,
    fontSize: 16, fontFace: "Arial", color: C.primary, bold: true, margin: 0
  });
  slide2.addText(c.desc, {
    x: 4.2, y: y + 0.4, w: 5.3, h: 0.5,
    fontSize: 13, fontFace: "Arial", color: C.gray, margin: 0
  });
  if (i < concepts.length - 1) {
    slide2.addShape(pres.shapes.LINE, {
      x: 4.2, y: y + 0.95, w: 5.0, h: 0,
      line: { color: "CBD5E1", width: 0.5 }
    });
  }
});
slide2.addText("「相對簡單的機器人協同完成任務，最大優勢是系統的穩健性」— Hamann, 2018", {
  x: 0.3, y: 5.0, w: 3.2, h: 0.4,
  fontSize: 9, fontFace: "Arial", color: C.gray, italic: true, margin: 0
});

// ===== Slide 3: 為什麼 ROS2 更適合 =====
let slide3 = pres.addSlide();
slide3.background = { color: C.white };
slide3.addText("為什麼 ROS2 更適合叢集？", {
  x: 0.5, y: 0.35, w: 9, h: 0.6,
  fontSize: 28, fontFace: "Arial", color: C.dark, bold: true, margin: 0
});

// ROS1
slide3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.1, w: 4.3, h: 3.6, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
slide3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.1, w: 4.3, h: 0.5, fill: { color: "DC2626" } });
slide3.addText("ROS 1 — 中央主節點", {
  x: 0.5, y: 1.15, w: 4.3, h: 0.4,
  fontSize: 14, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
});
const ros1Issues = ["依賴中央 ROS Master", "與去中心化概念相違背", "單點故障風險", "擴展性受限"];
ros1Issues.forEach((item, i) => {
  slide3.addText("✕  " + item, {
    x: 0.7, y: 1.75 + i * 0.65, w: 3.9, h: 0.5,
    fontSize: 13, fontFace: "Arial", color: "991B1B", margin: 0
  });
});

// ROS2
slide3.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.1, w: 4.3, h: 3.6, fill: { color: "F0FDF4" }, line: { color: "BBF7D0", width: 1 } });
slide3.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.1, w: 4.3, h: 0.5, fill: { color: "16A34A" } });
slide3.addText("ROS 2 — DDS 去中心化", {
  x: 5.2, y: 1.15, w: 4.3, h: 0.4,
  fontSize: 14, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
});
const ros2Pros = ["無中央主節點", "資料分發服務 (DDS) 中間件", "真正的去中心化架構", "平台無關性高"];
ros2Pros.forEach((item, i) => {
  slide3.addText("✓  " + item, {
    x: 5.4, y: 1.75 + i * 0.65, w: 3.9, h: 0.5,
    fontSize: 13, fontFace: "Arial", color: "166534", margin: 0
  });
});

slide3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.85, w: 9, h: 0.55, fill: { color: C.primary } });
slide3.addText("ROS 2 的 DDS 中間件實現了真正的去中心化，更符合叢集機器人的核心概念", {
  x: 0.5, y: 4.9, w: 9, h: 0.45,
  fontSize: 13, fontFace: "Arial", color: C.white, align: "center", margin: 0
});

// ===== Slide 4: 現有方案的問題 =====
let slide4 = pres.addSlide();
slide4.background = { color: C.lightGray };
slide4.addText("現有方案的問題", {
  x: 0.5, y: 0.35, w: 9, h: 0.6,
  fontSize: 28, fontFace: "Arial", color: C.dark, bold: true, margin: 0
});

const problems = [
  { title: "依賴中央元件", desc: "多數現有 ROS 軟體包仍依賴中央 ROS Master，與去中心化理念違背" },
  { title: "缺乏通用框架", desc: "通用的「群體庫」尚不存在，程式碼重用困難" },
  { title: "硬體綁定", desc: "機器人平台多樣性高，現有方案往往硬體相關，難以跨平台" },
  { title: "實驗困難", desc: "原型設計和實驗往往需要機器人間通訊，原型設計複雜" },
];
problems.forEach((p, i) => {
  const y = 1.1 + i * 1.05;
  slide4.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 9, h: 0.9, fill: { color: C.white } });
  slide4.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 0.08, h: 0.9, fill: { color: C.accent } });
  slide4.addText(p.title, {
    x: 0.8, y: y + 0.1, w: 8.5, h: 0.4,
    fontSize: 15, fontFace: "Arial", color: C.primary, bold: true, margin: 0
  });
  slide4.addText(p.desc, {
    x: 0.8, y: y + 0.45, w: 8.5, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: C.gray, margin: 0
  });
});

// ===== Slide 5: ROS2swarm 是什麼 =====
let slide5 = pres.addSlide();
slide5.background = { color: C.dark };
slide5.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.accent } });
slide5.addText("ROS2swarm", {
  x: 0.5, y: 0.5, w: 9, h: 0.8,
  fontSize: 40, fontFace: "Arial Black", color: C.white, bold: true, margin: 0
});
slide5.addText("一個即用型的 ROS 2 叢集行為庫", {
  x: 0.5, y: 1.25, w: 9, h: 0.45,
  fontSize: 18, fontFace: "Arial", color: C.accent, margin: 0
});

const values = [
  { title: "模組化", desc: "AbstractPattern 基類，所有行為皆可獨立或組合使用" },
  { title: "平台無關", desc: "支援 TurtleBot3、Jackal，極易擴展到其他 ROS 2 平台" },
  { title: "易擴展", desc: "新增行為只需繼承 AbstractPattern，啟動腳本自動整合" },
];
values.forEach((v, i) => {
  const x = 0.5 + i * 3.1;
  slide5.addShape(pres.shapes.RECTANGLE, { x: x, y: 2.0, w: 2.9, h: 2.4, fill: { color: C.primary } });
  slide5.addText(v.title, {
    x: x, y: 2.2, w: 2.9, h: 0.5,
    fontSize: 18, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
  });
  slide5.addShape(pres.shapes.LINE, { x: x + 0.8, y: 2.75, w: 1.3, h: 0, line: { color: C.accent, width: 2 } });
  slide5.addText(v.desc, {
    x: x + 0.2, y: 2.95, w: 2.5, h: 1.2,
    fontSize: 12, fontFace: "Arial", color: C.light, margin: 0
  });
});

slide5.addText("所有行為在每個機器人上自主獨立執行，透過全域命名空間 ROS 2 主題共享必要資料", {
  x: 0.5, y: 4.7, w: 9, h: 0.45,
  fontSize: 12, fontFace: "Arial", color: C.gray, align: "center", margin: 0
});
slide5.addText("https://gitlab.iti.uni-luebeck.de/ROS2/ros2swarm", {
  x: 0.5, y: 5.2, w: 9, h: 0.3,
  fontSize: 10, fontFace: "Arial", color: C.secondary, align: "center", margin: 0
});

// ===== Slide 6: 軟體架構 =====
let slide6 = pres.addSlide();
slide6.background = { color: C.white };
slide6.addText("軟體架構", {
  x: 0.5, y: 0.35, w: 9, h: 0.6,
  fontSize: 28, fontFace: "Arial", color: C.dark, bold: true, margin: 0
});
slide6.addText("AbstractPattern 基類 → 兩大模式分支", {
  x: 0.5, y: 0.85, w: 9, h: 0.4,
  fontSize: 13, fontFace: "Arial", color: C.gray, margin: 0
});

slide6.addShape(pres.shapes.RECTANGLE, { x: 3.0, y: 1.3, w: 4.0, h: 0.7, fill: { color: C.dark } });
slide6.addText("AbstractPattern", {
  x: 3.0, y: 1.35, w: 4.0, h: 0.6,
  fontSize: 14, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
});

slide6.addShape(pres.shapes.LINE, { x: 5.0, y: 2.0, w: 0, h: 0.4, line: { color: C.primary, width: 2 } });
slide6.addShape(pres.shapes.LINE, { x: 2.5, y: 2.4, w: 5.0, h: 0, line: { color: C.primary, width: 2 } });
slide6.addShape(pres.shapes.LINE, { x: 2.5, y: 2.4, w: 0, h: 0.3, line: { color: C.primary, width: 2 } });
slide6.addShape(pres.shapes.LINE, { x: 7.5, y: 2.4, w: 0, h: 0.3, line: { color: C.primary, width: 2 } });

slide6.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 2.7, w: 3.6, h: 0.65, fill: { color: C.secondary } });
slide6.addText("MovementPattern", {
  x: 0.7, y: 2.75, w: 3.6, h: 0.55,
  fontSize: 13, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
});
slide6.addShape(pres.shapes.RECTANGLE, { x: 5.7, y: 2.7, w: 3.6, h: 0.65, fill: { color: C.secondary } });
slide6.addText("VotingPattern", {
  x: 5.7, y: 2.75, w: 3.6, h: 0.55,
  fontSize: 13, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
});

const movePatterns = ["Attraction（吸引）", "Dispersion（分散）", "Driving（驅動）", "Clustering（叢集）", "Random Walk"];
movePatterns.forEach((p, i) => {
  const y = 3.5 + i * 0.38;
  slide6.addShape(pres.shapes.OVAL, { x: 0.85, y: y + 0.08, w: 0.18, h: 0.18, fill: { color: C.accent } });
  slide6.addText(p, { x: 1.15, y: y, w: 3.2, h: 0.35, fontSize: 11, fontFace: "Arial", color: C.dark, margin: 0 });
});

const votePatterns = ["Majority Rule（多數規則）", "Voter Model（投票模型）"];
votePatterns.forEach((p, i) => {
  const y = 3.5 + i * 0.38;
  slide6.addShape(pres.shapes.OVAL, { x: 5.85, y: y + 0.08, w: 0.18, h: 0.18, fill: { color: C.accent } });
  slide6.addText(p, { x: 6.15, y: y, w: 3.2, h: 0.35, fontSize: 11, fontFace: "Arial", color: C.dark, margin: 0 });
});

slide6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 5.0, w: 9, h: 0.5, fill: { color: C.lightGray } });
slide6.addText("另含 HardwareProtectionLayer — 獨立運作，防止碰撞與硬體損傷", {
  x: 0.5, y: 5.05, w: 9, h: 0.4,
  fontSize: 11, fontFace: "Arial", color: C.gray, align: "center", margin: 0
});

// ===== Slide 7: 運動模式 =====
let slide7 = pres.addSlide();
slide7.background = { color: C.lightGray };
slide7.addText("運動模式", {
  x: 0.5, y: 0.35, w: 9, h: 0.6,
  fontSize: 28, fontFace: "Arial", color: C.dark, bold: true, margin: 0
});
slide7.addText("控制機器人群集的運動行為", {
  x: 0.5, y: 0.85, w: 9, h: 0.4,
  fontSize: 13, fontFace: "Arial", color: C.gray, margin: 0
});

const motions = [
  { name: "Attraction 吸引", desc: "基於吸引勢場，機器人向感測器範圍內的障礙物移動，實現聚合", color: "DC2626" },
  { name: "Dispersion 分散", desc: "基於排斥勢場，機器人分佈開來並保持聯繫", color: "EA580C" },
  { name: "Driving 驅動", desc: "直線行駛，保持方向", color: "CA8A04" },
  { name: "Clustering 叢集", desc: "基於 Moeslinger 的極簡集群演算法，協調運動", color: "16A34A" },
  { name: "Random Walk 隨機遊走", desc: "直線行駛與隨機轉彎之間切換", color: "0284C7" },
  { name: "Disscussed Dispersion", desc: "機器人依照群體決定的距離進行分佈（結合投票模式）", color: "7C3AED" },
];

motions.forEach((m, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = 0.5 + col * 4.7;
  const y = 1.35 + row * 1.35;
  slide7.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: 4.5, h: 1.15, fill: { color: C.white } });
  slide7.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: 0.07, h: 1.15, fill: { color: m.color } });
  slide7.addText(m.name, { x: x + 0.2, y: y + 0.1, w: 4.1, h: 0.4, fontSize: 13, fontFace: "Arial", color: C.primary, bold: true, margin: 0 });
  slide7.addText(m.desc, { x: x + 0.2, y: y + 0.5, w: 4.1, h: 0.55, fontSize: 11, fontFace: "Arial", color: C.gray, margin: 0 });
});

// ===== Slide 8: 投票模式 =====
let slide8 = pres.addSlide();
slide8.background = { color: C.white };
slide8.addText("投票模式 — 集體決策", {
  x: 0.5, y: 0.35, w: 9, h: 0.6,
  fontSize: 28, fontFace: "Arial", color: C.dark, bold: true, margin: 0
});
slide8.addText("機器人透過交換意見達成共識，實現集體決策行為", {
  x: 0.5, y: 0.85, w: 9, h: 0.4,
  fontSize: 13, fontFace: "Arial", color: C.gray, margin: 0
});

const votes = [
  {
    name: "Majority Rule", cn: "多數規則",
    desc: "根據多數人的意見更新自己的看法",
    detail: "滾動時間窗口：固定大小、不重疊的連續時間間隔，決策規則處理窗口內接收到的數據"
  },
  {
    name: "Voter Model", cn: "投票模型",
    desc: "根據隨機鄰居的意見進行意見更新",
    detail: "每個機器人隨機選擇一個鄰居，採用該鄰居的意見，逐步收斂到共識"
  }
];

votes.forEach((v, i) => {
  const x = 0.5 + i * 4.7;
  slide8.addShape(pres.shapes.RECTANGLE, { x: x, y: 1.4, w: 4.5, h: 2.6, fill: { color: C.lightGray } });
  slide8.addShape(pres.shapes.RECTANGLE, { x: x, y: 1.4, w: 4.5, h: 0.7, fill: { color: C.primary } });
  slide8.addText(v.name, { x: x, y: 1.45, w: 4.5, h: 0.4, fontSize: 15, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0 });
  slide8.addText(v.cn, { x: x, y: 1.8, w: 4.5, h: 0.3, fontSize: 11, fontFace: "Arial", color: C.light, align: "center", margin: 0 });
  slide8.addText(v.desc, { x: x + 0.2, y: 2.2, w: 4.1, h: 0.5, fontSize: 13, fontFace: "Arial", color: C.dark, bold: true, margin: 0 });
  slide8.addText(v.detail, { x: x + 0.2, y: 2.7, w: 4.1, h: 1.1, fontSize: 11, fontFace: "Arial", color: C.gray, margin: 0 });
});

slide8.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.2, w: 9, h: 1.2, fill: { color: C.dark } });
slide8.addText("通訊機制", { x: 0.7, y: 4.3, w: 8.6, h: 0.4, fontSize: 14, fontFace: "Arial", color: C.accent, bold: true, margin: 0 });
slide8.addText("透過全域命名空間 ROS 2 主題交換意見（自訂訊息類型：機器人 ID + 意見整數）\n所有群集成員位於同一網路中，共享主題可被所有成員存取", {
  x: 0.7, y: 4.7, w: 8.6, h: 0.65, fontSize: 11, fontFace: "Arial", color: C.white, margin: 0
});

// ===== Slide 9: 實驗驗證 =====
let slide9 = pres.addSlide();
slide9.background = { color: C.lightGray };
slide9.addText("實驗驗證", {
  x: 0.5, y: 0.35, w: 9, h: 0.6,
  fontSize: 28, fontFace: "Arial", color: C.dark, bold: true, margin: 0
});
slide9.addText("三個不同平台成功驗證：TurtleBot3 Burger、TurtleBot3 Waffle Pi、Jackal UGV", {
  x: 0.5, y: 0.85, w: 9, h: 0.4,
  fontSize: 13, fontFace: "Arial", color: C.gray, margin: 0
});

const platforms = [
  { name: "TurtleBot3 Burger", type: "室內研究平台", specs: "差速驅動、IMU、LiDAR\n0.12m - 3.5m 範圍", color: "0284C7" },
  { name: "TurtleBot3 Waffle Pi", type: "室內研究平台", specs: "含 Raspberry Pi 相機\n同 LiDAR 規格", color: "0369A1" },
  { name: "Jackal UGV", type: "戶外研究平台", specs: "GPS、IMU、Jetson TX2\nZED 相機、Ouster OS1-16 LiDAR\n0.8m - 5m 範圍", color: "0F766E" },
];

platforms.forEach((p, i) => {
  const x = 0.5 + i * 3.1;
  slide9.addShape(pres.shapes.RECTANGLE, { x: x, y: 1.4, w: 2.9, h: 2.8, fill: { color: C.white } });
  slide9.addShape(pres.shapes.RECTANGLE, { x: x, y: 1.4, w: 2.9, h: 0.65, fill: { color: p.color } });
  slide9.addText(p.name, { x: x, y: 1.45, w: 2.9, h: 0.35, fontSize: 12, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0 });
  slide9.addText(p.type, { x: x, y: 1.75, w: 2.9, h: 0.3, fontSize: 10, fontFace: "Arial", color: C.light, align: "center", margin: 0 });
  slide9.addText(p.specs, { x: x + 0.15, y: 2.15, w: 2.6, h: 1.9, fontSize: 10, fontFace: "Arial", color: C.dark, margin: 0 });
});

slide9.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.4, w: 9, h: 1.05, fill: { color: C.dark } });
slide9.addText("實驗結果", { x: 0.7, y: 4.5, w: 8.6, h: 0.35, fontSize: 13, fontFace: "Arial", color: C.accent, bold: true, margin: 0 });
slide9.addText("吸引模式：Gazebo 模擬中集群成功聚集為一簇。硬體實驗 6 分鐘後，六個機器人形成穩定群體\n討論分散模式：結合投票與運動，機器人依群體共識保持指定距離分散", {
  x: 0.7, y: 4.85, w: 8.6, h: 0.55, fontSize: 10, fontFace: "Arial", color: C.white, margin: 0
});

// ===== Slide 10: 結論與價值 =====
let slide10 = pres.addSlide();
slide10.background = { color: C.dark };
slide10.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.accent } });
slide10.addText("結論與價值", {
  x: 0.5, y: 0.4, w: 9, h: 0.7,
  fontSize: 32, fontFace: "Arial", color: C.white, bold: true, margin: 0
});

const conclusions = [
  { title: "易於維護", desc: "模組化設計，行為可獨立、可組合" },
  { title: "極易擴展", desc: "新增行為只需繼承 AbstractPattern 類別" },
  { title: "跨平台通用", desc: "任何 ROS/ROS 2 相容平台，配置啟動腳本即可" },
  { title: "快速建構", desc: "提供即用型行為原語，大幅縮短叢集實驗建立時間" },
];

conclusions.forEach((c, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = 0.5 + col * 4.7;
  const y = 1.3 + row * 1.4;
  slide10.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: 4.5, h: 1.15, fill: { color: C.primary } });
  slide10.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: 0.07, h: 1.15, fill: { color: C.accent } });
  slide10.addText(c.title, { x: x + 0.2, y: y + 0.15, w: 4.1, h: 0.4, fontSize: 16, fontFace: "Arial", color: C.white, bold: true, margin: 0 });
  slide10.addText(c.desc, { x: x + 0.2, y: y + 0.55, w: 4.1, h: 0.5, fontSize: 12, fontFace: "Arial", color: C.light, margin: 0 });
});

slide10.addShape(pres.shapes.LINE, { x: 0.5, y: 4.35, w: 9, h: 0, line: { color: C.secondary, width: 0.5 } });
slide10.addText("「ROS2swarm 融合了叢集機器人的優勢（適應性、穩健性、可擴展性）以及 ROS 2 的優勢（平台獨立性、模組化）」", {
  x: 0.5, y: 4.5, w: 9, h: 0.5,
  fontSize: 11, fontFace: "Arial", color: C.gray, italic: true, align: "center", margin: 0
});
slide10.addText("論文：arXiv:2405.02438v1  •  程式碼：GitLab (ROS2/ros2swarm)", {
  x: 0.5, y: 5.1, w: 9, h: 0.35,
  fontSize: 10, fontFace: "Arial", color: C.secondary, align: "center", margin: 0
});

// Save
pres.writeFile({ fileName: "/Users/oren/Desktop/Oren_own/docs/knowledge/ROS2swarm/ROS2swarm_介紹與應用.pptx" })
  .then(() => console.log("Done: ROS2swarm_介紹與應用.pptx"))
  .catch(e => console.error(e));