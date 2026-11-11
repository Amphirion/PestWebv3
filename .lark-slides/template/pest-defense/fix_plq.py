import re
import xml.etree.ElementTree as ET

tree = ET.parse('./.lark-slides/template/pest-defense/source.xml')
root = tree.getroot()
ET.register_namespace('', 'https://www.larkoffice.com/sml/2.0')
ns = {'s': 'https://www.larkoffice.com/sml/2.0'}

slide_map = {}
for slide in root.findall('s:slide', ns):
    sid = slide.get('id')
    raw = ET.tostring(slide, encoding='unicode')
    raw = re.sub(r'ns0:', '', raw)
    raw = re.sub(r'\s+xmlns:ns0="[^"]*"', '', raw)
    if 'xmlns=' not in raw.split('>')[0]:
        raw = raw.replace('<slide ', '<slide xmlns="https://www.larkoffice.com/sml/2.0" ', 1)
    raw = re.sub(r'<slide(\s+)id="[^"]*"', r'<slide ', raw)
    if 'xmlns=' not in raw.split('>')[0]:
        raw = raw.replace('<slide ', '<slide xmlns="https://www.larkoffice.com/sml/2.0" ', 1)
    slide_map[sid] = raw

# 修复plq
plq = slide_map['plq']
plq = plq.replace('04 项目规划', '04 系统实现')
plq = plq.replace('环境感知与边缘部署', '环境感知与边缘部署')
# 替换数字（只在span内）
plq = re.sub(r'(<span[^>]*>)5,250(</span>)', r'\g<1>4类\g<2>', plq)
plq = re.sub(r'(<span[^>]*>)3,594(</span>)', r'\g<1>6TOPS\g<2>', plq)
plq = re.sub(r'(<span[^>]*>)8,496(</span>)', r'\g<1>小于100ms\g<2>', plq)
# 替换标题
plq = plq.replace('添加标题', '传感器', 1)
plq = plq.replace('添加标题', 'NPU算力', 1)
plq = plq.replace('添加标题', '推理延迟', 1)
# 替换描述文字
plq = plq.replace('输入您的文本文字，更改文字的颜色或者大小属性。鼠标点击这里，输入您的文本文字，更改文字的颜色或者大小属性。',
    '四类传感器：DHT22温湿度、BH1750光照、电容式墒情、USB摄像头。RK3588边缘部署，PyTorch到ONNX到RKNN三阶段量化，INT8量化预期小于100ms每帧。')
plq = plq.replace('鼠标点击这里，输入您的文本文字，更改文字的颜色或者大小属性。',
    '环境阈值：温度35度以上或5度以下、湿度85%以上、墒情20%以下、光照500lux以下均视为越限，触发预警规则引擎。')
# 通用清理
plq = re.sub(r'模板来自于：第一PPT[^<]*', '', plq)
plq = re.sub(r'Click to add text', '本页内容详见演讲备注。', plq)

with open('./.lark-slides/template/pest-defense/authoring2/22-plq.xml', 'w', encoding='utf-8') as f:
    f.write(plq)
print('plq fixed')

# 验证
content = open('./.lark-slides/template/pest-defense/authoring2/22-plq.xml', encoding='utf-8').read()
if '<100' in content or '<100ms' in content:
    print('plq STILL HAS UNESCAPED <')
else:
    print('plq escaping OK')
