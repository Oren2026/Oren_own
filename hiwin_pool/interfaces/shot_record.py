# interfaces/shot_record.py
"""
擊球記錄格式（feedback learning 用）

每次擊球後記錄一筆，包含規劃參數、實際結果、誤差的比較。

Example:
    {
        "shot_id": 1,
        "timestamp": "2026-05-01T10:30:00",
        "planned": {
            "target_ball": {"x_mm": 350.0, "y_mm": 210.0},
            "target_pocket": {"x_mm": 0, "y_mm": 630},
            "strike_point": {"x_mm": 300.0, "y_mm": 200.0},
            "force": 7,
        },
        "actual": {
            "ball_stop_pos": {"x_mm": 355.0, "y_mm": 215.0},
            "ball_in_pocket": False,
            "cue_ball_scratch": False,
            "actual_force": 7,
        },
        "error": {
            "distance_mm": 7.1,
            "angle_error_deg": 2.3,
        }
    }

來源：motion/strike.py（擊球後更新）
輸出至：analysis/shot_logger.py, feedback learning 系統
"""

import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

__all__ = [
    "ShotRecord",
    "ShotRecordCollection",
    "validate_shot_record",
    "create_shot_record",
    "load_shot_records",
    "save_shot_records"
]


class ShotRecord:
    """單筆擊球記錄"""
    
    REQUIRED_PLANNED = {"target_ball", "target_pocket", "strike_point", "force"}
    REQUIRED_ACTUAL = {"ball_stop_pos", "ball_in_pocket", "cue_ball_scratch", "actual_force"}
    REQUIRED_ERROR = {"distance_mm", "angle_error_deg"}
    
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self._validate()
    
    def _validate(self):
        """內部驗證"""
        validate_shot_record(self.data)
    
    def to_dict(self) -> Dict[str, Any]:
        return self.data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ShotRecord":
        return cls(data)


class ShotRecordCollection:
    """擊球記錄集合，支援 JSON 持久化"""
    
    def __init__(self, records: Optional[List[Dict[str, Any]]] = None):
        self.records = records or []
    
    def add(self, record: Dict[str, Any]) -> None:
        """新增一筆記錄"""
        validate_shot_record(record)
        self.records.append(record)
    
    def get(self, shot_id: int) -> Optional[Dict[str, Any]]:
        """依 shot_id 取得記錄"""
        for r in self.records:
            if r.get("shot_id") == shot_id:
                return r
        return None
    
    def filter(self, ball_in_pocket: Optional[bool] = None) -> List[Dict[str, Any]]:
        """依條件篩選記錄"""
        result = self.records
        if ball_in_pocket is not None:
            result = [
                r for r in result
                if r.get("actual", {}).get("ball_in_pocket") == ball_in_pocket
            ]
        return result
    
    def to_dict(self) -> List[Dict[str, Any]]:
        return self.records
    
    @classmethod
    def from_dict(cls, data: List[Dict[str, Any]]) -> "ShotRecordCollection":
        return cls(data)


def validate_shot_record(data: Any) -> bool:
    """
    驗證 shot_record 格式是否正確
    
    Args:
        data: 要驗證的資料
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    if not isinstance(data, dict):
        raise ValueError(f"shot_record must be a dict, got {type(data).__name__}")
    
    # 檢查 shot_id
    if "shot_id" not in data:
        raise ValueError("shot_record missing 'shot_id'")
    if not isinstance(data["shot_id"], int):
        raise ValueError(f"'shot_id' must be int, got {type(data['shot_id']).__name__}")
    
    # 檢查 timestamp
    if "timestamp" not in data:
        raise ValueError("shot_record missing 'timestamp'")
    
    # 檢查 planned 區塊
    if "planned" not in data:
        raise ValueError("shot_record missing 'planned'")
    planned = data["planned"]
    if not isinstance(planned, dict):
        raise ValueError("'planned' must be a dict")
    missing_planned = ShotRecord.REQUIRED_PLANNED - set(planned.keys())
    if missing_planned:
        raise ValueError(f"'planned' missing required fields: {missing_planned}")
    
    # 檢查 actual 區塊
    if "actual" not in data:
        raise ValueError("shot_record missing 'actual'")
    actual = data["actual"]
    if not isinstance(actual, dict):
        raise ValueError("'actual' must be a dict")
    missing_actual = ShotRecord.REQUIRED_ACTUAL - set(actual.keys())
    if missing_actual:
        raise ValueError(f"'actual' missing required fields: {missing_actual}")
    
    # 檢查 error 區塊
    if "error" not in data:
        raise ValueError("shot_record missing 'error'")
    error = data["error"]
    if not isinstance(error, dict):
        raise ValueError("'error' must be a dict")
    missing_error = ShotRecord.REQUIRED_ERROR - set(error.keys())
    if missing_error:
        raise ValueError(f"'error' missing required fields: {missing_error}")
    
    return True


def create_shot_record(
    shot_id: int,
    planned: Dict[str, Any],
    actual: Dict[str, Any],
    error: Dict[str, Any],
    timestamp: Optional[str] = None
) -> Dict[str, Any]:
    """
    建立 shot_record
    
    Args:
        shot_id: 擊球編號
        planned: 規劃參數
        actual: 實際結果
        error: 誤差資料
        timestamp: 時間戳（預設當前時間）
        
    Returns:
        shot_record dict
    """
    return {
        "shot_id": shot_id,
        "timestamp": timestamp or datetime.now().isoformat(),
        "planned": planned,
        "actual": actual,
        "error": error
    }


# ============================================================================
# JSON 讀寫輔助函數
# ============================================================================

def load_shot_records(filepath: str) -> List[Dict[str, Any]]:
    """
    從 JSON 檔案載入擊球記錄
    
    Args:
        filepath: JSON 檔案路徑
        
    Returns:
        List[ShotRecord]
    """
    if not os.path.exists(filepath):
        return []
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if not isinstance(data, list):
        raise ValueError(f"JSON file must contain a list, got {type(data).__name__}")
    
    # 驗證每筆記錄
    for record in data:
        validate_shot_record(record)
    
    return data


def save_shot_records(records: List[Dict[str, Any]], filepath: str) -> None:
    """
    將擊球記錄儲存為 JSON 檔案
    
    Args:
        records: 擊球記錄列表
        filepath: JSON 檔案路徑
    """
    # 驗證所有記錄
    for record in records:
        validate_shot_record(record)
    
    # 確保目錄存在
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)


def append_shot_record(record: Dict[str, Any], filepath: str) -> None:
    """
    新增一筆記錄到 JSON 檔案（不覆蓋既有資料）
    
    Args:
        record: 擊球記錄
        filepath: JSON 檔案路徑
    """
    records = load_shot_records(filepath)
    records.append(record)
    save_shot_records(records, filepath)