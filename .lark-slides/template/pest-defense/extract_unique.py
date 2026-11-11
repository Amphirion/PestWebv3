import re
import xml.etree.ElementTree as ET

tree = ET.parse('./.lark-slides/template/pest-defense/source.xml')
root = tree.getroot()
ET.register_namespace('', 'https://www.larkoffice.com/sml/2.0')
ns = {'s': 'https://www.larkoffice.com/sml/2.0'}

# 按模板原始页序排列
ordered_ids = [
    'plu',   # 1 封面
    'plV',   # 2 目录
    'plo',   # 3 章节1
    'pln',   # 4 研究背景
    'plL',   # 5 研究意义
    'plF',   # 6 研究目标
    'plz',   # 7 章节2
    'plJ',   # 8 系统架构
    'ple',   # 9 数据集
    'plN',   # 10 数据增强
    'plP',   # 11 模型架构
    'plH',   # 12 迁移学习
    'pls',   # 13 超参数
    'pll',   # 14 章节3
    'plv',   # 15 实验环境
    'plf',   # 16 整体结果
    'plw',   # 17 类别性能
    'plE',   # 18 训练曲线
    'plM',   # 19 章节4
    'plS',   # 20 Web平台
    'plR',   # 21 规则引擎
    'plq',   # 22 边缘部署
    'plr',   # 23 创新点
    'plD',   # 24 结束页
]

# 建立slide_id到XML的映射
slide_map = {}
for slide in root.findall('s:slide', ns):
    sid = slide.get('id')
    raw = ET.tostring(slide, encoding='unicode')
    raw = re.sub(r'ns0:', '', raw)
    raw = re.sub(r'\s+xmlns:ns0="[^"]*"', '', raw)
    if 'xmlns=' not in raw.split('>')[0]:
        raw = raw.replace('<slide ', '<slide xmlns="https://www.larkoffice.com/sml/2.0" ', 1)
    # 去掉根元素id
    raw = re.sub(r'<slide(\s+)id="[^"]*"', r'<slide ', raw)
    if 'xmlns=' not in raw.split('>')[0]:
        raw = raw.replace('<slide ', '<slide xmlns="https://www.larkoffice.com/sml/2.0" ', 1)
    slide_map[sid] = raw

# 用序号前缀写入，确保唯一
out_dir = './.lark-slides/template/pest-defense/authoring2'
import os
os.makedirs(out_dir, exist_ok=True)

for i, sid in enumerate(ordered_ids, 1):
    if sid in slide_map:
        fname = f'{i:02d}-{sid}.xml'
        fpath = os.path.join(out_dir, fname)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(slide_map[sid])
        print(f'{fname} written ({sid})')
    else:
        print(f'WARNING: {sid} not found in source')

print('Done extracting all pages with unique filenames')
