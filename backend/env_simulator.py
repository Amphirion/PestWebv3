# -*- coding: utf-8 -*-
"""
环境数据模拟器 —— 温/湿/光/土壤
后台线程每 interval 秒写入一条数据，供前端实时刷新。
（接入真实传感器时，替换 _sample() 即可）
"""
import math
import random
import threading
import time
from datetime import datetime

from backend import database


class EnvSimulator:
    def __init__(self):
        self._thread = None
        self._stop = threading.Event()
        self.running = False
        self._last_hour = None

    def start(self, interval=None):
        if self.running:
            return
        cfg = database.get_settings()
        try:
            self._interval = float(interval or cfg.get('interval', 5))
        except Exception:
            self._interval = 5
        self._stop.clear()
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        self.running = False

    def _loop(self):
        while not self._stop.is_set():
            try:
                t, hum, light, soil = self._sample()
                database.add_env_data(t, hum, light, soil)
            except Exception:
                pass
            # 支持动态调整间隔
            cfg = database.get_settings()
            try:
                self._interval = float(cfg.get('interval', 5))
            except Exception:
                pass
            self._stop.wait(self._interval)

    def _sample(self):
        """模拟一组环境数据（接入真实传感器时替换此方法）。"""
        now = datetime.now()
        hour = now.hour + now.minute / 60.0
        # 温度：昼高夜低 + 随机扰动
        temp = 26 + 5.5 * math.sin((hour - 7) / 24 * 2 * math.pi) + random.uniform(-0.8, 0.8)
        # 湿度：与温度大致反向
        hum = 78 - 16 * math.sin((hour - 7) / 24 * 2 * math.pi) + random.uniform(-3, 3)
        hum = min(100, max(10, hum))
        # 光照：日出日落
        light = 0.0
        if 6 <= hour <= 18.5:
            light = 55000 * math.sin((hour - 6) / 12.5 * math.pi) + random.uniform(-4000, 4000)
        light = max(0, light)
        # 土壤墒情：缓慢漂移
        soil = 45 + 4 * math.sin(now.timestamp() / 3600 / 6) + random.uniform(-2, 2)
        soil = min(90, max(8, soil))
        return round(max(0, temp), 1), round(hum, 1), round(light, 0), round(soil, 1)


_simulator = EnvSimulator()


def get_simulator():
    return _simulator
