<<<<<<< HEAD
# 智农·慧眼 —— 大田病虫害智能检测与预警系统

基于 **YOLO11n + Flask** 的作物病害智能检测 Web 平台。前端采用"液体玻璃（Liquid Glass）"拟态风格，
内置 **数据总览 / 数据统计 / 预警中心 / 农业知识库 / 系统设置 / 智能检测** 六大功能模块。

---

## 一、项目结构

```
PestWebv3/
├── app.py                  # Flask 主程序（全部后端 API）
├── config.py               # 全局配置（模型路径 / 阈值 / 类别）
├── requirements.txt        # Python 依赖清单
├── README.md               # 本文档
├── models/
│   └── best.pt             # YOLO11 训练权重（6 类作物病害）
├── backend/
│   ├── database.py         # SQLite 数据层 + 演示数据
│   ├── detector.py         # YOLO 检测引擎（含中文标注、演示降级）
│   ├── env_simulator.py    # 温/湿/光/土壤 环境模拟器（可替换为真实传感器）
│   ├── warning_engine.py   # 四级预警规则引擎 + 严重程度研判
│   └── knowledge.py        # 六大病害防治知识库
├── static/
│   ├── css/                # main / glass-icons / counter / carousel / upload
│   ├── js/                 # app / lib / 各页面模块
│   ├── img/                # 背景图（Unsplash 自由版权）
│   ├── samples/            # 内置演示样本（来自你的数据集 val 集）
│   └── vendor/echarts.min.js
├── templates/
│   └── index.html          # 单页应用外壳
├── uploads/                # 上传的原图 / 视频（运行时自动创建）
├── outputs/                # 检测标注结果图（运行时自动创建）
└── data/                   # SQLite 数据库 app.db（运行时自动创建）
```

## 二、模型支持的 6 类病害

| 类别名 | 中文名 | 作物 |
|---|---|---|
| neck_blast | 水稻细菌性条斑病（颈瘟） | 水稻 |
| rice_leaf_blast | 水稻叶斑病 | 水稻 |
| brown_spot | 水稻棕色斑点 | 水稻 |
| corn_leaf_spot | 玉米叶斑病 | 玉米 |
| corn_leaf_blight | 玉米叶枯病 | 玉米 |
| corn_rust | 玉米叶锈病 | 玉米 |

> 类别来自 `best.pt` 模型元数据，与 `Dataset\dataset_yolo\data.yaml` 一致。

---

## 三、环境准备（Anaconda）

```bash
# 1. 激活你的 yolo11 环境
conda activate yolo11

# 2. 安装依赖（已装过的会自动跳过）
pip install -r requirements.txt

# 3. 确认模型存在
#    保证 C:\Users\Amphion\Desktop\PestWebv3\models\best.pt 存在即可
```

> 提示：`ultralytics` 会自动安装 `torch` / `torchvision`。若只需 CPU 推理（你的模型就是 CPU 训练的），
> 直接安装即可；如需 GPU 请另行安装对应 CUDA 版 PyTorch。

---

## 四、启动服务

```bash
# 在项目根目录执行
python app.py
```

启动成功后控制台会显示：

```
大田病虫害智能检测系统 正在启动...
访问地址：http://127.0.0.1:8000
```

浏览器打开 **http://127.0.0.1:8000** 即可进入平台。

| 常用操作 | 说明 |
|---|---|
| 智能检测 | 上传图片 / 拖拽文件 / 点击演示样本 / 开启摄像头实时检测 |
| 数据总览 | 实时环境数据 + 统计指标自动刷新 |
| 数据统计 | 近 7/14/30 天趋势、类别分布、严重程度、预警等级 |
| 预警中心 | 四级预警查看、处置建议、一键处理 |
| 农业知识库 | 六大病害症状 / 病因 / 防治知识（3D 浏览） |
| 系统设置 | 模型重载、置信度阈值、环境预警阈值、数据重置 |

---

## 五、常见问题

**1. 提示"演示模式 · 未加载YOLO"**
说明当前 Python 环境缺少 `ultralytics` 或无法导入。请确认在 `yolo11` 环境内运行，
执行 `pip install ultralytics` 后重启服务。演示模式下仍可完整体验平台流程（检测框为模拟生成）。

**2. 检测框没有中文标签 / 中文乱码**
程序会自动从 `C:\Windows\Fonts` 加载中文字体（微软雅黑 / 黑体 / 宋体），一般无需处理。

**3. 视频检测提示需要 opencv-python**
`pip install opencv-python` 后重启即可。视频采用"抽帧检测"，返回关键帧标注缩略图。

**4. 如何接入真实传感器？**
打开 `backend/env_simulator.py`，将 `_sample()` 方法替换为读取
DHT11（温湿度）/ 电容式土壤湿度 / BH1750（光照）的实际读数即可，其余逻辑无需改动。

**5. 端口被占用**
修改 `app.py` 末尾 `app.run(..., port=8000)` 的端口号，或直接传参 `python app.py`（暂未开放命令行参数，可手动改）。

---

## 六、演示数据说明

首次启动会自动生成一份演示数据（60 条检测记录 + 24 小时环境历史 + 若干预警），
保证打开页面即有内容。可在 **系统设置 → 数据管理** 一键重置。
当检测记录非空时，系统不会覆盖你的真实数据。
=======
# PestWebv3
>>>>>>> c432bed627e306844b0c004b98a6713688966f40
