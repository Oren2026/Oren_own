# interfaces/motion_command.py
"""
motion → hiwin_arm.py 和 arduino_serial.py 介面

格式：dict，分為 hiwin 指令和 arduino 指令兩種

hiwin 指令：
    {
        "move_type": "LIN",
        "position": {"x": 300.0, "y": 200.0, "z": 200.0},
        "velocity": 50,
        "tool": 0,
        "user": 0,
    }

arduino 指令：
    {
        "command": "STRIKE",
        "force": 7,
    }

來源：motion/strike.py
輸出至：comm/hiwin_arm.py（TCP/IP）, comm/arduino_serial.py（Serial）
"""

from typing import Dict, Any, Literal

__all__ = [
    "MotionCommand",
    "HiwinCommand",
    "ArduinoCommand",
    "validate_motion_command",
    "create_hiwin_command",
    "create_arduino_command"
]


class MotionCommand:
    """運動控制指令（分為 hiwin 和 arduino 兩種）"""
    
    HIWIN = "hiwin"
    ARDUINO = "arduino"
    
    VALID_MOVE_TYPES = {"LIN", "PTP", "CIRC"}
    VALID_COMMANDS = {"STRIKE", "RESET", "PUMP_ON", "PUMP_OFF", "GRIP"}


class HiwinCommand:
    """Hiwin 機械臂指令"""
    
    def __init__(self, data: Dict[str, Any]):
        self.data = data
    
    def to_dict(self) -> Dict[str, Any]:
        return self.data


class ArduinoCommand:
    """Arduino 控制指令"""
    
    def __init__(self, data: Dict[str, Any]):
        self.data = data
    
    def to_dict(self) -> Dict[str, Any]:
        return self.data


def validate_motion_command(data: Any) -> bool:
    """
    驗證 motion_command 格式是否正確
    
    Args:
        data: 要驗證的資料（必須是 dict）
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    if not isinstance(data, dict):
        raise ValueError(f"motion_command must be a dict, got {type(data).__name__}")
    
    # 判斷是 hiwin 還是 arduino 指令
    if "move_type" in data:
        # hiwin 指令
        return validate_hiwin_command(data)
    elif "command" in data:
        # arduino 指令
        return validate_arduino_command(data)
    else:
        raise ValueError(
            "motion_command must contain 'move_type' (hiwin) "
            "or 'command' (arduino)"
        )


def validate_hiwin_command(data: Dict[str, Any]) -> bool:
    """驗證 hiwin 指令格式"""
    required = {"move_type", "position", "velocity", "tool", "user"}
    missing = required - set(data.keys())
    if missing:
        raise ValueError(f"hiwin command missing required fields: {missing}")
    
    if data["move_type"] not in MotionCommand.VALID_MOVE_TYPES:
        raise ValueError(
            f"move_type '{data['move_type']}' invalid, "
            f"must be one of {MotionCommand.VALID_MOVE_TYPES}"
        )
    
    if not isinstance(data["position"], dict):
        raise ValueError("'position' must be a dict with x, y, z keys")
    
    for axis in ["x", "y", "z"]:
        if axis not in data["position"]:
            raise ValueError(f"'position' missing '{axis}' key")
        if not isinstance(data["position"][axis], (int, float)):
            raise ValueError(f"'position.{axis}' must be numeric")
    
    for field in ["velocity", "tool", "user"]:
        if not isinstance(data[field], (int, float)):
            raise ValueError(f"'{field}' must be numeric")
    
    return True


def validate_arduino_command(data: Dict[str, Any]) -> bool:
    """驗證 arduino 指令格式"""
    if "command" not in data:
        raise ValueError("arduino command missing 'command' field")
    
    if data["command"] not in MotionCommand.VALID_COMMANDS:
        raise ValueError(
            f"command '{data['command']}' invalid, "
            f"must be one of {MotionCommand.VALID_COMMANDS}"
        )
    
    # force 是可選欄位，但如果有就必須在 1-12 範圍內
    if "force" in data:
        force = data["force"]
        if not isinstance(force, (int, float)):
            raise ValueError(f"'force' must be numeric, got {type(force).__name__}")
        if force < 1 or force > 12:
            raise ValueError(f"'force' must be between 1-12, got {force}")
    
    return True


def create_hiwin_command(
    move_type: str,
    position: Dict[str, float],
    velocity: int = 50,
    tool: int = 0,
    user: int = 0
) -> Dict[str, Any]:
    """
    建立 hiwin 指令
    
    Args:
        move_type: "LIN" | "PTP" | "CIRC"
        position: {"x": float, "y": float, "z": float}
        velocity: 速度 (default 50)
        tool: 工具座標系 (default 0)
        user: 用戶座標系 (default 0)
        
    Returns:
        hiwin command dict
    """
    return {
        "move_type": move_type,
        "position": position,
        "velocity": velocity,
        "tool": tool,
        "user": user
    }


def create_arduino_command(command: str, force: int = None) -> Dict[str, Any]:
    """
    建立 arduino 指令
    
    Args:
        command: "STRIKE" | "RESET" | "PUMP_ON" | "PUMP_OFF" | "GRIP"
        force: 力道等級 1-12 (STRIKE 時需要)
        
    Returns:
        arduino command dict
    """
    result = {"command": command}
    if force is not None:
        result["force"] = force
    return result