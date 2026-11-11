import re

# 检查plf
content = open('./.lark-slides/template/pest-defense/authoring2/16-plf.xml', encoding='utf-8').read()
matches = re.findall(r'topLeftX="([^"]+)"', content)
for m in matches:
    if m.count('.') > 1:
        print('BAD topLeftX in plf:', m)

# 检查plE
content2 = open('./.lark-slides/template/pest-defense/authoring2/18-plE.xml', encoding='utf-8').read()
lines = content2.split('\n')
if len(lines) >= 98:
    print('plE line 98:', lines[97][:100])
    print('plE line 99:', lines[98][:100] if len(lines) > 98 else 'N/A')

# 查找plE中未转义的< >
for i, line in enumerate(lines):
    if '<20px' in line or '>20px' in line:
        print(f'plE line {i+1} has unescaped: {line[:80]}')
