#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy, roslaunch, os, time
from enum import Enum
from std_msgs.msg import UInt8
from threading import Timer

class CoreNodeController():
    def __init__(self):
        self.ros_package_path = os.path.dirname(os.path.realpath(__file__))
        self.ros_package_path = self.ros_package_path.replace('core/nodes', '')

        # ========== State Machine ==========
        # Mission enum (依照比賽順序)
        self.Mission = Enum('Mission', '''
            Idle
            TrafficLight
            S_Curve         # 圓環，S曲線
            Construction     # 施工區/障礙
            Parking         # 定點停車入庫
            M_Curve         # M型狹窄彎道（dl+cl循線通過）
            LevelCrossing    # 平交道
            Tunnel          # 隧道
            Finish          # 終點
        ''')

        # 各狀態的超時秒數（防止節點卡死時強制進下一關）
        self.TIMEOUT = {
            self.Mission.TrafficLight.value:    8.0,   # 賭綠燈，失敗就失敗
            self.Mission.S_Curve.value:        30.0,
            self.Mission.Construction.value:   30.0,
            self.Mission.Parking.value:        30.0,
            self.Mission.M_Curve.value:        30.0,
            self.Mission.LevelCrossing.value:  30.0,
            self.Mission.Tunnel.value:         30.0,
        }

        # Subscriber
        self.sub_mission = rospy.Subscriber('/mission', UInt8, self.cbReceiveMode, queue_size=1)

        # ========== Launcher enum ==========
        self.Launcher = Enum('Launcher', 'dl cl tf isc ct pk mv lcro tun')

        # 追蹤各節點是否已啟動
        self.launchers = {
            'dl':    {'active': False, 'handle': None},
            'cl':    {'active': False, 'handle': None},
            'tf':    {'active': False, 'handle': None},
            'isc':   {'active': False, 'handle': None},
            'ct':    {'active': False, 'handle': None},
            'pk':    {'active': False, 'handle': None},
            'mv':    {'active': False, 'handle': None},
            'lcro':  {'active': False, 'handle': None},
            'tun':   {'active': False, 'handle': None},
        }

        self.uuid = roslaunch.rlutil.get_or_generate_uuid(None, False)

        self.current_mode = self.Mission.Idle.value
        self.is_triggered = False
        self.timer = None  # 超時計時器

        loop_rate = rospy.Rate(10)  # 10hz

        while not rospy.is_shutdown():
            if self.is_triggered:
                self.fnControlNode()
            loop_rate.sleep()

    # ========== Mission 接收 callback ==========
    def cbReceiveMode(self, mode_msg):
        rospy.loginfo("[Controller] 收到 /mission = %d", mode_msg.data)
        self.current_mode = mode_msg.data
        self.is_triggered = True

    # ========== 狀態機主體 ==========
    def fnControlNode(self):
        mode = self.current_mode
        rospy.loginfo("[Controller] 進入狀態: %s (%d)", self.Mission(mode).name, mode)

        # 每次進入新狀態，先取消舊計時器
        self._cancel_timer()

        if mode == self.Mission.TrafficLight.value:
            self._enter_traffic_light()

        elif mode == self.Mission.S_Curve.value:
            self._enter_s_curve()

        elif mode == self.Mission.Construction.value:
            self._enter_construction()

        elif mode == self.Mission.Parking.value:
            self._enter_parking()

        elif mode == self.Mission.M_Curve.value:
            self._enter_m_curve()

        elif mode == self.Mission.LevelCrossing.value:
            self._enter_level_crossing()

        elif mode == self.Mission.Tunnel.value:
            self._enter_tunnel()

        elif mode == self.Mission.Finish.value:
            self._enter_finish()

        else:
            rospy.logwarn("[Controller] 未知狀態: %d", mode)

        self.is_triggered = False

    # --------------------------------------------------
    # 狀態進入函式（每個狀態一個乾淨的函式）
    # --------------------------------------------------

    def _enter_traffic_light(self):
        """第一關：紅綠燈"""
        # 紅綠燈只有這關需要
        self._launch(self.Launcher.tf, True)
        self._set_timer(self.Mission.TrafficLight.value)

    def _enter_s_curve(self):
        """S曲線（圓環）：同時開啟循線 + 岔路偵測"""
        # 關閉紅綠燈（如果還沒關）
        self._launch(self.Launcher.tf, False)
        # 開啟循線
        self._launch(self.Launcher.dl, True)
        self._launch(self.Launcher.cl, True)
        # 開啟岔路辨識（圓環出口判斷用）
        self._launch(self.Launcher.isc, True)
        self._set_timer(self.Mission.S_Curve.value)

    def _enter_construction(self):
        """施工區：關閉岔路，開啟障礙偵測 + 循線"""
        self._launch(self.Launcher.isc, False)
        # dl, cl 持續（循線通過 M曲線時也用到）
        self._launch(self.Launcher.dl, True)
        self._launch(self.Launcher.cl, True)
        # 障礙偵測
        self._launch(self.Launcher.ct, True)
        self._set_timer(self.Mission.Construction.value)

    def _enter_parking(self):
        """停車區：定點停車入庫"""
        self._launch(self.Launcher.ct, False)
        self._launch(self.Launcher.dl, True)
        self._launch(self.Launcher.cl, True)
        self._launch(self.Launcher.pk, True)
        self._set_timer(self.Mission.Parking.value)

    def _enter_m_curve(self):
        """M型狹窄彎道：關閉停車，dl+cl循線通過"""
        self._launch(self.Launcher.pk, False)
        self._launch(self.Launcher.dl, True)
        self._launch(self.Launcher.cl, True)
        self._set_timer(self.Mission.M_Curve.value)

    def _enter_level_crossing(self):
        """平交道：關閉停車偵測，開啟循線 + 平交道偵測，等待柵欄"""
        self._launch(self.Launcher.pk, False)
        self._launch(self.Launcher.dl, True)
        self._launch(self.Launcher.cl, True)
        self._launch(self.Launcher.lcro, True)
        self._set_timer(self.Mission.LevelCrossing.value)

    def _enter_tunnel(self):
        """隧道：關閉平交道，開啟循線，進入隧道後開啟隧道偵測"""
        self._launch(self.Launcher.lcro, False)
        self._launch(self.Launcher.dl, True)
        self._launch(self.Launcher.cl, True)
        # 隧道偵測（光補償失效時接手）
        self._launch(self.Launcher.tun, True)
        self._set_timer(self.Mission.Tunnel.value)

    def _enter_finish(self):
        """終點：關閉所有偵測節點，停車"""
        rospy.loginfo("[Controller] ===== 比賽完成 =====")
        self._shutdown_all()
        self._launch(self.Launcher.mv, False)

    # --------------------------------------------------
    # 底層工具
    # --------------------------------------------------

    def _launch(self, launcher_enum, is_start):
        """統一的 launch/shutdown 介面"""
        key = launcher_enum.name.lower()  # 'tf', 'dl', ...

        if is_start:
            if not self.launchers[key]['active']:
                launch_file = self._get_launch_file(launcher_enum)
                if launch_file is None:
                    rospy.logwarn("[Controller] %s 沒有對應 launch 檔", key)
                    return
                handle = roslaunch.scriptapi.ROSLaunch()
                handle = roslaunch.parent.ROSLaunchParent(
                    self.uuid,
                    [self.ros_package_path + launch_file]
                )
                handle.start()
                self.launchers[key]['handle'] = handle
                self.launchers[key]['active'] = True
                rospy.loginfo("[Controller] 啟動 %s", key)
            else:
                pass  # 已啟動
        else:
            if self.launchers[key]['active']:
                self.launchers[key]['handle'].shutdown()
                self.launchers[key]['handle'] = None
                self.launchers[key]['active'] = False
                rospy.loginfo("[Controller] 關閉 %s", key)
            else:
                pass  # 已關閉

    def _get_launch_file(self, launcher_enum):
        """launcher enum → launch 檔路徑"""
        mapping = {
            'dl':   'detect/launch/detect_lane.launch',
            'cl':   'control/launch/control_lane.launch',
            'tf':   'detect/launch/detect_traffic_light.launch',
            'isc':  'detect/launch/detect_intersection.launch',
            'ct':   'detect/launch/detect_construction.launch',
            'pk':   'detect/launch/detect_parking.launch',
            'mv':   'control/launch/control_moving.launch',
            'lcro': 'detect/launch/detect_level.launch',
            'tun':  'detect/launch/detect_tunnel.launch',
        }
        return mapping.get(launcher_enum.name.lower())

    def _set_timer(self, mission_value):
        """設定超時計時器（計時期滿強制進下一關）"""
        timeout = self.TIMEOUT.get(mission_value, 30.0)
        rospy.loginfo("[Controller] 超時保護：%.1f 秒後強制進下一關", timeout)
        self.timer = Timer(timeout, self._on_timeout, args=(mission_value,))
        self.timer.start()

    def _on_timeout(self, last_mission):
        """超時 callback：強制發下一關 mission"""
        rospy.logwarn("[Controller] ** 超時！狀態 %d 未結束，強制進下一關 **", last_mission)
        next_mission = last_mission + 1
        if next_mission <= self.Mission.Finish.value:
            self.current_mode = next_mission
            self.is_triggered = True
        else:
            self._shutdown_all()

    def _cancel_timer(self):
        """取消計時器"""
        if self.timer is not None and self.timer.is_alive():
            self.timer.cancel()
            self.timer = None

    def _shutdown_all(self):
        """關閉所有節點"""
        for key in self.launchers:
            self._launch(getattr(self.Launcher, key.upper()), False)

# --------------------------------------------------
if __name__ == '__main__':
    rospy.init_node('core_node_controller')
    node = CoreNodeController()
    rospy.spin()
