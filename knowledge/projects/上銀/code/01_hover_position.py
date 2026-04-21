"""
上銀撞球 - 手臂定點懸停模擬
===================================
目標：將手臂移動到球上方15cm的定點位置
概念：先完成水平定位，預留純垂直下移空間給最後一軸

手臂：HIWIN RA605-710-GC
控制器：RCA605-GC2
"""

import math
from dataclasses import dataclass
from typing import Tuple, Optional

# ============================================================
# 1. 球檯與座標系設定
# ============================================================

@dataclass
class TableConfig:
    """球檯配置"""
    # 球檯尺寸 (mm) - 標準9號球檯
    width: float = 1200      # 長邊 X
    height: float = 630       # 短邊 Y
    
    # 手臂安裝位置 (球檯外的相對座標)
    # 假設手臂安裝在球檯短邊外側
    arm_mount_x: float = 600  # 手臂X軸對齊球檯中央
    arm_mount_y: float = -200 # 手臂在球檯前端外側 (負值 = 球檯外)
    arm_mount_z: float = 400  # 手臂法蘭高度 (相對於球檯面)
    
    # 安全高度
    safe_height: float = 150  # 懸停高度 (球上方15cm)
    min_clearance: float = 50 # 最小間隙
    
    def __post_init__(self):
        print(f"[球檯設定]")
        print(f"  尺寸: {self.width}mm × {self.height}mm")
        print(f"  手臂安裝位置: ({self.arm_mount_x}, {self.arm_mount_y}, {self.arm_mount_z})")
        print(f"  懸停高度: {self.safe_height}mm (球上方{self.safe_height/10}cm)")
        print()


@dataclass
class CueConfig:
    """球桿設定"""
    length: float = 250       # 桿長 25cm
    tip_to_flange: float = 50 # 機構從法蘭到桿尖的額外長度 (預估)
    
    @property
    def total_reach(self) -> float:
        """總伸出長度 = 桿長 + 機構"""
        return self.length + self.tip_to_flange
    
    def __post_init__(self):
        print(f"[球桿設定]")
        print(f"  桿長: {self.length}mm ({self.length/10}cm)")
        print(f"  機構延伸: {self.tip_to_flange}mm")
        print(f"  總伸出: {self.total_reach}mm ({self.total_reach/10}cm)")
        print()


# ============================================================
# 2. 手臂姿態計算
# ============================================================

@dataclass
class CartesianPosition:
    """笛卡爾座標位置"""
    x: float  # mm
    y: float  # mm
    z: float  # mm
    a: float  # 度 (繞X軸翻滾)
    b: float  # 度 (繞Y軸俯仰)
    c: float  # 度 (繞Z軸偏擺)
    
    def __str__(self):
        return f"X:{self.x:.1f} Y:{self.y:.1f} Z:{self.z:.1f} A:{self.a:.1f} B:{self.b:.1f} C:{self.c:.1f}"


@dataclass
class JointAngles:
    """關節角度 (度)"""
    a1: float  # 軸1
    a2: float  # 軸2
    a3: float  # 軸3
    a4: float  # 軸4
    a5: float  # 軸5
    a6: float  # 軸6 (末端旋轉)
    
    def __str__(self):
        return f"A1:{self.a1:.2f}° A2:{self.a2:.2f}° A3:{self.a3:.2f}° A4:{self.a4:.2f}° A5:{self.a5:.2f}° A6:{self.a6:.2f}°"


class ArmSimulator:
    """
    手臂位置模擬器
    
    概念：
    1. 手臂移動到球上方15cm的定點
    2. 此時球桿尖端應該對準球的擊球點
    3. 最後只需要用軸6下移 + 擊球
    """
    
    def __init__(self, table: TableConfig, cue: CueConfig):
        self.table = table
        self.cue = cue
        self.current_pos: Optional[CartesianPosition] = None
        self.current_joints: Optional[JointAngles] = None
        
    def calculate_hover_position(self, target_x: float, target_y: float) -> CartesianPosition:
        """
        計算懸停位置
        
        輸入：目標球的X,Y座標 (球檯座標)
        輸出：手臂法蘭應該達到的位置
        
        幾何關係：
        - 手臂法蘭到桿尖的距離 = 桿長 + 機構延伸
        - 懸停時，桿尖在球上方15cm
        - 所以手臂法蘭在球上方 (15cm + 桿長)
        """
        # 球上方需要的高度 = 安全高度 + 機構長度
        # 這樣桿尖就會在球上方15cm
        hover_z = self.table.arm_mount_z - self.table.safe_height - self.cue.total_reach
        
        # 手臂法蘭的X,Y位置需要考慮偏移
        # 假設桿是水平伸出，則手臂需要向後偏移
        # 這裡我們簡化處理，專注於Z軸垂直定位
        
        pos = CartesianPosition(
            x=target_x,
            y=target_y,
            z=hover_z,
            a=0,   # 姿態暫設為0，實際需要根據擊球方向調整
            b=0,
            c=0
        )
        
        self.current_pos = pos
        return pos
    
    def calculate_approach_with_angle(self, target_x: float, target_y: float, 
                                       shot_angle: float) -> Tuple[CartesianPosition, JointAngles]:
        """
        計算帶擊球角度的懸停位置
        
        輸入：
        - target_x, target_y: 目標球位置
        - shot_angle: 擊球方向 (度，相對於球檯X軸)
        
        輸出：
        - 手臂法蘭位置
        - 建議的關節角度
        """
        # 桿長
        L = self.cue.total_reach
        
        # 懸停時桿尖位置 = 球心位置 + Z軸偏移
        cue_tip_z = self.table.arm_mount_z - self.table.safe_height
        cue_tip_x = target_x
        cue_tip_y = target_y
        
        # 手臂法蘭位置 (桿是斜的，不是垂直的)
        # 這裡需要根據擊球角度計算
        # 假設桿與水平面夾角為 θ，則：
        
        # 計算手臂法蘭到桿尖的向量
        # 桿與Z軸的夾角 (90度 = 垂直)
        pole_angle_from_vertical = 45  # 假設桿傾斜45度
        
        # 計算桿在XY平面的投影角度 = 擊球方向 + 180度 (桿在球後方)
        projection_angle = math.radians(shot_angle + 180)
        
        # 桿與垂直線的夾角
        pole_tilt = math.radians(pole_angle_from_vertical)
        
        # 法蘭位置 = 桿尖位置 - 桿向量
        flange_x = cue_tip_x - L * math.sin(pole_tilt) * math.cos(projection_angle)
        flange_y = cue_tip_y - L * math.sin(pole_tilt) * math.sin(projection_angle)
        flange_z = cue_tip_z - L * math.cos(pole_tilt)
        
        pole_tilt_deg = math.degrees(pole_tilt)
        
        pos = CartesianPosition(
            x=flange_x,
            y=flange_y,
            z=flange_z,
            a=0,
            b=-math.degrees(pole_tilt),  # 桿向前傾
            c=shot_angle       # C軸對準擊球方向
        )
        
        # 估算關節角度 (需要根據實際手臂幾何學調整)
        # 這裡是簡化估算
        pole_tilt_deg = math.degrees(pole_tilt)
        joints = JointAngles(
            a1=shot_angle,           # 軸1旋轉對準擊球方向
            a2=90 - pole_tilt_deg,   # 軸2控制桿的俯仰
            a3=-pole_tilt_deg,       # 軸3輔助姿態
            a4=0,                    # 軸4
            a5=0,                    # 軸5
            a6=0                     # 軸6預留給擊球動作
        )
        
        self.current_pos = pos
        self.current_joints = joints
        
        return pos, joints
    
    def plan_strike_sequence(self, target_x: float, target_y: float, 
                              shot_angle: float) -> list:
        """
        規劃擊球序列
        
        概念：將動作分解為可獨立執行的步驟
        """
        pos, joints = self.calculate_approach_with_angle(
            target_x, target_y, shot_angle
        )
        
        sequence = [
            {
                "step": 1,
                "name": "移動到懸停點",
                "type": "LIN",
                "position": pos,
                "speed": 500,  # mm/s
                "description": f"手臂移動到 ({pos.x:.0f}, {pos.y:.0f}, {pos.z:.0f})"
            },
            {
                "step": 2,
                "name": "確認姿態",
                "type": "PTP",
                "joints": joints,
                "speed": 50,  # %
                "description": f"調整角度 A1={joints.a1:.1f}° 對準擊球方向"
            },
            {
                "step": 3,
                "name": "最後微調 (軸6)",
                "type": "PTP_REL",
                "axis": 6,
                "delta": 5,  # 度
                "speed": 10,
                "description": "用軸6微調到擊球位置"
            },
            {
                "step": 4,
                "name": "擊球準備",
                "type": "LIN_REL",
                "z_delta": -30,  # 再下移3cm
                "speed": 50,
                "description": "桿尖接近球面"
            },
            {
                "step": 5,
                "name": "擊球",
                "type": "PTP_REL",
                "axis": 6,
                "delta": 15,  # 快速撞擊
                "speed": 100,
                "description": "軸6快速動作完成擊球"
            },
            {
                "step": 6,
                "name": "回歸懸停",
                "type": "PTP_REL",
                "axis": 6,
                "delta": -15,
                "speed": 50,
                "description": "回到懸停位置"
            }
        ]
        
        return sequence


# ============================================================
# 3. 主程式：測試
# ============================================================

def main():
    print("=" * 60)
    print("上銀撞球 - 手臂懸停位置計算")
    print("=" * 60)
    print()
    
    # 初始化設定
    table = TableConfig()
    cue = CueConfig()
    
    # 建立模擬器
    arm = ArmSimulator(table, cue)
    
    print("-" * 60)
    print("測試案例 1：球在球檯中央")
    print("-" * 60)
    
    # 假設白球在球檯中央
    ball_x, ball_y = 600, 315  # 球檯中央
    shot_angle = 0  # 向+X方向擊球
    
    pos, joints = arm.calculate_approach_with_angle(ball_x, ball_y, shot_angle)
    print(f"球位置: ({ball_x}, {ball_y})")
    print(f"擊球角度: {shot_angle}°")
    print()
    print(f"手臂法蘭位置:")
    print(f"  {pos}")
    print()
    print(f"建議關節角度:")
    print(f"  {joints}")
    print()
    
    # 規劃擊球序列
    sequence = arm.plan_strike_sequence(ball_x, ball_y, shot_angle)
    
    print("-" * 60)
    print("擊球序列")
    print("-" * 60)
    for step in sequence:
        print(f"\n[步驟 {step['step']}] {step['name']}")
        print(f"  指令類型: {step['type']}")
        print(f"  {step['description']}")
    
    print()
    print("=" * 60)
    print("測試完成")
    print("=" * 60)
    
    # 輸出可以用於手臂控制器的格式
    print()
    print("-" * 60)
    print("手臂程式範例 (HRSS 語法)")
    print("-" * 60)
    print(f"""
// 移動到懸停點
E6POS HOVER_POS = {{X {pos.x:.1f}, Y {pos.y:.1f}, Z {pos.z:.1f}, C {pos.c:.1f}}}
LIN HOVER_POS Vel=500mm/s Acc=80% TOOL[0] BASE[0]

// 確認擊球角度
PTP {{A1 {joints.a1:.1f}, A2 {joints.a2:.1f}, A3 {joints.a3:.1f}}} Vel=50% Acc=50%

// 擊球準備 - 軸6微調
PTP_REL {{A6 5}} Vel=10% Acc=30%

// 擊球
PTP_REL {{A6 15}} Vel=100% Acc=100%

// 回歸
PTP_REL {{A6 -15}} Vel=50% Acc=50%
    """)


if __name__ == "__main__":
    main()
