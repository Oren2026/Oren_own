# motion/executor.py
"""
自動復位時序的 motion executor

執行時序：
    [Reset] → [Move arm to strike position] → [Arduino strike] → [Reset]

Reset 在移動前執行，避免竿子掃到其他物品。

架構：
    strategy_output (from strategy)
        ↓
    execute_strike()  ← 主要入口
        ├── safe_move_to_strike()  ← 安全移動（Z 先保持在 SAFE_Z）
        ├── safe_return_to_home()  ← 返回起始位置
        ↓
    comm/hiwin_arm.py  ← TCP/IP 手臂控制
    comm/arduino_serial.py  ← Serial Arduino 控制
"""

import time
import logging
from typing import Dict, Any, Optional

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)

# 讀取設定
from config.arm_config import SAFE_Z_HEIGHT as SAFE_Z, Z_MIN, Z_MAX, SAFE_VELOCITY
from config.strike_config import FORCE_LEVELS

# 驗證 force 範圍
FORCE_MIN = 1
FORCE_MAX = 12

# 預設起始位置（可依硬體調整）
DEFAULT_HOME_POS = {"x": 0.0, "y": 300.0, "z": SAFE_Z, "a": 0.0, "b": 0.0, "c": 0.0}


def execute_strike(strategy_output: Dict[str, Any], hiwin_arm, arduino) -> Dict[str, Any]:
    """
    執行一次擊球（含自動復位）

    流程：
        1. Arduino reset() — 移動前復位，確保竿子歸位
        2. 手臂移動到 strike_point（Z=SAFE_Z=200）
        3. Arduino strike(force) — 擊球
        4. Arduino reset() — 擊球後復位

    參數：
        - strategy_output: strategy_output.py 的標準格式
          {
              "strike_point": {"x_mm": 300.0, "y_mm": 200.0},
              "force": 7,
              "cue_ball_pos": {"x_mm": 600.0, "y_mm": 315.0},
              ...
          }
        - hiwin_arm: hiwin_arm.py 的 HIWINArm 實例
        - arduino: arduino_serial.py 的 ArduinoController 實例

    回傳：執行結果 dict
        {
            "success": bool,
            "steps": [
                {"step": "pre_reset", "status": "ok", "time": 0.5},
                {"step": "move_to_strike", "status": "ok", "time": 1.2},
                {"step": "strike", "status": "ok", "time": 0.1},
                {"step": "post_reset", "status": "ok", "time": 0.8}
            ],
            "strike_point": {"x": 300.0, "y": 200.0, "z": 200},
            "force": 7,
            "error": ""  # 若有錯誤會說明
        }
    """
    result = {
        "success": False,
        "steps": [],
        "strike_point": None,
        "force": None,
        "error": ""
    }

    # ── 驗證輸入 ────────────────────────────────────────────────
    try:
        from interfaces.strategy_output import validate_strategy_output
        validate_strategy_output(strategy_output)
    except ValueError as e:
        logger.error(f"strategy_output 驗證失敗: {e}")
        result["error"] = f"Validation error: {e}"
        return result

    strike_point = strategy_output["strike_point"]
    force = int(strategy_output["force"])

    # 驗證力道範圍
    if not (FORCE_MIN <= force <= FORCE_MAX):
        logger.error(f"力道 {force} 超出範圍 ({FORCE_MIN}-{FORCE_MAX})")
        result["error"] = f"Force {force} out of range ({FORCE_MIN}-{FORCE_MAX})"
        return result

    logger.info(f"=== 開始擊球時序 ===")
    logger.info(f"  擊球點: x={strike_point['x_mm']}, y={strike_point['y_mm']}")
    logger.info(f"  力道: {force}")

    # ── Step 1: 移動前復位 ─────────────────────────────────────
    step_start = time.time()
    try:
        logger.info("[Step 1/4] 移動前復位 (Arduino reset)")
        reset_result = arduino.reset(timeout=5.0)
        step_time = time.time() - step_start

        if not reset_result["complete"]:
            logger.warning(f"  復位未完成: {reset_result['error']}")

        result["steps"].append({
            "step": "pre_reset",
            "status": "ok" if reset_result["sent"] else "fail",
            "time": round(step_time, 3),
            "detail": reset_result
        })
    except Exception as e:
        logger.error(f"  復位失敗: {e}")
        result["steps"].append({
            "step": "pre_reset",
            "status": "error",
            "time": time.time() - step_start,
            "detail": str(e)
        })
        result["error"] = f"Pre-reset error: {e}"
        return result

    # ── Step 2: 安全移動到擊球點 ─────────────────────────────
    step_start = time.time()
    try:
        logger.info("[Step 2/4] 安全移動到擊球點")
        move_result = safe_move_to_strike(strike_point, hiwin_arm, safe_z=SAFE_Z)
        step_time = time.time() - step_start

        if not move_result["success"]:
            logger.error(f"  移動失敗: {move_result['error']}")
            result["steps"].append({
                "step": "move_to_strike",
                "status": "fail",
                "time": round(step_time, 3),
                "detail": move_result["error"]
            })
            result["error"] = f"Move error: {move_result['error']}"
            return result

        logger.info(f"  移動成功: {move_result['position']}")
        result["steps"].append({
            "step": "move_to_strike",
            "status": "ok",
            "time": round(step_time, 3),
            "detail": move_result["position"]
        })
        result["strike_point"] = move_result["position"]
    except Exception as e:
        logger.error(f"  移動例外: {e}")
        result["steps"].append({
            "step": "move_to_strike",
            "status": "error",
            "time": time.time() - step_start,
            "detail": str(e)
        })
        result["error"] = f"Move exception: {e}"
        return result

    # ── Step 3: 擊球 ─────────────────────────────────────────
    step_start = time.time()
    try:
        logger.info(f"[Step 3/4] 擊球 (force={force})")
        strike_params = FORCE_LEVELS.get(force, {})
        hold_time = strike_params.get("hold_time", 0.3)

        # 擊球前短暫等待穩定
        time.sleep(0.05)

        strike_result = arduino.trigger_strike(force)
        step_time = time.time() - step_start

        if not strike_result["sent"]:
            logger.error(f"  擊球發送失敗: {strike_result['error']}")
            result["steps"].append({
                "step": "strike",
                "status": "fail",
                "time": round(step_time, 3),
                "detail": strike_result["error"]
            })
            result["error"] = f"Strike send error: {strike_result['error']}"
            return result

        logger.info(f"  擊球完成 (actual_velocity={strike_params.get('velocity', '?')} m/s)")
        result["steps"].append({
            "step": "strike",
            "status": "ok",
            "time": round(step_time, 3),
            "detail": {
                "force": force,
                "velocity": strike_params.get("velocity"),
                "pullback": strike_params.get("pullback")
            }
        })
        result["force"] = force
    except Exception as e:
        logger.error(f"  擊球例外: {e}")
        result["steps"].append({
            "step": "strike",
            "status": "error",
            "time": time.time() - step_start,
            "detail": str(e)
        })
        result["error"] = f"Strike exception: {e}"
        return result

    # ── Step 4: 擊球後復位 ────────────────────────────────────
    step_start = time.time()
    try:
        logger.info("[Step 4/4] 擊球後復位 (Arduino reset)")
        post_reset = arduino.reset(timeout=5.0)
        step_time = time.time() - step_start

        if not post_reset["complete"]:
            logger.warning(f"  擊球後復位未完成: {post_reset['error']}")

        result["steps"].append({
            "step": "post_reset",
            "status": "ok" if post_reset["sent"] else "fail",
            "time": round(step_time, 3),
            "detail": post_reset
        })
    except Exception as e:
        logger.error(f"  擊球後復位失敗: {e}")
        result["steps"].append({
            "step": "post_reset",
            "status": "error",
            "time": time.time() - step_start,
            "detail": str(e)
        })
        # 不當作失敗，畢竟擊球已完成

    # ── 完成 ─────────────────────────────────────────────────
    result["success"] = True
    logger.info("=== 擊球時序完成 ===")
    return result


def safe_move_to_strike(
    strike_point: Dict[str, float],
    hiwin_arm,
    safe_z: float = SAFE_Z
) -> Dict[str, Any]:
    """
    安全移動到擊球點（Z 先保持在 SAFE_Z）

    移動策略：
        1. 先將手臂移到 (x, y, safe_z) — 懸停在安全高度
        2. 再下降至 strike_point 的 Z（若需要低於 safe_z）
        3. 確保 Z 不低於 Z_MIN，不高於 Z_MAX

    參數：
        strike_point: {"x_mm": float, "y_mm": float} — 擊球點座標
        hiwin_arm: HIWINArm 實例
        safe_z: 安全高度（預設 200mm）

    回傳：
        dict: {
            "success": bool,
            "position": {"x":, "y":, "z":, ...},
            "error": str
        }
    """
    x = float(strike_point["x_mm"])
    y = float(strike_point["y_mm"])

    # 預設擊球 Z（可從 strike_point 的 z_mm 取得，若無則用 safe_z）
    target_z = strike_point.get("z_mm", safe_z)

    # Z 軸軟限制
    if target_z < Z_MIN:
        logger.warning(f"目標 Z={target_z} 低於 Z_MIN={Z_MIN}，調整為 {Z_MIN}")
        target_z = Z_MIN
    if target_z > Z_MAX:
        logger.warning(f"目標 Z={target_z} 高於 Z_MAX={Z_MAX}，調整為 {Z_MAX}")
        target_z = Z_MAX

    # 驗證手臂連線
    if not hiwin_arm.connected:
        return {
            "success": False,
            "position": {},
            "error": "HIWIN arm not connected"
        }

    try:
        # Step 1: 懸停到安全高度
        logger.info(f"  移動到懸停位置: x={x}, y={y}, z={safe_z}")
        hover_pos = {
            "x": x, "y": y, "z": safe_z,
            "a": 0.0, "b": 0.0, "c": 0.0
        }

        # 若目標 Z 低於 safe_z，需要先到懸停點再下降
        if target_z < safe_z:
            result = hiwin_arm.lin(
                x=x, y=y, z=safe_z,
                a=0.0, b=0.0, c=0.0,
                vel_pct=SAFE_VELOCITY, acc_pct=50
            )
            if not result["success"]:
                return {"success": False, "position": {}, "error": f"Hover move failed: {result['error']}"}

            # Step 2: 下降到擊球高度
            logger.info(f"  下降到擊球高度: z={target_z}")
            result = hiwin_arm.lin(
                x=x, y=y, z=target_z,
                a=0.0, b=0.0, c=0.0,
                vel_pct=SAFE_VELOCITY, acc_pct=50
            )
            if not result["success"]:
                return {"success": False, "position": {}, "error": f"Descend move failed: {result['error']}"}

        else:
            # 目標 Z >= safe_z，直接移動
            result = hiwin_arm.lin(
                x=x, y=y, z=target_z,
                a=0.0, b=0.0, c=0.0,
                vel_pct=SAFE_VELOCITY, acc_pct=50
            )
            if not result["success"]:
                return {"success": False, "position": {}, "error": f"Direct move failed: {result['error']}"}

        final_pos = {
            "x": x, "y": y, "z": target_z,
            "a": 0.0, "b": 0.0, "c": 0.0
        }
        return {
            "success": True,
            "position": final_pos,
            "error": ""
        }

    except Exception as e:
        logger.error(f"  safe_move_to_strike 例外: {e}")
        return {
            "success": False,
            "position": {},
            "error": f"Exception: {e}"
        }


def safe_return_to_home(
    hiwin_arm,
    home_pos: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    安全返回起始位置

    返回策略：
        1. 先上升到 SAFE_Z 高度（避免撞到障礙物）
        2. 再水平移動到 home_pos
        3. 若無 home_pos，使用預設值 DEFAULT_HOME_POS

    參數：
        hiwin_arm: HIWINArm 實例
        home_pos: 起始位置 dict，若為 None 則使用 DEFAULT_HOME_POS
            {"x": float, "y": float, "z": float, "a": float, "b": float, "c": float}

    回傳：
        dict: {
            "success": bool,
            "position": {...},
            "error": str
        }
    """
    if home_pos is None:
        home_pos = DEFAULT_HOME_POS

    if not hiwin_arm.connected:
        return {
            "success": False,
            "position": {},
            "error": "HIWIN arm not connected"
        }

    try:
        # 讀取目前位置
        current = hiwin_arm.get_position()
        current_z = current.get("z", SAFE_Z)

        logger.info(f"返回起始位置: {home_pos}")

        # 若目前 Z 低於 SAFE_Z，先上升
        if current_z < SAFE_Z:
            logger.info(f"  先上升到 SAFE_Z={SAFE_Z}")
            result = hiwin_arm.lin(
                x=current["x"], y=current["y"], z=SAFE_Z,
                a=current.get("a", 0), b=current.get("b", 0), c=current.get("c", 0),
                vel_pct=SAFE_VELOCITY, acc_pct=50
            )
            if not result["success"]:
                return {"success": False, "position": {}, "error": f"Rise failed: {result['error']}"}

        # 水平移動到 home 的 X, Y（保持 SAFE_Z）
        logger.info(f"  水平移動到 home: x={home_pos['x']}, y={home_pos['y']}")
        result = hiwin_arm.lin(
            x=home_pos["x"], y=home_pos["y"], z=SAFE_Z,
            a=home_pos.get("a", 0), b=home_pos.get("b", 0), c=home_pos.get("c", 0),
            vel_pct=SAFE_VELOCITY, acc_pct=50
        )
        if not result["success"]:
            return {"success": False, "position": {}, "error": f"Horizontal move failed: {result['error']}"}

        # 下降到 home Z（若高於 SAFE_Z）
        home_z = home_pos.get("z", SAFE_Z)
        if home_z > SAFE_Z:
            logger.info(f"  下降到 home Z={home_z}")
            result = hiwin_arm.lin(
                x=home_pos["x"], y=home_pos["y"], z=home_z,
                a=home_pos.get("a", 0), b=home_pos.get("b", 0), c=home_pos.get("c", 0),
                vel_pct=SAFE_VELOCITY, acc_pct=50
            )
            if not result["success"]:
                return {"success": False, "position": {}, "error": f"Descend to home failed: {result['error']}"}

        logger.info("  返回起始位置完成")
        return {
            "success": True,
            "position": home_pos,
            "error": ""
        }

    except Exception as e:
        logger.error(f"  safe_return_to_home 例外: {e}")
        return {
            "success": False,
            "position": {},
            "error": f"Exception: {e}"
        }


# 測試用的主程序
if __name__ == "__main__":
    print("=== Motion Executor 測試 ===")
    print(f"SAFE_Z={SAFE_Z}, Z_MIN={Z_MIN}, Z_MAX={Z_MAX}")
    print(f"Force range: {FORCE_MIN}-{FORCE_MAX}")
    print(f"Default home: {DEFAULT_HOME_POS}")

    # 驗證力道範圍
    print("\n力道等級驗證:")
    for f in [0, 1, 7, 12, 13]:
        status = "✓" if FORCE_MIN <= f <= FORCE_MAX else "✗"
        print(f"  force={f} {status}")