# BlackCortex 股票分析資料夾

## 檔案命名格式

```
{YYYYMMDD}_stocks.json
例：20260401_stocks.json
```

## JSON 格式標準

```json
{
  "report_date": "YYYY-MM-DD",
  "report_title": "標題",
  "researcher": "分析者",
  "source": "資料來源與時間",
  "note": "注意事項（非投資建議等）",
  "trends_summary": ["趨勢1", "趨勢2", ...],
  "stocks": [
    {
      "id": 1,
      "code": "股票代號",
      "name": "公司名稱",
      "category": "類別",
      "why_undervalued": "為什麼可能是機會",
      "trend_alignment": "對應的產業趨勢"
    }
  ]
}
```

## 欄位說明

| 欄位 | 必填 | 說明 |
|---|---|---|
| report_date | ✅ | 報告日期，格式 YYYY-MM-DD |
| report_title | ✅ | 報告標題 |
| researcher | ✅ | 分析者名稱 |
| source | ✅ | 資料來源 |
| note | ✅ | 注意事項（通常要標示非投資建議）|
| trends_summary | ✅ | 對應的產業趨勢摘要 |
| stocks | ✅ | 股票陣列 |
| stocks[].code | ✅ | 股票代號（數字字串）|
| stocks[].name | ✅ | 公司名稱 |
| stocks[].category | ✅ | 所屬類別 |
| stocks[].why_undervalued | ✅ | 為什麼關注 |
| stocks[].trend_alignment | ✅ | 對應的趨勢方向 |

## 注意事項
- 本資料夾的內容為研究參考用，**非投資建議**
- 投資人須自行判斷並承擔投資風險
- 資料來源應盡量標註日期與機構
