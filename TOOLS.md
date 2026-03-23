# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _my_ specifics — the stuff that's unique to my setup.

## 🐟 Oren 黑輪的環境設定

### 系統路徑
- **Workspace:** `~/.openclaw/workspace/`
- **Skills 目錄:** `~/.openclaw/workspace/skills/`
- **記憶目錄:** `~/.openclaw/workspace/memory/`
- **興趣主題:** `~/.openclaw/workspace/memory/interests/interests-list.md`

### GitHub 相關
- **Oren_own repo:** `/tmp/oren_github/`
- **JSON 資料:** `/tmp/oren_github/docs/data/YYYYMMDD.json`
- **GitHub Pages:** https://Oren2026.github.io/Oren_own/docs/

### 專案路徑
- **點餐系統:** `~/Desktop/小小工作嘗試/訂餐系統訂餐＆系統/`
- **備份目錄:** `~/projects/orenweb/databackup/`

### Skills（已安裝）
- agent-browser：瀏覽器自動化
- find：找檔案
- find-skill：找技能
- memory-setup-openclaw：記憶設定
- self-improving：反思改進
- skill-creator：創建技能
- skill-vetter：安全性審計

### OpenClaw CLI
- **Gateway:** `openclaw gateway status/start/stop/restart`
- **Cron:** `openclaw cron list/rm/add/edit`
- **Sessions:** `openclaw sessions list`

### CRON 設定（最終版）
| 名稱 | 頻率 | 功能 |
|------|------|------|
| 搜尋興趣主題 | 每 5 分鐘 | 讀取P主題→搜尋→寫入JSON→刪除主題 |
| 整點push | 每小時 | git push |
| 每日備份json | 00:00 | 複製到databackup + 刪除7天前舊檔 |

### 價值觀關鍵字
- 不被淘汰
- 掌控感
- 跨領域整合
- 「悟」的探索

---

Add whatever helps you do your job. This is your cheat sheet. 🐟
