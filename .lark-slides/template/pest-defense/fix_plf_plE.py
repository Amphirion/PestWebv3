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

# 修复plf: 只替换span标签内的数字
plf = slide_map['plf']
# 替换章节标签
plf = plf.replace('03 项目发展', '03 实验结果')
plf = plf.replace('整体实验结果', '整体实验结果')
# 替换描述文字
plf = plf.replace('鼠标点击这里，输入您的文本文字，更改文字的颜色或者大小属性。鼠标点击这里，输入您的文本文字，更改文字的颜色或者大小属性。',
    '模型在验证集（约400张）上的整体性能：mAP@0.5=0.453，Precision=0.500，Recall=0.452，mAP@0.5:0.95=0.171。最佳F1=0.48，对应最优阈值0.301。')
# 只替换span标签内的数字显示
plf = re.sub(r'(<span[^>]*>)12(</span>)', r'\g<1>0.453\g<2>', plf)
plf = re.sub(r'(<span[^>]*>)45(</span>)', r'\g<1>0.500\g<2>', plf)
plf = re.sub(r'(<span[^>]*>)65(</span>)', r'\g<1>0.452\g<2>', plf)
# 替换标题
plf = plf.replace('添加标题', 'mAP@0.5', 1)
plf = plf.replace('添加标题', '精确率', 1)
plf = plf.replace('添加标题', '召回率', 1)
# 通用清理
plf = re.sub(r'模板来自于：第一PPT[^<]*', '', plf)
plf = re.sub(r'Click to add text', '本页内容详见演讲备注。', plf)

with open('./.lark-slides/template/pest-defense/authoring2/16-plf.xml', 'w', encoding='utf-8') as f:
    f.write(plf)
print('plf fixed')

# 修复plE: 转义文字中的<符号
plE = slide_map['plE']
plE = plE.replace('03 项目发展', '03 实验结果')
# 替换数字显示（只在span内）
plE = re.sub(r'(<span[^>]*>)1230/人(</span>)', r'\g<1>0.48\g<2>', plE)
plE = re.sub(r'(<span[^>]*>)78(</span>)', r'\g<1>50\g<2>', plE)
plE = re.sub(r'(<span[^>]*>)45(</span>)', r'\g<1>30\g<2>', plE)
plE = re.sub(r'(<span[^>]*>)23(</span>)', r'\g<1>20\g<2>', plE)
# 替换标题
plE = plE.replace('添加标题', '最佳F1', 1)
plE = plE.replace('添加标题', '收敛轮数', 1)
plE = plE.replace('添加标题', '精确率', 1)
plE = plE.replace('添加标题', '召回率', 1)
# 替换描述文字（注意转义<符号）
plE = plE.replace('鼠标点击这里，输入您的文本文字，更改文字的颜色或者大小属性。',
    '训练损失持续稳定下降，mAP@0.5约50轮后收敛于0.42-0.47。验证损失波动表明存在轻度过拟合。')
plE = plE.replace('鼠标点击这里，输入您的文本文字，更改文字的颜色或者大小属性。',
    '混淆矩阵显示大量目标被误判为背景（漏检），是召回率仅0.452的直接原因。')
plE = plE.replace('输入您的文本文字，更改文字的颜色或者大小属性。',
    '根因：小目标检测困难（病斑小于20px），健康负样本占比高，早期病害特征不明显。')
plE = plE.replace('输入您的文本文字，更改文字的颜色或者大小属性。',
    '改进方向：扩充弱势类别样本，引入注意力机制增强小目标特征，难例挖掘。')
# 通用清理
plE = re.sub(r'模板来自于：第一PPT[^<]*', '', plE)
plE = re.sub(r'Click to add text', '本页内容详见演讲备注。', plE)

with open('./.lark-slides/template/pest-defense/authoring2/18-plE.xml', 'w', encoding='utf-8') as f:
    f.write(plE)
print('plE fixed')

# 验证
for sid, fname in [('plf', '16-plf.xml'), ('plE', '18-plE.xml')]:
    content = open(f'./.lark-slides/template/pest-defense/authoring2/{fname}', encoding='utf-8').read()
    bad = re.findall(r'topLeftX="([^"]*\.[^"]*\.[^"]*)"', content)
    if bad:
        print(f'{fname} STILL HAS BAD FLOATS: {bad[:3]}')
    else:
        print(f'{fname} floats OK')
    # 检查未转义的<在文字中
    if '<20px' in content or '<20' in content:
        print(f'{fname} HAS UNESCAPED <')
    else:
        print(f'{fname} escaping OK')
