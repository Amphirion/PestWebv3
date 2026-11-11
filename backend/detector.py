# -*- coding: utf-8 -*-
"""
YOLO 检测引擎
- 启动时惰性加载 best.pt
- 支持图片检测：返回标注图 + 目标列表
- 内置"演示模式"：当 ultralytics 不可用时自动降级，保证平台可运行
"""
import io
import os
import time
import random

import config
from backend import database

try:
    from PIL import Image, ImageDraw, ImageFont
    _HAS_PIL = True
except Exception:
    _HAS_PIL = False


class Detector:
    def __init__(self):
        self.model_path = config.MODEL_PATH
        self.model = None
        self.loaded = False
        self.demo = False
        self.error = None
        self.load_time = None
        self.classes = None          # 模型实际类别列表
        self._font_cache = {}

    # ------------------------------------------------------------------ #
    def load(self):
        """加载 YOLO 模型；失败则进入演示模式。"""
        try:
            from ultralytics import YOLO
            t0 = time.time()
            self.model = YOLO(self.model_path)
            self.loaded = True
            self.demo = False
            self.error = None
            self.load_time = round(time.time() - t0, 2)
            names = getattr(self.model, 'names', None)
            if isinstance(names, dict):
                self.classes = [names[i] for i in sorted(names.keys())]
            elif isinstance(names, list):
                self.classes = list(names)
            else:
                self.classes = list(config.CLASS_CN.keys())
            return True
        except Exception as e:      # noqa
            self.loaded = False
            self.demo = True
            self.error = str(e)
            self.classes = list(config.CLASS_CN.keys())
            return False

    def is_ready(self):
        if self.model is not None:
            return True
        return self.load()

    def model_info(self):
        return {
            'loaded': self.loaded,
            'demo': self.demo,
            'path': self.model_path,
            'error': self.error,
            'load_time': self.load_time,
            'classes': self.classes or list(config.CLASS_CN.keys()),
        }

    # ------------------------------------------------------------------ #
    def detect(self, image_bytes):
        """输入图片字节，返回 dict：
           annotated_bytes / targets / counts / names
        """
        if not _HAS_PIL:
            raise RuntimeError('缺少 Pillow，无法处理图片')
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        if self.is_ready() and not self.demo:
            targets, annot_img = self._real_detect(img)
        else:
            targets, annot_img = self._demo_detect(img)

        annot_buf = io.BytesIO()
        annot_img.save(annot_buf, format='JPEG', quality=92)

        counts = {}
        for t in targets:
            counts[t['class']] = counts.get(t['class'], 0) + 1
        return {
            'annotated_bytes': annot_buf.getvalue(),
            'targets': targets,
            'counts': counts,
        }

    # ------------------------------------------------------------------ #
    def _real_detect(self, img):
        cfg = database.get_settings()
        try:
            conf = float(cfg.get('conf', config.DEFAULT_CONF))
        except Exception:
            conf = config.DEFAULT_CONF
        try:
            iou = float(cfg.get('iou', config.DEFAULT_IOU))
        except Exception:
            iou = config.DEFAULT_IOU
        try:
            imgsz = int(cfg.get('imgsz', config.DEFAULT_IMGSZ))
        except Exception:
            imgsz = config.DEFAULT_IMGSZ

        # 关键：以「文件路径」传给 predict，与参考项目完全一致。
        # ultralytics 对 numpy 输入会按 OpenCV 惯例当作 BGR 再翻转一次，
        # 直接传 RGB 数组会导致通道被互换、颜色特征失效，精度大幅下降。
        import tempfile, os as _os
        tmp_fd, tmp_path = tempfile.mkstemp(suffix='.jpg')
        try:
            with _os.fdopen(tmp_fd, 'wb') as tf:
                img.convert('RGB').save(tf, format='JPEG', quality=95)
            results = self.model.predict(
                source=tmp_path,
                conf=conf,
                iou=iou,
                imgsz=imgsz,
                verbose=False,
            )
        finally:
            try:
                _os.remove(tmp_path)
            except Exception:
                pass

        targets = []
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            names = results[0].names
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf_v = round(float(boxes.conf[i].item()), 3)
                x1, y1, x2, y2 = [float(v) for v in boxes.xyxy[i].tolist()]
                class_name = names.get(cls_id, str(cls_id))
                targets.append({
                    'class': class_name,
                    'name': config.CLASS_CN.get(class_name, class_name),
                    'conf': conf_v,
                    'x': round(x1, 1), 'y': round(y1, 1),
                    'w': round(x2 - x1, 1), 'h': round(y2 - y1, 1),
                })
        annot = self._draw_boxes(img, targets)
        return targets, annot

    # ------------------------------------------------------------------ #
    def _demo_detect(self, img):
        """演示模式：随机生成目标框，便于无模型环境下演示平台流程。"""
        w, h = img.size
        rnd = random.Random(int(time.time() * 100) % 99999)
        classes = list(config.CLASS_CN.keys())
        n = rnd.randint(1, 4)
        targets = []
        for _ in range(n):
            cw, ch = w * rnd.uniform(0.08, 0.22), h * rnd.uniform(0.08, 0.22)
            x = rnd.uniform(0.03 * w, w - cw - 0.03 * w)
            y = rnd.uniform(0.03 * h, h - ch - 0.03 * h)
            cls = rnd.choice(classes)
            targets.append({
                'class': cls,
                'name': config.CLASS_CN[cls],
                'conf': round(rnd.uniform(0.6, 0.96), 2),
                'x': round(x, 1), 'y': round(y, 1),
                'w': round(cw, 1), 'h': round(ch, 1),
            })
        annot = self._draw_boxes(img, targets)
        return targets, annot

    # ------------------------------------------------------------------ #
    def _draw_boxes(self, img, targets):
        """在图上绘制检测框 + 中文标签。"""
        draw = ImageDraw.Draw(img)
        font = self._load_font(18)
        font_small = self._load_font(14)
        for i, t in enumerate(targets):
            color = config.CLASS_COLOR.get(t['class'], config.DEFAULT_CLASS_COLOR)
            # 兼容 BGR 十六进制 -> RGB
            color = color.lstrip('#')
            rgb = tuple(int(color[k:k + 2], 16) for k in (0, 2, 4))
            x, y, w, h = t['x'], t['y'], t['w'], t['h']
            draw.rectangle([x, y, x + w, y + h], outline=rgb, width=3)
            # 半透明填充
            overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            od.rectangle([x, y, x + w, y + h], fill=rgb + (28,))
            img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
            draw = ImageDraw.Draw(img)
            # 标签底
            label = f"{t['name']} {t['conf']:.2f}"
            lw = draw.textlength(label, font=font)
            ly = y - 26 if y >= 28 else y + 4
            draw.rectangle([x, ly, x + lw + 12, ly + 26], fill=rgb)
            draw.text((x + 6, ly + 3), label, fill='white', font=font)
            # 序号角标
            draw.ellipse([x + 6, y + 6, x + 6 + 22, y + 6 + 22], fill='white')
            draw.text((x + 10, y + 8), str(i + 1), fill='#0b1220',
                      font=font_small, anchor=None)
        return img

    def _load_font(self, size):
        if size in self._font_cache:
            return self._font_cache[size]
        font = None
        candidates = [
            r'C:\Windows\Fonts\msyh.ttc',
            r'C:\Windows\Fonts\msyhbd.ttc',
            r'C:\Windows\Fonts\simhei.ttf',
            r'C:\Windows\Fonts\simsun.ttc',
        ]
        for p in candidates:
            if os.path.exists(p):
                try:
                    font = ImageFont.truetype(p, size)
                    break
                except Exception:
                    font = None
        if font is None:
            font = ImageFont.load_default()
        self._font_cache[size] = font
        return font


_detector = Detector()


def get_detector():
    return _detector
