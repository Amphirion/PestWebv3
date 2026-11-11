import re

data = open(r'C:\Users\Amphion\Desktop\PestWebv3\.lark-slides\current.xml', encoding='utf-8').read()
slides = re.findall(r'<slide id="([^"]+)">(.*?)</slide>', data, re.S)
print('total slides:', len(slides))
for sid, body in slides:
    m = re.search(r'<p>(\d+)\s*/\s*(\d+)</p>', body)
    print(sid, '->', m.group(0) if m else 'NO PAGENUM')
