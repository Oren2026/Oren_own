const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "ROS2swarm 介紹與應用";
pres.author = "黑皮";

// ===== Color Palette =====
const C = {
  primary: "0D4F8B",      // 深藍
  secondary: "1A7FC1",    // 中藍
  accent: "F4A261",       // 暖橙
  light: "E8F4FC",        // 極淡藍
  dark: "0A2342",         // 極深藍
  white: "FFFFFF",
  gray: "64748B",
  lightGray: "F1F5F9",
};

// ===== Slide 1: 封面 =====
let slide1 = pres.addSlide();
slide1.background = { color: C.dark };

// 頂部裝飾線
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.accent }
});

// 主標題
slide1.addText("ROS2swarm", {
  x: 0.5, y: 1.4, w: 9, h: 1.0,
  fontSize: 54, fontFace: "Arial Black", color: C.white,
  bold: true, align: "center", margin: 0
});

slide1.addText("用於群體機器人行為的 ROS 2 軟體包", {
  x: 0.5, y: 2.5, w: 9, h: 0.6,
  fontSize: 22, fontFace: "Arial", color: C.accent,
  align: "center", margin: 0
});

// 分隔線
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 3.5, y: 3.3, w: 3, h: 0.03,
  fill: { color: C.secondary }
});

// 論文資訊
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

// 底部標籤
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 5.1, w: 10, h: 0.525,
  fill: { color: C.secondary, transparency: 30 }
});
slide1.addText("Swarm Robotics  •  ROS 2  •  去中心化架構", {
  x: 0.5, y: 5.18, w: 9, h: 0.4,
  fontSize: 12, fontFace: "Arial", color: C.white, align: "center"
});

// ===== Slide 2: 什麼是叢集機器人 =====
let slide2 = pres.addSlide();
slide2.background = { color: C.lightGray };

// 左側深色區塊
slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 3.8, h: 5.625,
  fill: { color: C.dark }
});

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

// 右側內容
slide2.addText("核心概念", {
  x: 4.2, y: 0.4, w: 5.3, h: 0.5,
  fontSize: 24, fontFace: "Arial", color: C.primary, bold: true, margin: 0
});

const concepts = [
  { title: "去中心化", desc: "沒有中央控制節點，每個機器人自主決策" },
  { title: "簡單規則", desc: "單一機器人行為簡單，依賴協作產生複雜行為" },
  { title: "湧現行為", desc: "大量個體互動後，產生預期外的整體行為" },
  { title: "高穩健性", desc: "部分成員失效不影響任務，無單點故障" },
];

concepts.forEach((c, i) => {
  const y = 1.05 + i * 1.05;
  // 標題
  slide2.addText(c.title, {
    x: 4.2, y: y, w: 5.3, h: 0.4,
    fontSize: 16, fontFace: "Arial", color: C.primary, bold: true, margin: 0
  });
  // 說明
  slide2.addText(c.desc, {
    x: 4.2, y: y + 0.4, w: 5.3, h: 0.5,
    fontSize: 13, fontFace: "Arial", color: C.gray, margin: 0
  });
  // 分隔線
  if (i < concepts.length - 1) {
    slide2.addShape(pres.shapes.LINE, {
      x: 4.2, y: y + 0.95, w: 5.0, h: 0,
      line: { color: "CBD5E1", width: 0.5 }
    });
  }
});

// 底部引用
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

// ROS1 劣勢
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 1.1, w: 4.3, h: 3.6,
  fill: { color: "FEF2F2" },
  line: { color: "FECACA", width: 1 }
});
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 1.1, w: 4.3, h: 0.5,
  fill: { color: "DC2626" }
});
slide3.addText("ROS 1 — 中央主節點", {
  x: 0.5, y: 1.15, w: 4.3, h: 0.4,
  fontSize: 14, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
});

const ros1Issues = [
  "依賴中央 ROS Master",
  "與去中心化概念相違背",
  "單點故障風險",
  "擴展性受限",
];
ros1Issues.forEach((item, i) => {
  slide3.addText("✕  " + item, {
    x: 0.7, y: 1.75 + i * 0.65, w: 3.9, h: 0.5,
    fontSize: 13, fontFace: "Arial", color: "991B1B", margin: 0
  });
});

// ROS2 優勢
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 5.2, y: 1.1, w: 4.3, h: 3.6,
  fill: { color: "F0FDF4" },
  line: { color: "BBF7D0", width: 1 }
});
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 5.2, y: 1.1, w: 4.3, h: 0.5,
  fill: { color: "16A34A" }
});
slide3.addText("ROS 2 — DDS 去中心化", {
  x: 5.2, y: 1.15, w: 4.3, h: 0.4,
  fontSize: 14, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
});

const ros2Pros = [
  "無中央主節點",
  "資料分發服務 (DDS) 中間件",
  "真正的去中心化架構",
  "平台無關性高",
];
ros2Pros.forEach((item, i) => {
  slide3.addText("✓  " + item, {
    x: 5.4, y: 1.75 + i * 0.65, w: 3.9, h: 0.5,
    fontSize: 13, fontFace: "Arial", color: "166534", margin: 0
  });
});

// 底部結論
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 4.85, w: 9, h: 0.55,
  fill: { color: C.primary }
});
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
  {
    icon: "⚠",
    title: "依賴中央元件",
    desc: "多數現有 ROS 軟體包仍依賴中央 ROS Master，與去中心化理念違背"
  },
  {
    icon: "📦",
    title: "缺乏通用框架",
    desc: "通用的「群體庫」尚不存在，程式碼重用困難"
  },
  {
    icon: "🔧",
    title: "硬體綁定",
    desc: "機器人平台多樣性高，現有方案往往硬體相關，難以跨平台"
  },
  {
    icon: "🧪",
    title: "實驗困難",
    desc: "原型設計和實驗往往需要機器人間通訊，原型設計複雜"
  },
];

problems.forEach((p, i) => {
  const y = 1.1 + i * 1.05;

  // 卡片背景
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: y, w: 9, h: 0.9,
    fill: { color: C.white }
  });

  // 左側標記
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: y, w: 0.08, h: 0.9,
    fill: { color: C.accent }
  });

  // 標題
  slide4.addText(p.title, {
    x: 0.8, y: y + 0.1, w: 8.5, h: 0.4,
    fontSize: 15, fontFace: "Arial", color: C.primary, bold: true, margin: 0
  });

  // 說明
  slide4.addText(p.desc, {
    x: 0.8, y: y + 0.45, w: 8.5, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: C.gray, margin: 0
  });
});

// ===== Slide 5: ROS2swarm 是什麼 =====
let slide5 = pres.addSlide();
slide5.background = { color: C.dark };

slide5.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.accent }
});

slide5.addText("ROS2swarm", {
  x: 0.5, y: 0.5, w: 9, h: 0.8,
  fontSize: 40, fontFace: "Arial Black", color: C.white, bold: true, margin: 0
});

slide5.addText("一個即用型的 ROS 2 叢集行為庫", {
  x: 0.5, y: 1.25, w: 9, h: 0.45,
  fontSize: 18, fontFace: "Arial", color: C.accent, margin: 0
});

// 三個核心價值
const values = [
  { title: "模組化", desc: "AbstractPattern 基類，所有行為皆可獨立或組合使用" },
  { title: "平台無關", desc: "支援 TurtleBot3、Jackal，極易擴展到其他 ROS 2 平台" },
  { title: "易擴展", desc: "新增行為只需繼承 AbstractPattern，啟動腳本自動整合" },
];

values.forEach((v, i) => {
  const x = 0.5 + i * 3.1;

  slide5.addShape(pres.shapes.RECTANGLE, {
    x: x, y: 2.0, w: 2.9, h: 2.4,
    fill: { color: C.primary }
  });

  slide5.addText(v.title, {
    x: x, y: 2.2, w: 2.9, h: 0.5,
    fontSize: 18, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0
  });

  slide5.addShape(pres.shapes.LINE, {
    x: x + 0.8, y: 2.75, w: 1.3, h: 0,
    line: { color: C.accent, width: 2 }
  });

  slide5.addText(v.desc, {
    x: x + 0.2, y: 2.95, w: 2.5, h: 1.2,
    fontSize: 12, fontFace: "Arial", color: C.light, margin: 0
  });
});

// 底部敘述
slide5.addText("所有行為在每個機器人上自主獨立執行，透過全域命名空間 ROS 2 主題共享必要資料", {
  x: 0.5, y: 4.7, w: 9, h: 0.45,
  fontSize: 12, fontFace: "Arial", color: C.gray, align: "center", margin: 0
});

// GitLab 連結
slide5.addText("https://gitlab.iti.uni-luebeck.de/ROS2/ros2swarm", {
  x: 0.5, y: 5.2, w: 9, h: 0.3,
  fontSize: 10, fontFace: "Arial", color: C.secondary, align: "center", margin: 0
});

// Save
pres.writeFile({ fileName: "/Users/oren/Desktop/Oren_own/docs/knowledge/ROS2swarm/slides_batch1.pptx" })
  .then(() => console.log("Batch 1 done: slides_batch1.pptx"))
  .catch(e => console.error(e));