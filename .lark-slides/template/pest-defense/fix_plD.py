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

# 修复plD
plD = slide_map['plD']
plD = plD.replace('农业项目计划', '感谢聆听')
plD = plD.replace('20XX', 'Q&amp;A')
plD = plD.replace('主讲：第一PPT', '答辩人：[团队名称]')
plD = plD.replace('时间：XXX', '2026年9月')
plD = plD.replace('POSTOPERATIVE CARE', 'SMART AGRICULTURE')
plD = plD.replace('REPORT OF POSTOPERATIVE NURSING PLAN', 'THANK YOU FOR YOUR ATTENTION')
plD = plD.replace('Click here to enter your text and change the color or size of the text. Insert the data text icon,',
    '基于图像识别的大田农作物病虫害智能检测与预警系统，欢迎各位评委老师提问与交流。')
# 通用清理
plD = re.sub(r'模板来自于：第一PPT[^<]*', '', plD)
plD = re.sub(r'Click to add text', '本页内容详见演讲备注。', plD)

with open('./.lark-slides/template/pest-defense/authoring2/24-plD.xml', 'w', encoding='utf-8') as f:
    f.write(plD)
print('plD fixed')

# 验证
content = open('./.lark-slides/template/pest-defense/authoring2/24-plD.xml', encoding='utf-8').read()
# 检查未转义的&（不是&amp; &lt; &gt;的）
bad_amp = re.findall(r'&(?!amp;|lt;|gt;|quot;|apos;|#)', content)
if bad_amp:
    print('plD STILL HAS BAD &:', bad_amp[:5])
else:
    print('plD escaping OK')
