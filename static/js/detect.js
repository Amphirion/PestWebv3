/* ============================================================ */
/* detect.js —— 智能检测（核心页面）                              */
/* ============================================================ */
'use strict';

const DetectAPI = {
  setModelInfo(m) {
    this.model = m;
    const chip = $('#detectModelChip');
    if (chip) {
      chip.innerHTML = m.loaded
        ? '<span class="badge green">模型已加载</span>'
        : m.demo
          ? '<span class="badge orange">演示模式（未安装 ultralytics）</span>'
          : '<span class="badge red">模型未加载</span>';
    }
  },
};

Pages.detect = {
  _detecting: false,
  _stream: null,
  _loopTimer: null,

  init() {
    const el = $('#page-detect');
    el.innerHTML = `
      <div class="grid" style="grid-template-columns:0.95fr 1.5fr;align-items:start">
        <!-- ============ 左侧：输入 ============ -->
        <div class="col">
          <div class="card glass-panel" data-anim>
            <div class="card-title">${ICON('upload')} 上传图片 / 视频
              <span class="tag" id="detectModelChip"></span>
            </div>
            <label class="custum-file-upload" id="uploadZone">
              <div class="icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div class="text">
                <span>点击上传图片或视频</span>
                <small>支持 JPG / PNG / WEBP / BMP / MP4 / AVI，拖拽文件到此处亦可</small>
              </div>
              <input type="file" id="fileInput" accept="image/*,video/*">
            </label>

            <div style="margin-top:16px">
              <div style="font-size:13px;color:var(--ink-dim);font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:8px">${ICON('image', 'ic-sm')} 演示样本（点击即测）</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px" id="sampleGrid"></div>
            </div>
          </div>

          <div class="card glass-panel" data-anim style="margin-top:18px">
            <div class="card-title">${ICON('camera')} 实时摄像头检测
              <span class="tag">视频流输入</span>
            </div>
            <div style="position:relative;border-radius:16px;overflow:hidden;background:#06131d;min-height:190px;display:flex;align-items:center;justify-content:center" id="camBox">
              <video id="camVideo" autoplay playsinline muted style="width:100%;display:none"></video>
              <div id="camPlaceholder" style="color:var(--ink-fainter);font-size:13px;text-align:center;padding:26px;display:flex;flex-direction:column;align-items:center;gap:10px">
                ${ICON('camera', 'ic-lg')}<div>点击"开启摄像头"即可对田间画面进行实时病害检测</div>
              </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center">
              <button class="btn sm" id="camStart">${ICON('play')} 开启摄像头</button>
              <button class="btn ghost sm" id="camCapture" disabled>${ICON('scan')} 抓拍检测</button>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-dim);cursor:pointer;margin-left:auto">
                <span class="switch"><input type="checkbox" id="camLoop"><span class="track"></span></span>
                实时循环检测（每 3 秒）
              </label>
            </div>
          </div>
        </div>

        <!-- ============ 右侧：结果 ============ -->
        <div class="col">
          <div class="card glass-panel" data-anim>
            <div class="card-title">${ICON('target')} 检测结果
              <span class="tag" id="resultStatus">待检测</span>
            </div>
            <div id="resultArea">
              <div class="empty" style="padding:70px 10px">
                ${ICON('scan')}
                <div>请上传图片或打开摄像头，开始智能检测</div>
              </div>
            </div>
          </div>

          <div class="card glass-panel" data-anim style="margin-top:18px">
            <div class="card-title">${ICON('list')} 历史检测记录
              <a class="tag chip" style="cursor:pointer" data-goto="statistics">查看统计 →</a>
            </div>
            <div id="detectHistory"></div>
          </div>
        </div>
      </div>
    `;

    $$('[data-goto]', el).forEach(a => a.addEventListener('click', () => goPage(a.dataset.goto)));
    this._bindUpload();
    this._bindSamples();
    this._bindCamera();
  },

  /* ---------------- 上传 ---------------- */
  _bindUpload() {
    const zone = $('#uploadZone');
    const input = $('#fileInput');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag');
      if (e.dataTransfer.files.length) this._onFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => {
      if (input.files.length) this._onFile(input.files[0]);
      input.value = '';
    });
  },

  _bindSamples() {
    const grid = $('#sampleGrid');
    const names = ['neck_blast', 'rice_leaf_blast', 'brown_spot', 'corn_leaf_spot', 'corn_leaf_blight', 'corn_rust'];
    const cn = {
      neck_blast: '水稻细菌性条斑病（颈瘟）', rice_leaf_blast: '水稻叶斑病', brown_spot: '水稻棕色斑点',
      corn_leaf_spot: '玉米叶斑病', corn_leaf_blight: '玉米叶枯病', corn_rust: '玉米叶锈病',
    };
    // 缩略图短标签（保持网格整洁）
    const short = {
      neck_blast: '颈瘟', rice_leaf_blast: '水稻叶斑病', brown_spot: '水稻棕色斑点',
      corn_leaf_spot: '玉米叶斑病', corn_leaf_blight: '玉米叶枯病', corn_rust: '玉米叶锈病',
    };
    // 后端提供样本列表
    fetchJSON('/api/samples').then(d => {
      const list = d.samples || [];
      grid.innerHTML = list.map(s => `
        <div class="sample-item" data-src="${s.url}" data-name="${s.name}" title="${cn[s.name] || s.name}" style="cursor:pointer;border-radius:12px;overflow:hidden;border:1px solid var(--glass-line);position:relative;aspect-ratio:1.4;background:#06131d">
          <img src="${s.url}" alt="${s.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover">
          <span style="position:absolute;left:0;right:0;bottom:0;padding:3px 5px;font-size:10px;line-height:1.3;text-align:center;background:rgba(3,11,17,.72)">${short[s.name] || cn[s.name] || s.name}</span>
        </div>`).join('');
      $$('.sample-item', grid).forEach(it => it.addEventListener('click', () => {
        this._detectURL(it.dataset.src, it.dataset.name);
      }));
    }).catch(() => {
      grid.innerHTML = '<div style="grid-column:1/-1;color:var(--ink-fainter);font-size:12px">样本加载失败</div>';
    });
  },

  async _detectURL(url, name) {
    // 从服务器读取样本并检测（通过 fetch 下载后走统一流程）
    try {
      this._setLoading('正在检测：' + (name || '样本') + ' ...');
      const res = await fetch(url);
      const blob = await res.blob();
      this._runDetect(blob, name + '.jpg');
    } catch (e) { toast('样本加载失败：' + e.message, 'err'); }
  },

  _onFile(file) {
    const isVideo = file.type.startsWith('video') || /\.(mp4|avi|mov|mkv)$/i.test(file.name);
    this._setLoading('正在处理文件：' + file.name + ' ...');
    this._runDetect(file, file.name);
  },

  async _runDetect(blob, filename) {
    if (this._detecting) { toast('正在检测中，请稍候', 'info'); return; }
    this._detecting = true;
    this._setLoading('AI 模型推理中，请稍候...');
    try {
      const fd = new FormData();
      fd.append('file', blob, filename || 'upload.jpg');
      const d = await fetchJSON('/api/detect', { method: 'POST', body: fd });
      this._renderResult(d);
    } catch (e) {
      $('#resultArea').innerHTML = `
        <div class="empty">${ICON('alert')}<div style="color:#fca5a5">检测失败：${esc(e.message)}</div></div>`;
      $('#resultStatus').textContent = '检测失败';
    } finally {
      this._detecting = false;
      this.refreshHistory();
    }
  },

  _setLoading(text) {
    $('#resultArea').innerHTML = `
      <div style="position:relative;border-radius:16px;overflow:hidden;background:#06131d;min-height:260px;display:flex;align-items:center;justify-content:center">
        <div class="scanline"></div>
        <div style="text-align:center;color:var(--ink-dim);padding:20px">
          <div class="spin" style="width:38px;height:38px;margin:0 auto 14px;border-radius:50%;border:3px solid rgba(74,222,128,.25);border-top-color:#4ade80"></div>
          <div style="font-size:14px">${esc(text)}</div>
        </div>
      </div>`;
    $('#resultStatus').textContent = '检测中';
  },

  /* ---------------- 结果渲染 ---------------- */
  _renderResult(d) {
    // 严重程度统一主题蓝绿系
    const sevColor = { '无': '#4ade80', '轻度': '#7dd3fc', '中度': '#5eead4', '重度': '#34d399' }[d.severity] || '#38bdf8';
    $('#resultStatus').innerHTML = `<span class="badge ${d.level}">${d.level === 'blue' ? '良好' : (d.level === 'red' ? '红色预警' : d.level === 'orange' ? '橙色预警' : d.level === 'yellow' ? '黄色预警' : '良好')} · ${esc(d.severity)}</span>`;

    // 目标表格
    let targetRows = '';
    if (d.targets && d.targets.length) {
      targetRows = d.targets.map((t, i) => `
        <tr>
          <td style="padding:7px 6px;color:var(--ink-fainter)">${i + 1}</td>
          <td style="padding:7px 6px"><span class="badge green">${esc(t.name)}</span></td>
          <td style="padding:7px 6px;color:var(--ink-dim)">${esc(t.class)}</td>
          <td style="padding:7px 6px;font-variant-numeric:tabular-nums">${(t.conf * 100).toFixed(1)}%</td>
          <td style="padding:7px 6px;color:var(--ink-fainter);font-size:12px">${Math.round(t.x)},${Math.round(t.y)}</td>
        </tr>`).join('');
    }

    const framesHTML = d.frames && d.frames.length ? `
      <div style="display:flex;gap:8px;overflow-x:auto;margin-top:12px">
        ${d.frames.map(f => `<div style="flex:none;width:130px"><img src="${f.url}" style="width:100%;border-radius:10px;border:1px solid var(--glass-line)"><div style="font-size:11px;color:var(--ink-faint);text-align:center;margin-top:4px">帧 ${f.frame} · ${f.count} 目标</div></div>`).join('')}
      </div>` : '';

    $('#resultArea').innerHTML = `
      <div style="position:relative;border-radius:16px;overflow:hidden;background:#06131d;border:1px solid var(--glass-line)">
        <img src="${d.annotated_url || ''}" alt="检测结果" style="width:100%;display:block">
        <div style="position:absolute;left:12px;top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge" style="background:${sevColor}22;color:#fff;border:1px solid ${sevColor}66">${esc(d.summary)}</span>
          <span class="badge gray">风险 ${d.score || 0}/100</span>
          ${d.demo_mode ? '<span class="badge orange">演示模式</span>' : ''}
        </div>
      </div>
      ${framesHTML}

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
        <span class="badge" style="background:${sevColor}22;color:#fff;border:1px solid ${sevColor}66;font-size:13px">严重程度：${esc(d.severity)}</span>
        ${d.main_name ? `<span class="badge gray">主要病害：${esc(d.main_name)}</span>` : ''}
        ${Object.entries(d.counts || {}).map(([c, n]) => `<span class="badge gray">${esc(c)} × ${n}</span>`).join('')}
      </div>

      ${d.targets && d.targets.length ? `
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
        <thead><tr style="color:var(--ink-fainter);font-size:12px;text-align:left;border-bottom:1px solid var(--glass-line)">
          <th style="padding:7px 6px">#</th><th style="padding:7px 6px">病害</th>
          <th style="padding:7px 6px">类别</th><th style="padding:7px 6px">置信度</th><th style="padding:7px 6px">位置</th>
        </tr></thead>
        <tbody>${targetRows}</tbody>
      </table>` : ''}

      ${d.advice ? `
      <div style="margin-top:16px;border-radius:14px;background:rgba(94,234,212,.08);border:1px solid rgba(94,234,212,.25);padding:14px 16px">
        <div style="font-weight:700;font-size:13.5px;color:#99f6e4;margin-bottom:7px">${ICON('info')} 综合防治建议</div>
        <div style="font-size:13px;color:var(--ink-dim);line-height:1.9">${esc(d.advice)}</div>
        ${d.chemical ? `<div style="font-size:13px;color:#a7f3d0;line-height:1.9;margin-top:6px"><b>药剂参考：</b>${esc(d.chemical)}</div>` : ''}
      </div>` : ''}
    `;
  },

  /* ---------------- 摄像头 ---------------- */
  _bindCamera() {
    $('#camStart').addEventListener('click', () => this._toggleCamera());
    $('#camCapture').addEventListener('click', () => this._captureFrame());
    $('#camLoop').addEventListener('change', e => {
      if (e.target.checked) {
        this._loopTimer = setInterval(() => this._captureFrame(), 3000);
        toast('已开启实时循环检测', 'ok');
      } else {
        clearInterval(this._loopTimer); this._loopTimer = null;
      }
    });
  },

  async _toggleCamera() {
    const btn = $('#camStart');
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
      $('#camVideo').style.display = 'none';
      $('#camPlaceholder').style.display = '';
      $('#camCapture').disabled = true;
      $('#camLoop').checked = false;
      btn.innerHTML = `${ICON('play')} 开启摄像头`;
      toast('摄像头已关闭', 'info');
      return;
    }
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = $('#camVideo');
      v.srcObject = this._stream;
      v.style.display = '';
      $('#camPlaceholder').style.display = 'none';
      $('#camCapture').disabled = false;
      btn.innerHTML = `${ICON('close')} 关闭摄像头`;
      toast('摄像头已开启', 'ok');
    } catch (e) {
      toast('无法开启摄像头：' + e.message, 'err');
    }
  },

  async _captureFrame() {
    const v = $('#camVideo');
    if (!this._stream || v.readyState < 2) { toast('摄像头未就绪', 'info'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0);
    this._setLoading('实时画面 AI 推理中...');
    canvas.toBlob(blob => {
      if (blob) this._runDetect(blob, 'camera_' + Date.now() + '.jpg');
      else { this._detecting = false; toast('画面抓取失败', 'err'); }
    }, 'image/jpeg', 0.92);
  },

  /* ---------------- 历史 ---------------- */
  async refreshHistory() {
    try {
      const d = await fetchJSON('/api/records?limit=10');
      const host = $('#detectHistory');
      if (!d.records || !d.records.length) {
        host.innerHTML = `<div class="empty">${ICON('list')}<div>暂无检测记录</div></div>`;
        return;
      }
      host.innerHTML = d.records.map(r => {
        const cls = { '无': 'green', '轻度': 'yellow', '中度': 'orange', '重度': 'red' }[r.severity] || 'gray';
        return `
        <div class="list-row">
          <div class="list-icon" style="background:${THEME_SOFT}">${ICON('scan')}</div>
          <div class="list-main">
            <div class="list-title">${esc(r.summary)}</div>
            <div class="list-sub">${fmtTime(r.created_at)} · ${r.targets.length} 个目标</div>
          </div>
          <span class="badge ${cls}">${esc(r.severity)}</span>
        </div>`;
      }).join('');
    } catch (e) { /* ignore */ }
  },

  refresh() {
    this.refreshHistory();
    const m = (window.DetectAPI && DetectAPI.model);
    if (m) DetectAPI.setModelInfo(m);
  },
};
