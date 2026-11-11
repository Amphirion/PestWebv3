# -*- coding: utf-8 -*-
"""
预警规则引擎
- 环境预警：温度 / 湿度 / 土壤墒情 / 光照 越限判定
- 检测预警：依据目标数量与置信度判定严重程度，并结合知识库给出防治建议
- 输出四级预警：red(红) / orange(橙) / yellow(黄) / blue(蓝)
"""
from backend import database
from backend.knowledge import get_knowledge_for

LEVEL_WEIGHT = {'red': 4, 'orange': 3, 'yellow': 2, 'blue': 1}
LEVEL_CN = {'red': '红色', 'orange': '橙色', 'yellow': '黄色', 'blue': '蓝色'}


def _rules():
    cfg = database.get_settings()

    def f(k, default):
        try:
            return float(cfg.get(k, default))
        except Exception:
            return default
    return {
        'temp_high': f('env_temp_high', 35),
        'temp_low':  f('env_temp_low', 5),
        'hum_high':  f('env_hum_high', 85),
        'soil_low':  f('env_soil_low', 20),
        'light_low': f('env_light_low', 500),
    }


# ------------------------------------------------------------------ #
# 环境预警
# ------------------------------------------------------------------ #
def evaluate_env(env):
    """输入最新环境数据 dict，返回预警列表（不含入库）。"""
    if not env:
        return []
    rules = _rules()
    warnings = []
    temp, hum, light, soil = (env.get('temperature', 0), env.get('humidity', 0),
                              env.get('light', 0), env.get('soil', 0))
    if temp >= rules['temp_high']:
        warnings.append({
            'level': 'orange',
            'title': f"田间温度偏高（{temp:.1f}℃）",
            'content': '持续高温会抑制作物正常生长，并可能加剧某些病害发生，请注意通风降温。',
            'advice': '避开高温时段作业，及时灌溉降温，有条件的田块可适当遮荫。',
            'source': 'env',
        })
    elif temp <= rules['temp_low']:
        warnings.append({
            'level': 'yellow',
            'title': f"田间温度偏低（{temp:.1f}℃）",
            'content': '低温会影响作物生长和光合作用，注意防寒防冻。',
            'advice': '关注天气变化，必要时采取覆盖保温措施。',
            'source': 'env',
        })
    if hum >= rules['hum_high']:
        warnings.append({
            'level': 'orange',
            'title': f"田间湿度偏高（{hum:.0f}%）",
            'content': '高湿环境极易诱发稻瘟病、叶斑病等真菌性病害，请加强巡田。',
            'advice': '及时排水降湿、加强通风，检查叶片是否有病斑，可预防性用药。',
            'source': 'env',
        })
    if soil <= rules['soil_low']:
        warnings.append({
            'level': 'yellow',
            'title': f"土壤墒情偏低（{soil:.0f}%）",
            'content': '土壤水分不足会影响根系吸收和养分运输，作物易受旱。',
            'advice': '及时补水灌溉，早晚各检查一次墒情，可结合叶面肥增强抗逆性。',
            'source': 'env',
        })
    if light <= rules['light_low']:
        warnings.append({
            'level': 'blue',
            'title': '光照强度偏低',
            'content': '当前光照较弱，可能影响作物光合积累，多为阴雨或夜间时段。',
            'advice': '持续阴雨天注意防病，天晴后及时追肥。',
            'source': 'env',
        })
    return warnings


# ------------------------------------------------------------------ #
# 检测预警（严重程度研判）
# ------------------------------------------------------------------ #
def assess_severity(targets):
    """根据目标数量与最高置信度判定严重程度。"""
    if not targets:
        return '无', 0
    n = len(targets)
    max_conf = max(t.get('conf', 0) for t in targets)
    if n >= 6 or max_conf >= 0.90:
        return '重度', 90
    if n >= 3 or max_conf >= 0.75:
        return '中度', 60
    return '轻度', 30


def evaluate_detection(targets, env=None):
    """检测结果 + 环境 → 严重程度、等级、预警条目、防治建议。"""
    severity, score = assess_severity(targets)
    if not targets:
        return {'severity': severity, 'score': 0, 'level': 'blue',
                'advice': '未检测到明显病害，请继续保持监测。',
                'warnings': []}

    # 各类别数量
    counts = {}
    for t in targets:
        counts[t['class']] = counts.get(t['class'], 0) + 1
    main_cls = max(counts, key=counts.get)
    k = get_knowledge_for(main_cls)

    level = 'red' if severity == '重度' else ('orange' if severity == '中度' else 'yellow')

    # 环境放大：若湿度偏高，风险上浮
    bonus = 0
    if env and env.get('humidity', 0) >= 85:
        bonus = 10
    score = min(100, score + bonus)
    if bonus and level == 'yellow':
        level = 'orange'

    warnings = [{
        'level': level,
        'title': f"检测到 {severity}病害：{k['name_cn']}",
        'content': f"本次检测到 {k['name_cn']} {counts[main_cls]} 处，风险评分 {score}/100。"
                   f"{k['symptoms'][:80]}……",
        'advice': k['chemical'],
        'source': 'detection',
    }]
    return {
        'severity': severity,
        'score': score,
        'level': level,
        'main_class': main_cls,
        'main_name': k['name_cn'],
        'counts': counts,
        'advice': k['prevention'],
        'chemical': k['chemical'],
        'warnings': warnings,
    }


# ------------------------------------------------------------------ #
# 综合风险（数据总览用）
# ------------------------------------------------------------------ #
def overall_risk(env, active_warnings):
    """0-100 综合风险分，用于首页展示。"""
    score = 0
    if env:
        rules = _rules()
        if env.get('temperature', 0) >= rules['temp_high']:
            score += 15
        if env.get('humidity', 0) >= rules['hum_high']:
            score += 20
        if env.get('soil', 0) <= rules['soil_low']:
            score += 10
        if env.get('light', 0) <= rules['light_low']:
            score += 5
    for w in active_warnings:
        score += LEVEL_WEIGHT.get(w.get('level'), 1) * 5
    return min(100, score)
