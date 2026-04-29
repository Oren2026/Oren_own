# interfaces/__init__.py
"""
interfaces/ — 模組間資料傳遞標準（固定不動）

所有模組之間的資料傳遞都必須透過這裡定義的資料結構。

目的：標準化訊號從哪進、從哪出，讓同學知道如何串接。

╔══════════════════════════════════════════════════════════════════════════════╗
║  資料流動總覽                                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  [Camera]  ──raw frame──▶  [vision/ball_detector.py]                        ║
║                                    │                                       ║
║                         VisionOutput (list of dict)                        ║
║                                    │                                       ║
║                    vision_output.py ──▶ [strategy/*.py]                    ║
║                                              │                              ║
║                                    StrategyOutput (dict)                   ║
║                                              │                              ║
║                    strategy_output.py ──▶ [motion/strike.py]                ║
║                                              │                              ║
║                                   MotionCommand (dict)                     ║
║                                    │                                       ║
║              ┌──────────────────────┴──────────────────────┐               ║
║              ▼                                              ▼               ║
║  [comm/hiwin_arm.py]                              [comm/arduino_serial.py]  ║
║       (TCP/IP)                                           (Serial)           ║
║                                                                            ║
║  擊球後 Feedback：                                                      ║
║  ShotRecord (shot_record.py) ◀── motion/strike.py                       ║
║         │                                                              ║
║         ▼                                                              ║
║  [analysis/shot_logger.py]                                             ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

每個介面檔案：
- vision_output.py   : vision → strategy（球的位置列表）
- strategy_output.py : strategy → motion（單顆球規劃）
- motion_command.py  : motion → arm/arduino（控制指令）
- shot_record.py     : 擊球記錄（feedback learning）
"""

# 標準 I/O 介面
from .vision_output import (
    VisionOutput,
    validate_vision_output,
    create_vision_output,
)

from .strategy_output import (
    StrategyOutput,
    validate_strategy_output,
    create_strategy_output,
)

from .motion_command import (
    MotionCommand,
    HiwinCommand,
    ArduinoCommand,
    validate_motion_command,
    validate_hiwin_command,
    validate_arduino_command,
    create_hiwin_command,
    create_arduino_command,
)

from .shot_record import (
    ShotRecord,
    ShotRecordCollection,
    validate_shot_record,
    create_shot_record,
    load_shot_records,
    save_shot_records,
    append_shot_record,
)

# 向後相容：保留原有 dataclass 介面
from .data_structures import (
    BallPosition,
    TableCoord,
    StrikeCmd,
    ArmPosition,
    VisionResult,
)

__all__ = [
    # vision_output
    "VisionOutput",
    "validate_vision_output",
    "create_vision_output",
    # strategy_output
    "StrategyOutput",
    "validate_strategy_output",
    "create_strategy_output",
    # motion_command
    "MotionCommand",
    "HiwinCommand",
    "ArduinoCommand",
    "validate_motion_command",
    "validate_hiwin_command",
    "validate_arduino_command",
    "create_hiwin_command",
    "create_arduino_command",
    # shot_record
    "ShotRecord",
    "ShotRecordCollection",
    "validate_shot_record",
    "create_shot_record",
    "load_shot_records",
    "save_shot_records",
    "append_shot_record",
    # 向後相容
    "BallPosition",
    "TableCoord",
    "StrikeCmd",
    "ArmPosition",
    "VisionResult",
]