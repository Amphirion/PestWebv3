import re
import os

auth_dir = './.lark-slides/template/pest-defense/authoring'
for fname in os.listdir(auth_dir):
    if not fname.endswith('.xml'):
        continue
    fpath = os.path.join(auth_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 去掉根元素slide上的id属性
    content = re.sub(r'<slide(\s+)id="[^"]*"', r'<slide ', content)
    # 确保有xmlns
    if 'xmlns=' not in content.split('>')[0]:
        content = content.replace('<slide ', '<slide xmlns="https://www.larkoffice.com/sml/2.0" ', 1)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(fname + ' id removed')

print('Done')
