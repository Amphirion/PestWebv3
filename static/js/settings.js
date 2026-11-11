/* ============================================================ */
/* settings.js —— 系统设置                                       */
/* ============================================================ */
'use strict';

Pages.settings = {
  _settings: {},

  init() {
    const el = $('#page-settings');
    el.innerHTML = `
      <div class="card glass-panel" data-anim style="margin-bottom:18px">
        <div class="card-title">${ICON('spark')} 快捷操作</div>
        <div class="icon-btns" id="quickActions"></div>
      </div>

      <div class="grid g-2" style="margin-bottom:18px">
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('cpu')} 模型信息</div>
          <div id="modelInfo" style="font-size:13px;color:var(--ink-dim);line-height:2"></div>
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn sm ghost" id="btnReload">${ICON('refresh')} 重新加载模型</button>
          </div>
        </div>
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('gear')} 检测参数</div>
          <div class="field">
            <label>置信度阈值：<b id="confVal">--</b></label>
            <input type="range" id="setConf" min="0.05" max="0.9" step="0.05">
            <div class="field-hint">过滤低于该置信度的检测框，推荐 0.25</div>
          </div>
          <div class="field">
            <label>IoU 交并比：<b id="iouVal">--</b></label>
            <input type="range" id="setIou" min="0.1" max="0.8" step="0.05">
            <div class="field-hint">NMS 重叠抑制阈值，推荐 0.45</div>
          </div>
          <div class="field">
            <label>推理尺寸 imgsz</label>
            <select class="select" id="setImgsz">
              <option value="320">320（最快）</option>
              <option value="640">640（推荐）</option>
              <option value="960">960（更精细）</option>
            </select>
          </div>
        </div>
      </div>

      <div class="grid g-2" style="margin-bottom:18px">
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('alert')} 环境预警阈值</div>
          <div class="grid g-2" style="gap:10px">
            <div class="field"><label>温度上限（℃）：<b id="thTempHigh">--</b></label>
              <input type="range" id="setTempHigh" min="25" max="45" step="1"></div>
            <div class="field"><label>温度下限（℃）：<b id="thTempLow">--</b></label>
              <input type="range" id="setTempLow" min="-10" max="15" step="1"></div>
            <div class="field"><label>湿度上限（%）：<b id="thHum">--</b></label>
              <input type="range" id="setHumHigh" min="60" max="100" step="1"></div>
            <div class="field"><label>土壤墒情下限（%）：<b id="thSoil">--</b></label>
              <input type="range" id="setSoilLow" min="5" max="60" step="1"></div>
          </div>
        </div>
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('database')} 监测站与环境模拟</div>
          <div class="field">
            <label>监测站名称</label>
            <input class="input" id="setStation" placeholder="智慧大田监测站 · 01">
          </div>
          <div class="field">
            <label>环境数据刷新间隔（秒）：<b id="intervalVal">--</b></label>
            <input type="range" id="setInterval" min="2" max="30" step="1">
            <div class="field-hint">接入真实传感器后即为采集频率</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
            <button class="btn sm" id="btnSaveSettings">${ICON('check')} 保存设置</button>
          </div>
        </div>
      </div>

      <div class="grid g-2">
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('trash')} 数据管理</div>
          <div style="font-size:13px;color:var(--ink-dim);line-height:1.9">
            可清空并重新生成一份演示数据（检测记录 / 预警 / 环境历史），便于展示与测试。
          </div>
          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn danger sm" id="btnResetData">${ICON('refresh')} 重置演示数据</button>
          </div>
        </div>
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('info')} 关于系统</div>
          <div style="font-size:13px;color:var(--ink-dim);line-height:2.1">
            <div><b>智农·慧眼</b> 大田病虫害智能检测与预警平台</div>
            <div>核心模型：YOLO11n · best.pt（6 类作物病害）</div>
            <div>技术栈：Flask + ECharts + 液体玻璃 UI</div>
            <div>环境数据：模拟器实时生成（可替换为真实传感器）</div>
            <div id="aboutVersion" style="color:var(--ink-faint)"></div>
          </div>
        </div>
      </div>
    `;

    this._bindQuickActions();
    this._bindControls();
  },

  _bindQuickActions() {
    const items = [
      { icon: 'scan', color: 'theme', label: '智能检测', action: 'detect' },
      { icon: 'chart', color: 'theme', label: '数据统计', action: 'statistics' },
      { icon: 'bell', color: 'theme', label: '预警中心', action: 'warnings' },
      { icon: 'book', color: 'theme', label: '知识库', action: 'knowledge' },
      { icon: 'refresh', color: 'theme', label: '重载模型', action: 'reload' },
      { icon: 'trash', color: 'theme', label: '重置数据', action: 'reset' },
    ];
    $('#quickActions').innerHTML = items.map(glassIconHTML).join('');
    $$('#quickActions .icon-btn').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.action;
      if (act === 'reload') this._reloadModel();
      else if (act === 'reset') this._resetData();
      else goPage(act);
    }));
  },

  _bindControls() {
    const bind = (id, fn) => $(id).addEventListener('input', fn);
    bind('#setConf', e => { $('#confVal').textContent = e.target.value; });
    bind('#setIou', e => { $('#iouVal').textContent = e.target.value; });
    bind('#setTempHigh', e => { $('#thTempHigh').textContent = e.target.value; });
    bind('#setTempLow', e => { $('#thTempLow').textContent = e.target.value; });
    bind('#setHumHigh', e => { $('#thHum').textContent = e.target.value; });
    bind('#setSoilLow', e => { $('#thSoil').textContent = e.target.value; });
    bind('#setInterval', e => { $('#intervalVal').textContent = e.target.value; });

    $('#btnReload').addEventListener('click', () => this._reloadModel());
    $('#btnResetData').addEventListener('click', () => this._resetData());
    $('#btnSaveSettings').addEventListener('click', () => this._save());
  },

  async refresh() {
    try {
      const d = await fetchJSON('/api/settings');
      this._settings = d.settings || {};
      const s = this._settings;
      $('#confVal').textContent = s.conf; $('#setConf').value = s.conf;
      $('#iouVal').textContent = s.iou; $('#setIou').value = s.iou;
      $('#setImgsz').value = s.imgsz || '640';
      $('#thTempHigh').textContent = s.env_temp_high; $('#setTempHigh').value = s.env_temp_high;
      $('#thTempLow').textContent = s.env_temp_low; $('#setTempLow').value = s.env_temp_low;
      $('#thHum').textContent = s.env_hum_high; $('#setHumHigh').value = s.env_hum_high;
      $('#thSoil').textContent = s.env_soil_low; $('#setSoilLow').value = s.env_soil_low;
      $('#intervalVal').textContent = s.interval; $('#setInterval').value = s.interval;
      $('#setStation').value = s.station || '';

      const m = d.model || {};
      const info = `
        <div><b>状态：</b>
          ${m.loaded ? '<span class="badge green">已加载</span>' : m.demo ? '<span class="badge orange">演示模式</span>' : '<span class="badge red">未加载</span>'}</div>
        <div><b>模型路径：</b><span style="word-break:break-all;color:var(--ink-faint)">${esc(m.path)}</span></div>
        <div><b>类别：</b>${(m.classes || []).length} 类 — ${(m.classes || []).map(c => esc(c)).join(' · ')}</div>
        ${m.load_time ? `<div><b>加载耗时：</b>${m.load_time}s</div>` : ''}
        ${m.error ? `<div style="color:#fca5a5"><b>提示：</b>${esc(m.error)}。当前未安装 ultralytics，系统已自动进入演示模式（检测结果为模拟数据）。请在 yolo11 环境中运行（conda activate yolo11 → pip install -r requirements.txt → python app.py），或点击下方"重新加载模型"。</div>` : ''}
      `;
      $('#modelInfo').innerHTML = info;
    } catch (e) {
      toast('设置加载失败：' + e.message, 'err');
    }
  },

  async _save() {
    const payload = {
      conf: $('#setConf').value,
      iou: $('#setIou').value,
      imgsz: $('#setImgsz').value,
      station: $('#setStation').value.trim() || '智慧大田监测站 · 01',
      interval: $('#setInterval').value,
      env_temp_high: $('#setTempHigh').value,
      env_temp_low: $('#setTempLow').value,
      env_hum_high: $('#setHumHigh').value,
      env_soil_low: $('#setSoilLow').value,
    };
    try {
      await fetchJSON('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      toast('设置已保存', 'ok');
    } catch (e) { toast('保存失败：' + e.message, 'err'); }
  },

  async _reloadModel() {
    toast('正在重新加载模型...', 'info');
    try {
      const d = await fetchJSON('/api/model/reload', { method: 'POST' });
      toast(d.model.loaded ? '模型加载成功' : '模型加载失败（进入演示模式）', d.model.loaded ? 'ok' : 'err');
      loadModelStatus();
      this.refresh();
    } catch (e) { toast('操作失败：' + e.message, 'err'); }
  },

  async _resetData() {
    openModal(`
      <div class="modal-head"><div class="modal-title">重置演示数据</div>
        <button class="modal-close" type="button">${ICON('close')}</button></div>
      <div style="font-size:14px;color:var(--ink-dim);line-height:1.9">
        此操作将<strong style="color:#fca5a5">清空</strong>现有的检测记录、预警与环境数据，并重新生成一套演示数据。确定继续吗？
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px">
        <button class="btn ghost" type="button" data-close>取消</button>
        <button class="btn danger" type="button" id="confirmReset">确认重置</button>
      </div>`);
    $('#confirmReset').addEventListener('click', async () => {
      try {
        await fetchJSON('/api/data/reset', { method: 'POST' });
        toast('演示数据已重置', 'ok');
        closeModal();
        this.refresh();
        const active = Pages.dashboard;
        if (active) active.refresh();
      } catch (e) { toast('重置失败：' + e.message, 'err'); }
    });
  },
};
