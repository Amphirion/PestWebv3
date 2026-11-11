import re
import xml.etree.ElementTree as ET

# 从source.xml提取所有页面，去掉命名空间前缀
tree = ET.parse('./.lark-slides/template/pest-defense/source.xml')
root = tree.getroot()

# 注册命名空间，避免输出时带前缀
ET.register_namespace('', 'https://www.larkoffice.com/sml/2.0')

ns = {'s': 'https://www.larkoffice.com/sml/2.0'}

target_ids = ['plo', 'plz', 'pll', 'plM', 'pln', 'plL', 'plF', 'plJ', 'ple', 'plN', 'plP', 'plH', 'pls', 'plv', 'plf', 'plw', 'plE', 'plS', 'plR', 'plq', 'plr', 'plD']

for slide in root.findall('s:slide', ns):
    sid = slide.get('id')
    if sid in target_ids:
        # 用字符串方式提取，去掉命名空间前缀
        raw = ET.tostring(slide, encoding='unicode')
        # 去掉 ns0: 前缀
        raw = re.sub(r'ns0:', '', raw)
        # 去掉 xmlns:ns0 声明
        raw = re.sub(r'\s+xmlns:ns0="[^"]*"', '', raw)
        # 确保根元素有默认xmlns
        if 'xmlns=' not in raw.split('>')[0]:
            raw = raw.replace('<slide ', '<slide xmlns="https://www.larkoffice.com/sml/2.0" ', 1)
        
        fpath = './.lark-slides/template/pest-defense/authoring/slide-' + sid + '.xml'
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(raw)
        print(sid + ' extracted to ' + fpath)

print('Done extracting all pages')
