# -*- coding: utf-8 -*-
"""
大田病虫害智能检测系统 —— Flask 主应用
运行：python app.py   （默认 http://127.0.0.1:8000）
"""
import os
import io
import uuid
import json
from datetime import datetime, timedelta

from flask import (Flask, request, jsonify, send_from_directory,
                   render_template)

import config
from config import ensure_dirs
from backend import database
from backend.detector import get_detector
from backend.env_simulator import get_simulator
from backend.warning_engine import (evaluate_env, evaluate_detection,
                                    overall_risk, LEVEL_CN)

ensure_dirs()
database.init_db()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 256 * 1024 * 1024  # 256MB 上传上限

# 启动环境模拟器
_sim = get_simulator()
_sim.start()


# ------------------------------------------------------------------ #
# 页面
# ------------------------------------------------------------------ #
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/uploads/<path:fn>')
def uploads(fn):
    return send_from_directory(config.UPLOAD_DIR, fn)


@app.route('/outputs/<path:fn>')
def outputs(fn):
    return send_from_directory(config.OUTPUT_DIR, fn)


@app.route('/api/samples')
def api_samples():
    """内置演示样本列表（用于智能检测页一键测试）。"""
    samples = []
    if os.path.isdir(config.SAMPLE_DIR):
        exts = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.JPG', '.JPEG', '.PNG'}
        for fn in sorted(os.listdir(config.SAMPLE_DIR)):
            if os.path.splitext(fn)[1] in exts:
                name = fn.rsplit('_', 1)[0]
                samples.append({'name': name, 'url': f"/static/samples/{fn}"})
    return jsonify({'samples': samples})


# ------------------------------------------------------------------ #
# 系统健康
# ------------------------------------------------------------------ #
@app.route('/api/health')
def api_health():
    det = get_detector()
    det.is_ready()
    return jsonify({
        'status': 'ok',
        'model': det.model_info(),
        'time': database.now_str(),
    })


# ------------------------------------------------------------------ #
# 数据总览
# ------------------------------------------------------------------ #
@app.route('/api/overview')
def api_overview():
    det = get_detector()
    det.is_ready()
    records = database.list_detect_records(limit=8)
    env = database.get_latest_env()
    active = [w for w in database.list_warnings('active')]
    stats = {
        'total_detections': database.count_detect_records(),
        'today_detections': database.count_detect_records_today(),
        'total_targets': _count_targets(records_all=True),
        'active_warnings': len(active),
        'risk_score': overall_risk(env, active),
        'model': det.model_info(),
    }
    return jsonify({
        'stats': stats,
        'env': env,
        'env_history': database.get_env_history(24),
        'recent_records': records,
        'active_warnings': active[:6],
        'activity': database.list_activity(8),
    })


def _count_targets(records_all=False):
    records = database.list_detect_records(limit=2000)
    return sum(len(r.get('targets', [])) for r in records)


# ------------------------------------------------------------------ #
# 环境数据
# ------------------------------------------------------------------ #
@app.route('/api/env/latest')
def api_env_latest():
    env = database.get_latest_env()
    active = database.list_warnings('active')
    return jsonify({'env': env, 'active_warnings': len(active),
                    'risk_score': overall_risk(env, active)})


@app.route('/api/env/history')
def api_env_history():
    try:
        hours = min(72, max(1, int(request.args.get('hours', 24))))
    except Exception:
        hours = 24
    return jsonify({'history': database.get_env_history(hours)})


# ------------------------------------------------------------------ #
# 数据统计
# ------------------------------------------------------------------ #
@app.route('/api/statistics')
def api_statistics():
    try:
        days = min(90, max(1, int(request.args.get('days', 7))))
    except Exception:
        days = 7
    records = database.list_detect_records(limit=5000)
    env_hist = database.get_env_history(72)
    warnings = database.list_warnings(limit=500)

    today = datetime.now()
    trend = []
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        key = day.strftime('%Y-%m-%d')
        n = sum(1 for r in records if r['created_at'][:10] == key)
        trend.append({'date': key[5:], 'count': n})

    # 类别分布（近 30 天）
    cat_map = {}
    sev_map = {'轻度': 0, '中度': 0, '重度': 0}
    for r in records:
        for t in r.get('targets', []):
            c = t.get('class', 'unknown')
            cat_map[c] = cat_map.get(c, 0) + 1
        sev_map[r.get('severity', '轻度')] = sev_map.get(r.get('severity', '轻度'), 0) + 1

    cat_list = [{'name': config.CLASS_CN.get(k, k), 'key': k, 'value': v}
                for k, v in cat_map.items()]

    # 预警等级分布
    warn_map = {'red': 0, 'orange': 0, 'yellow': 0, 'blue': 0}
    for w in warnings:
        warn_map[w.get('level', 'blue')] = warn_map.get(w.get('level', 'blue'), 0) + 1

    return jsonify({
        'trend': trend,
        'categories': cat_list,
        'severity': [{'name': k, 'value': v} for k, v in sev_map.items()],
        'warnings_level': [{'name': LEVEL_CN[k], 'key': k, 'value': v}
                           for k, v in warn_map.items()],
        'env_history': env_hist,
        'total': len(records),
    })


# ------------------------------------------------------------------ #
# 预警中心
# ------------------------------------------------------------------ #
@app.route('/api/warnings')
def api_warnings():
    status = request.args.get('status', 'all')
    return jsonify({'warnings': database.list_warnings(status)})


@app.route('/api/warnings/<int:wid>/resolve', methods=['POST'])
def api_warning_resolve(wid):
    database.resolve_warning(wid)
    database.log_action('处理预警', f'预警 #{wid} 已标记为已处理')
    return jsonify({'ok': True})


@app.route('/api/warnings/<int:wid>/undo', methods=['POST'])
def api_warning_undo(wid):
    database.undo_warning(wid)
    database.log_action('撤销处理', f'预警 #{wid} 已恢复为待处理')
    return jsonify({'ok': True})


# ------------------------------------------------------------------ #
# 农业知识库
# ------------------------------------------------------------------ #
@app.route('/api/knowledge')
def api_knowledge():
    return jsonify({'knowledge': database.list_knowledge()})


@app.route('/api/knowledge/<key>')
def api_knowledge_detail(key):
    row = database.get_knowledge_by_class(key)
    if row:
        return jsonify({'item': row})
    return jsonify({'item': None}), 404


# ------------------------------------------------------------------ #
# 检测记录
# ------------------------------------------------------------------ #
@app.route('/api/records')
def api_records():
    try:
        limit = min(200, max(1, int(request.args.get('limit', 50))))
        offset = max(0, int(request.args.get('offset', 0)))
    except Exception:
        limit, offset = 50, 0
    return jsonify({'records': database.list_detect_records(limit, offset)})


@app.route('/api/records/<int:rid>')
def api_record_detail(rid):
    r = database.get_detect_record(rid)
    if not r:
        return jsonify({'error': '记录不存在'}), 404
    return jsonify({'record': r})


# ------------------------------------------------------------------ #
# 智能检测
# ------------------------------------------------------------------ #
@app.route('/api/detect', methods=['POST'])
def api_detect():
    det = get_detector()
    det.is_ready()

    if 'file' not in request.files:
        return jsonify({'error': '未接收到文件（字段名应为 file）'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': '文件名为空'}), 400

    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
    if ext in config.ALLOWED_VIDEO:
        return _handle_video(f, ext)

    if ext not in config.ALLOWED_IMAGE:
        return jsonify({'error': f'不支持的格式：{ext}（支持图片 png/jpg/jpeg/bmp/webp，视频 mp4/avi/mov/mkv）'}), 400

    data = f.read()
    if len(data) == 0:
        return jsonify({'error': '文件内容为空'}), 400

    # 保存原图
    uname = datetime.now().strftime('%Y%m%d_%H%M%S') + '_' + uuid.uuid4().hex[:6]
    img_name = f"{uname}.jpg"
    img_path = os.path.join(config.UPLOAD_DIR, img_name)
    with open(img_path, 'wb') as fp:
        fp.write(data)

    try:
        result = det.detect(data)
    except Exception as e:
        return jsonify({'error': f'检测失败：{e}'}), 500

    # 保存标注图
    res_name = f"{uname}_result.jpg"
    res_path = os.path.join(config.OUTPUT_DIR, res_name)
    with open(res_path, 'wb') as fp:
        fp.write(result['annotated_bytes'])

    # 研判 + 记录 + 预警
    env = database.get_latest_env()
    judge = evaluate_detection(result['targets'], env)
    summary = _build_summary(result['targets'])
    rid = database.add_detect_record(
        f.filename, f"/uploads/{img_name}", f"/outputs/{res_name}",
        summary, judge['severity'], result['targets'])
    for w in judge['warnings']:
        database.add_warning(w['level'], w['title'], w['content'],
                             w['advice'], w['source'])
    database.log_action('智能检测', f"{summary}（记录 #{rid}）")

    return jsonify({
        'ok': True,
        'record_id': rid,
        'summary': summary,
        'severity': judge['severity'],
        'score': judge['score'],
        'level': judge['level'],
        'counts': result['counts'],
        'targets': result['targets'],
        'advice': judge['advice'],
        'chemical': judge['chemical'],
        'main_name': judge.get('main_name'),
        'annotated_url': f"/outputs/{res_name}",
        'image_url': f"/uploads/{img_name}",
        'demo_mode': det.demo,
    })


def _build_summary(targets):
    if not targets:
        return '未检测到明显病害'
    counts = {}
    for t in targets:
        counts[t['class']] = counts.get(t['class'], 0) + 1
    parts = []
    for c, n in counts.items():
        parts.append(f"{n} 处{config.CLASS_CN.get(c, c)}")
    return '检测到 ' + '、'.join(parts)


def _handle_video(f, ext):
    """视频检测：抽帧检测，返回代表性帧缩略图与汇总。"""
    try:
        import cv2
    except Exception:
        return jsonify({'error': '检测到视频文件，但当前环境未安装 opencv-python，'
                                 '请在 yolo11 环境中执行 pip install opencv-python 后重试。'}), 400

    # 保存视频
    uname = datetime.now().strftime('%Y%m%d_%H%M%S') + '_' + uuid.uuid4().hex[:6]
    video_name = f"{uname}.{ext}"
    video_path = os.path.join(config.UPLOAD_DIR, video_name)
    f.save(video_path)

    det = get_detector()
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if total <= 0:
        cap.release()
        return jsonify({'error': '无法读取视频内容'}), 400

    sample_idx = sorted(set(int(i * total / min(total, 8)) for i in range(min(total, 8))))
    all_targets = []
    frames_out = []
    for idx in sample_idx:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok:
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = _to_pil(rgb)
        buf = io.BytesIO()
        pil_img.save(buf, format='JPEG', quality=88)
        result = det.detect(buf.getvalue())
        all_targets.extend(result['targets'])
        # 保存该帧标注图
        frame_name = f"{uname}_f{idx}.jpg"
        with open(os.path.join(config.OUTPUT_DIR, frame_name), 'wb') as fp:
            fp.write(result['annotated_bytes'])
        frames_out.append({
            'frame': idx,
            'count': len(result['targets']),
            'url': f"/outputs/{frame_name}",
        })
    cap.release()

    if not all_targets:
        summary = '视频中未检测到明显病害'
        judge = evaluate_detection([], database.get_latest_env())
    else:
        counts = {}
        for t in all_targets:
            counts[t['class']] = counts.get(t['class'], 0) + 1
        parts = [f"{n} 处{config.CLASS_CN.get(c, c)}" for c, n in counts.items()]
        summary = '视频抽帧检测到 ' + '、'.join(parts)
        judge = evaluate_detection(all_targets, database.get_latest_env())

    rid = database.add_detect_record(
        f.filename, f"/uploads/{video_name}", '', summary, judge['severity'],
        all_targets)
    for w in judge['warnings']:
        database.add_warning(w['level'], w['title'], w['content'], w['advice'], w['source'])
    database.log_action('视频检测', f"{summary}（记录 #{rid}）")

    return jsonify({
        'ok': True,
        'record_id': rid,
        'summary': summary,
        'severity': judge['severity'],
        'score': judge['score'],
        'level': judge['level'],
        'targets': all_targets,
        'frames': frames_out,
        'video_url': f"/uploads/{video_name}",
        'advice': judge['advice'],
        'chemical': judge['chemical'],
        'main_name': judge.get('main_name'),
        'demo_mode': det.demo,
    })


def _to_pil(arr):
    from PIL import Image
    return Image.fromarray(arr)


# ------------------------------------------------------------------ #
# 系统设置
# ------------------------------------------------------------------ #
@app.route('/api/settings')
def api_settings():
    det = get_detector()
    det.is_ready()
    return jsonify({
        'settings': database.get_settings(),
        'model': det.model_info(),
    })


@app.route('/api/settings', methods=['POST'])
def api_settings_update():
    payload = request.get_json(force=True, silent=True) or {}
    allowed = {'conf', 'iou', 'imgsz', 'station', 'interval',
               'env_temp_high', 'env_temp_low', 'env_hum_high',
               'env_soil_low', 'env_light_low', 'demo_data'}
    data = {k: v for k, v in payload.items() if k in allowed}
    if not data:
        return jsonify({'error': '没有可更新的配置项'}), 400
    database.set_settings_many(data)
    database.log_action('修改设置', ', '.join(f"{k}={v}" for k, v in data.items()))
    return jsonify({'ok': True, 'settings': database.get_settings()})


@app.route('/api/model/reload', methods=['POST'])
def api_model_reload():
    det = get_detector()
    det.model = None
    det.loaded = False
    det.demo = False
    ok = det.load()
    database.log_action('重载模型', f"成功={ok}，路径={det.model_path}")
    return jsonify({'ok': True, 'model': det.model_info()})


# ------------------------------------------------------------------ #
# 数据管理
# ------------------------------------------------------------------ #
@app.route('/api/data/reset', methods=['POST'])
def api_data_reset():
    database.reset_demo_data()
    database.log_action('重置演示数据', '已清空业务数据并重新生成演示数据')
    return jsonify({'ok': True})


@app.route('/api/activity')
def api_activity():
    return jsonify({'activity': database.list_activity(30)})


# ------------------------------------------------------------------ #
if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    print('=' * 60)
    print('  大田病虫害智能检测系统 正在启动...')
    print(f'  模型：{config.MODEL_PATH}')
    print(f'  访问地址：http://127.0.0.1:{port}')
    print('=' * 60)
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
