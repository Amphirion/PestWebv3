import re

sections = {
    'plo': {'num': '01.', 'title': '研究背景与目标', 'en': 'RESEARCH BACKGROUND AND OBJECTIVES', 'desc': '分析大田病虫害防治的三大痛点，阐述研究意义与目标，明确技术路线。'},
    'plz': {'num': '02.', 'title': '系统设计与方法', 'en': 'SYSTEM DESIGN AND METHODOLOGY', 'desc': '四层系统架构，6类病害数据集构建，YOLO11n模型与迁移学习训练策略。'},
    'pll': {'num': '03.', 'title': '实验结果与分析', 'en': 'EXPERIMENTAL RESULTS AND ANALYSIS', 'desc': '模型整体性能指标，各类别精度对比，训练曲线与混淆矩阵误差分析。'},
    'plM': {'num': '04.', 'title': '系统实现与展望', 'en': 'SYSTEM IMPLEMENTATION AND OUTLOOK', 'desc': 'Web交互平台六大模块，规则引擎与环境感知，RK3588边缘部署与未来展望。'}
}

for sid, s in sections.items():
    fpath = './.lark-slides/template/pest-defense/authoring/slide-' + sid + '.xml'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 替换背景图
    content = re.sub(r'src="[^"]+"', 'src="DlJjbNNW2o5MugxkuSCchBMInIe"', content, count=1)
    
    # 替换编号
    content = content.replace('>01.<', '>' + s['num'] + '<')
    
    # 替换标题
    content = content.replace('>农业项目<', '>' + s['title'] + '<')
    content = content.replace('>项目优势<', '>' + s['title'] + '<')
    content = content.replace('>项目发展<', '>' + s['title'] + '<')
    content = content.replace('>项目规划<', '>' + s['title'] + '<')
    
    # 替换英文
    content = content.replace('REPORT OF POSTOPERATIVE NURSING PLAN', s['en'])
    
    # 替换描述文字
    content = re.sub(r'>Click here to enter your text[^<]*<', '>' + s['desc'] + '<', content)
    
    # 替换演讲者备注
    content = re.sub(r'模板来自于：第一PPT[^<]*', s['desc'], content)
    content = re.sub(r'Click to add text', s['desc'], content)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(sid + ' updated: ' + s['num'] + ' ' + s['title'])
