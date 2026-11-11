# -*- coding: utf-8 -*-
"""
全局配置 —— 大田病虫害智能检测系统
"""
import os

# ------------------------------------------------------------------ #
# 路径
# ------------------------------------------------------------------ #
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'best.pt')

STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')     # 用户上传的原始图片
OUTPUT_DIR = os.path.join(BASE_DIR, 'outputs')     # 检测标注结果图
DATA_DIR   = os.path.join(BASE_DIR, 'data')        # 数据库目录
SAMPLE_DIR = os.path.join(STATIC_DIR, 'samples')   # 内置演示样本

DB_PATH = os.path.join(DATA_DIR, 'app.db')

# ------------------------------------------------------------------ #
# 模型类别 -> 中文名（与 best.pt 的 names 一致）
# ------------------------------------------------------------------ #
CLASS_CN = {
    'neck_blast':       '水稻细菌性条斑病（颈瘟）',
    'rice_leaf_blast':  '水稻叶斑病',
    'brown_spot':       '水稻棕色斑点',
    'corn_leaf_spot':   '玉米叶斑病',
    'corn_leaf_blight': '玉米叶枯病',
    'corn_rust':        '玉米叶锈病',
}

# 类别配色（用于前端标注框与图表，BGR->HEX 由前端自行转换）
CLASS_COLOR = {
    'neck_blast':       '#f43f5e',
    'rice_leaf_blast':  '#f97316',
    'brown_spot':       '#eab308',
    'corn_leaf_spot':   '#22c55e',
    'corn_leaf_blight': '#3b82f6',
    'corn_rust':        '#a855f7',
}
DEFAULT_CLASS_COLOR = '#38bdf8'

# ------------------------------------------------------------------ #
# 检测默认参数
# ------------------------------------------------------------------ #
DEFAULT_CONF   = 0.25   # 置信度阈值
DEFAULT_IOU    = 0.7    # NMS IoU（与 ultralytics 默认一致，避免相邻病斑被过度合并）
DEFAULT_IMGSZ  = 640    # 推理尺寸

# ------------------------------------------------------------------ #
# 环境预警默认阈值
# ------------------------------------------------------------------ #
DEFAULT_ENV_RULES = {
    'temp_high': 35.0,   # 温度过高
    'temp_low':  5.0,    # 温度过低
    'hum_high':  85.0,   # 湿度偏高（易诱发稻瘟病等）
    'soil_low':  20.0,   # 土壤墒情过低
    'light_low': 500.0,  # 光照过低
}

# ------------------------------------------------------------------ #
# 环境数据模拟器
# ------------------------------------------------------------------ #
DEFAULT_INTERVAL  = 5    # 每 5 秒生成一条环境数据
DEFAULT_STATION   = '智慧大田监测站 · 01'
ENV_HISTORY_KEEP  = 48   # 数据库最多保留 48 小时环境数据

# 演示数据开关（首次启动自动填充历史数据，方便演示）
DEFAULT_DEMO_DATA = 'true'

# 允许上传的格式
ALLOWED_IMAGE = {'png', 'jpg', 'jpeg', 'bmp', 'webp'}
ALLOWED_VIDEO = {'mp4', 'avi', 'mov', 'mkv'}


def ensure_dirs():
    for d in (UPLOAD_DIR, OUTPUT_DIR, DATA_DIR):
        os.makedirs(d, exist_ok=True)
