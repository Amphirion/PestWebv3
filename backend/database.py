# -*- coding: utf-8 -*-
"""
SQLite 数据库层 —— 建表 / 种子数据 / 查询封装
"""
import os
import json
import random
import sqlite3
from datetime import datetime, timedelta

import config
from config import ensure_dirs, DB_PATH
from backend.knowledge import KNOWLEDGE

# 防止多线程写库锁死：每次操作独立连接
_db_lock = __import__('threading').Lock()


def _conn():
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    return conn


def now_str():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


# ------------------------------------------------------------------ #
# 建表
# ------------------------------------------------------------------ #
SCHEMA = [
    """CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS detect_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        image_path TEXT,
        result_path TEXT,
        summary TEXT,
        severity TEXT,
        targets_json TEXT,
        created_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,
        title TEXT,
        content TEXT,
        advice TEXT,
        source TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        resolved_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS env_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temperature REAL,
        humidity REAL,
        light REAL,
        soil REAL,
        created_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_name TEXT UNIQUE,
        name_cn TEXT,
        crop TEXT,
        type TEXT,
        symptoms TEXT,
        cause TEXT,
        pattern TEXT,
        prevention TEXT,
        chemical TEXT,
        icon TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        detail TEXT,
        created_at TEXT
    )""",
]


def init_db():
    ensure_dirs()
    with _db_lock:
        conn = _conn()
        try:
            for sql in SCHEMA:
                conn.execute(sql)
            conn.commit()
        finally:
            conn.close()
    _seed_settings()
    _seed_knowledge()
    seed_demo_data()


# ------------------------------------------------------------------ #
# 设置项
# ------------------------------------------------------------------ #
DEFAULT_SETTINGS = {
    'conf': str(config.DEFAULT_CONF),
    'iou': str(config.DEFAULT_IOU),
    'imgsz': str(config.DEFAULT_IMGSZ),
    'station': config.DEFAULT_STATION,
    'interval': str(config.DEFAULT_INTERVAL),
    'demo_data': config.DEFAULT_DEMO_DATA,
    'env_temp_high': str(config.DEFAULT_ENV_RULES['temp_high']),
    'env_temp_low': str(config.DEFAULT_ENV_RULES['temp_low']),
    'env_hum_high': str(config.DEFAULT_ENV_RULES['hum_high']),
    'env_soil_low': str(config.DEFAULT_ENV_RULES['soil_low']),
    'env_light_low': str(config.DEFAULT_ENV_RULES['light_low']),
}


def _seed_settings():
    with _db_lock:
        conn = _conn()
        try:
            for k, v in DEFAULT_SETTINGS.items():
                conn.execute(
                    "INSERT OR IGNORE INTO settings(key, value) VALUES(?,?)", (k, v))
            conn.commit()
        finally:
            conn.close()


def get_settings():
    conn = _conn()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return {r['key']: r['value'] for r in rows}
    finally:
        conn.close()


def set_setting(key, value):
    with _db_lock:
        conn = _conn()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)", (key, str(value)))
            conn.commit()
        finally:
            conn.close()


def set_settings_many(mapping):
    with _db_lock:
        conn = _conn()
        try:
            for k, v in mapping.items():
                conn.execute(
                    "INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)", (k, str(v)))
            conn.commit()
        finally:
            conn.close()


# ------------------------------------------------------------------ #
# 知识库
# ------------------------------------------------------------------ #
def _seed_knowledge():
    with _db_lock:
        conn = _conn()
        try:
            for k in KNOWLEDGE:
                conn.execute(
                    """INSERT OR IGNORE INTO knowledge
                       (class_name, name_cn, crop, type, symptoms, cause,
                        pattern, prevention, chemical, icon)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (k['class_name'], k['name_cn'], k['crop'], k['type'],
                     k['symptoms'], k['cause'], k['pattern'],
                     k['prevention'], k['chemical'], k['icon']))
                # 已存在的行同步最新名称/内容（避免旧库残留旧命名）
                conn.execute(
                    """UPDATE knowledge SET name_cn=?, crop=?, type=?,
                       symptoms=?, cause=?, pattern=?, prevention=?,
                       chemical=?, icon=? WHERE class_name=?""",
                    (k['name_cn'], k['crop'], k['type'], k['symptoms'],
                     k['cause'], k['pattern'], k['prevention'],
                     k['chemical'], k['icon'], k['class_name']))
            conn.commit()
        finally:
            conn.close()


def list_knowledge():
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT * FROM knowledge ORDER BY id").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_knowledge_by_class(class_name):
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT * FROM knowledge WHERE class_name=?", (class_name,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


# ------------------------------------------------------------------ #
# 检测记录
# ------------------------------------------------------------------ #
def add_detect_record(filename, image_path, result_path, summary, severity, targets):
    with _db_lock:
        conn = _conn()
        try:
            cur = conn.execute(
                """INSERT INTO detect_records
                   (filename, image_path, result_path, summary, severity, targets_json, created_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (filename, image_path, result_path, summary, severity,
                 json.dumps(targets, ensure_ascii=False), now_str()))
            conn.commit()
            return cur.lastrowid
        finally:
            conn.close()


def list_detect_records(limit=50, offset=0):
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT * FROM detect_records ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset)).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            try:
                d['targets'] = json.loads(d.pop('targets_json'))
            except Exception:
                d['targets'] = []
            out.append(d)
        return out
    finally:
        conn.close()


def get_detect_record(rid):
    conn = _conn()
    try:
        r = conn.execute(
            "SELECT * FROM detect_records WHERE id=?", (rid,)).fetchone()
        if not r:
            return None
        d = dict(r)
        try:
            d['targets'] = json.loads(d.pop('targets_json'))
        except Exception:
            d['targets'] = []
        return d
    finally:
        conn.close()


def count_detect_records():
    conn = _conn()
    try:
        return conn.execute("SELECT COUNT(*) c FROM detect_records").fetchone()['c']
    finally:
        conn.close()


def count_detect_records_today():
    """统计今日（自然日 00:00 起）的检测记录数"""
    conn = _conn()
    try:
        return conn.execute(
            "SELECT COUNT(*) c FROM detect_records WHERE created_at >= ?",
            (datetime.now().strftime('%Y-%m-%d 00:00:00'),)).fetchone()['c']
    finally:
        conn.close()


# ------------------------------------------------------------------ #
# 预警
# ------------------------------------------------------------------ #
def add_warning(level, title, content, advice, source='engine'):
    with _db_lock:
        conn = _conn()
        try:
            cur = conn.execute(
                """INSERT INTO warnings(level, title, content, advice, source, status, created_at)
                   VALUES (?,?,?,?,?,'active',?)""",
                (level, title, content, advice, source, now_str()))
            conn.commit()
            return cur.lastrowid
        finally:
            conn.close()


def list_warnings(status=None, limit=200):
    conn = _conn()
    try:
        if status and status != 'all':
            rows = conn.execute(
                "SELECT * FROM warnings WHERE status=? ORDER BY id DESC LIMIT ?",
                (status, limit)).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM warnings ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def count_active_warnings():
    conn = _conn()
    try:
        return conn.execute(
            "SELECT COUNT(*) c FROM warnings WHERE status='active'").fetchone()['c']
    finally:
        conn.close()


def resolve_warning(wid):
    with _db_lock:
        conn = _conn()
        try:
            conn.execute(
                "UPDATE warnings SET status='resolved', resolved_at=? WHERE id=?",
                (now_str(), wid))
            conn.commit()
        finally:
            conn.close()


def undo_warning(wid):
    """撤销已处理预警，恢复为待处理状态"""
    with _db_lock:
        conn = _conn()
        try:
            conn.execute(
                "UPDATE warnings SET status='active', resolved_at=NULL WHERE id=?",
                (wid,))
            conn.commit()
        finally:
            conn.close()


# ------------------------------------------------------------------ #
# 环境数据
# ------------------------------------------------------------------ #
def add_env_data(temperature, humidity, light, soil):
    with _db_lock:
        conn = _conn()
        try:
            conn.execute(
                "INSERT INTO env_data(temperature, humidity, light, soil, created_at) "
                "VALUES (?,?,?,?,?)",
                (round(temperature, 1), round(humidity, 1),
                 round(light, 0), round(soil, 1), now_str()))
            # 只保留最近 ENV_HISTORY_KEEP 小时
            keep_from = (datetime.now() - timedelta(hours=config.ENV_HISTORY_KEEP)
                         ).strftime('%Y-%m-%d %H:%M:%S')
            conn.execute("DELETE FROM env_data WHERE created_at < ?", (keep_from,))
            conn.commit()
        finally:
            conn.close()


def get_latest_env():
    conn = _conn()
    try:
        r = conn.execute("SELECT * FROM env_data ORDER BY id DESC LIMIT 1").fetchone()
        return dict(r) if r else None
    finally:
        conn.close()


def get_env_history(hours=24):
    conn = _conn()
    try:
        since = (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%d %H:%M:%S')
        rows = conn.execute(
            "SELECT * FROM env_data WHERE created_at >= ? ORDER BY id ASC", (since,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ------------------------------------------------------------------ #
# 活动日志
# ------------------------------------------------------------------ #
def log_action(action, detail=''):
    with _db_lock:
        conn = _conn()
        try:
            conn.execute(
                "INSERT INTO activity_log(action, detail, created_at) VALUES(?,?,?)",
                (action, detail, now_str()))
            conn.commit()
        finally:
            conn.close()


def list_activity(limit=30):
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ------------------------------------------------------------------ #
# 演示数据（首次启动 / 手动重置时填充）
# ------------------------------------------------------------------ #
def seed_demo_data():
    """生成 7 天检测记录 + 历史环境数据 + 若干预警，让平台首次打开即有内容。
    仅在检测记录为空（首次启动）时填充，避免污染已有真实数据。"""
    with _db_lock:
        conn = _conn()
        try:
            has = conn.execute(
                "SELECT COUNT(*) c FROM detect_records").fetchone()['c'] > 0
            if not has:
                _fill_demo_records(conn)
                _fill_demo_env(conn)
                _fill_demo_warnings(conn)
            conn.commit()
        finally:
            conn.close()


def _fill_demo_records(conn):
    classes = list(config.CLASS_CN.keys())
    cn = config.CLASS_CN
    now = datetime.now()
    for i in range(60):
        t = now - timedelta(days=random.randint(0, 6),
                            hours=random.randint(0, 12),
                            minutes=random.randint(0, 59))
        cls = random.choice(classes)
        n = random.randint(1, 6)
        confs = [round(random.uniform(0.55, 0.95), 2) for _ in range(n)]
        targets = [{
            'class': cls,
            'name': cn[cls],
            'conf': confs[j],
            'x': round(random.uniform(0.05, 0.85), 3),
            'y': round(random.uniform(0.05, 0.85), 3),
            'w': round(random.uniform(0.08, 0.3), 3),
            'h': round(random.uniform(0.08, 0.3), 3),
        } for j in range(n)]
        summary = f"检测到 {n} 处{cn[cls]}"
        severity = '重度' if n >= 6 else ('中度' if n >= 4 else '轻度')
        conn.execute(
            """INSERT INTO detect_records
               (filename, image_path, result_path, summary, severity, targets_json, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (f"demo_{i}.jpg", '', '', summary, severity,
             json.dumps(targets, ensure_ascii=False), t.strftime('%Y-%m-%d %H:%M:%S')))


def _fill_demo_env(conn):
    """生成最近 24 小时环境数据（每 15 分钟一条）。"""
    now = datetime.now()
    base = now - timedelta(hours=24)
    for i in range(96):
        t = base + timedelta(minutes=15 * i)
        hour = t.hour
        # 温度：昼夜波动
        temp = 26 + 5 * math_sin((hour - 6) / 24 * 6.28) + random.uniform(-1.5, 1.5)
        # 湿度：与温度反向
        hum = 78 - 14 * math_sin((hour - 6) / 24 * 6.28) + random.uniform(-4, 4)
        # 光照：白天高夜晚低
        light = 0
        if 6 <= hour <= 18:
            light = 50000 * math_sin((hour - 6) / 12 * 3.14159) + random.uniform(-3000, 3000)
        light = max(0, light)
        # 土壤墒情：缓慢变化
        soil = 42 + random.uniform(-3, 3)
        conn.execute(
            "INSERT INTO env_data(temperature, humidity, light, soil, created_at) "
            "VALUES (?,?,?,?,?)",
            (round(max(0, temp), 1), round(min(100, max(0, hum)), 1),
             round(light, 0), round(max(5, min(95, soil)), 1),
             t.strftime('%Y-%m-%d %H:%M:%S')))


def _fill_demo_warnings(conn):
    levels = ['red', 'orange', 'yellow', 'blue']
    titles = {
        'red':    '水稻叶斑病风险等级高，需立即防治',
        'orange': '田间湿度偏高，谨防稻瘟病流行',
        'yellow': '土壤墒情偏低，建议及时补水',
        'blue':   '环境整体良好，请持续监测',
    }
    advices = {
        'red':    '立即组织喷施三环唑/稻瘟灵，7天后再防一次；同时降低田间湿度、控氮增钾。',
        'orange': '加强巡田频次，检查叶片病斑；可预防性用药，雨后及时排水降湿。',
        'yellow': '开启灌溉补水，早晚各查一次土壤湿度；结合叶面肥增强抗逆性。',
        'blue':   '维持当前管理，继续保持田间通风透光。',
    }
    now = datetime.now()
    for i in range(6):
        t = now - timedelta(days=random.randint(0, 5), hours=random.randint(1, 20))
        level = random.choice(levels)
        conn.execute(
            """INSERT INTO warnings(level, title, content, advice, source, status, created_at, resolved_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (level, titles[level], '由环境监测与历史检测数据综合研判生成。',
             advices[level], 'engine',
             'active' if i < 2 else 'resolved',
             t.strftime('%Y-%m-%d %H:%M:%S'),
             None if i < 2 else now.strftime('%Y-%m-%d %H:%M:%S')))


def reset_demo_data():
    """清空业务数据并重新生成演示数据。"""
    with _db_lock:
        conn = _conn()
        try:
            conn.execute("DELETE FROM detect_records")
            conn.execute("DELETE FROM warnings")
            conn.execute("DELETE FROM env_data")
            conn.commit()
            _fill_demo_records(conn)
            _fill_demo_env(conn)
            _fill_demo_warnings(conn)
            conn.commit()
        finally:
            conn.close()


def math_sin(x):
    import math
    return math.sin(x)
