/* ============================================================ */
/* warnings.js —— 预警中心                                       */
/* ============================================================ */
'use strict';

Pages.warnings = {
  _filter: 'all',
  _data: [],

  init() {
    const el = $('#page-warnings');
    el.innerHTML = `
      <div class="card glass-panel" data-anim style="margin-bottom:18px;padding:14px 20px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          ${['all', 'red', 'orange', 'yellow', 'blue', 'resolved'].map(k =>
            `<button class="chip warn-filter" data-f="${k}" ${k === 'all' ? 'style="background:rgba(255,255,255,.26)"' : ''}>${({ all: '全部', red: '红色', orange: '橙色', yellow: '黄色', blue: '蓝色', resolved: '已处理' })[k]}</button>`
          ).join('')}
          <span class="tag" style="margin-left:auto;color:var(--ink-faint);font-size:12.5px" id="warnCount"></span>
        </div>
      </div>

      <div class="grid g-4" style="margin-bottom:18px" id="warnSummary"></div>

      <div class="grid" style="grid-template-columns:1.65fr 1fr;align-items:start">
        <div class="col">
          <div class="list" id="warnList" style="display:flex;flex-direction:column;gap:12px"></div>
        </div>
        <div class="col">
          <div class="card glass-panel" data-anim>
            <div class="card-title">${ICON('info')} 预警规则说明</div>
            <div style="font-size:13px;color:var(--ink-dim);line-height:1.9" id="ruleDesc"></div>
          </div>
        </div>
      </div>
    `;

    $$('.warn-filter', el).forEach(b => b.addEventListener('click', () => {
      this._filter = b.dataset.f;
      $$('.warn-filter', el).forEach(x => x.style.background = '');
      b.style.background = 'rgba(255,255,255,.26)';
      this.render();
    }));

    this._loadRules();
  },

  async _loadRules() {
    try {
      const s = await fetchJSON('/api/settings');
      const st = s.settings;
      const rules = [
        `温度 ≥ ${st.env_temp_high}℃ 或 ≤ ${st.env_temp_low}℃ 触发环境预警`,
        `湿度 ≥ ${st.env_hum_high}% 触发高湿病害风险预警`,
        `土壤墒情 ≤ ${st.env_soil_low}% 触发干旱预警`,
        `光照 ≤ ${st.env_light_low} lx 触发弱光提示`,
        `检测到目标数 ≥ 6 或最高置信度 ≥ 0.90 → 红色（重度）`,
        `目标数 ≥ 3 或最高置信度 ≥ 0.75 → 橙色（中度）`,
        `其余检出 → 黄色（轻度），未检出 → 蓝色（良好）`,
      ];
      $('#ruleDesc').innerHTML = rules.map((r, i) => `<div style="display:flex;gap:10px;margin-bottom:8px"><span class="badge gray" style="flex:none">${i + 1}</span><span>${esc(r)}</span></div>`).join('');
    } catch (e) { /* ignore */ }
  },

  async refresh() {
    try {
      const d = await fetchJSON('/api/warnings?status=all');
      this._data = d.warnings || [];
      this.render();
    } catch (e) {
      toast('预警数据加载失败：' + e.message, 'err');
    }
  },

  render() {
    const all = this._data;
    // 汇总
    const cnt = k => all.filter(w => w.level === k && w.status === 'active').length;
    const summary = [
      { k: 'red', n: cnt('red'), label: '红色预警', icon: 'alert' },
      { k: 'orange', n: cnt('orange'), label: '橙色预警', icon: 'alert' },
      { k: 'yellow', n: cnt('yellow'), label: '黄色预警', icon: 'alert' },
      { k: 'resolved', n: all.filter(w => w.status === 'resolved').length, label: '已处理', icon: 'check' },
    ];
    $('#warnSummary').innerHTML = summary.map(s => `
      <div class="card glass-panel stat-card" style="padding:16px 20px">
        <div class="stat-label" style="color:${LEVEL_META[s.k] ? LEVEL_META[s.k].color : 'var(--ink-faint)'}">${esc(s.label)}</div>
        <div class="stat-value" style="font-size:34px;margin-top:6px">${s.n}<small style="font-size:13px;color:var(--ink-faint)"> 条</small></div>
      </div>`).join('');

    // 过滤
    let list = all;
    if (this._filter !== 'all') {
      list = this._filter === 'resolved'
        ? all.filter(w => w.status === 'resolved')
        : all.filter(w => w.level === this._filter && w.status === 'active');
    }
    // 只保留前 2 条预警展示，保持界面简洁专业
    const shown = list.slice(0, 2);
    $('#warnCount').textContent = list.length > 2 ? `共 ${list.length} 条（仅显示最新 2 条）` : `共 ${list.length} 条`;

    const host = $('#warnList');
    if (!shown.length) {
      host.innerHTML = `<div class="card glass-panel empty">${ICON('check')}<div>没有符合条件的预警</div></div>`;
      return;
    }

    host.innerHTML = shown.map(w => `
      <div class="card glass-panel warn-card ${w.level} ${w.status === 'resolved' ? 'resolved' : ''}" data-id="${w.id}">
        <div class="warn-title">
          <span class="badge ${w.level}">${LEVEL_META[w.level] ? LEVEL_META[w.level].cn : '未知'}</span>
          ${esc(w.title)}
        </div>
        <div class="warn-content">${esc(w.content)}</div>
        <div class="warn-advice" style="display:none">${ICON('info')} ${esc(w.advice)}</div>
        <div class="warn-meta">
          <span>${fmtTime(w.created_at)}</span>
          <span>来源：${w.source === 'env' ? '环境监测' : (w.source === 'detection' ? '智能检测' : '系统')}</span>
          ${w.resolved_at ? `<span>已处理：${fmtTime(w.resolved_at)}</span>` : ''}
          <span style="margin-left:auto;display:flex;gap:8px">
            <button class="btn ghost sm warn-toggle" type="button">处置建议</button>
            ${w.status === 'active' ? `<button class="btn sm warn-resolve" type="button">${ICON('check')} 处理</button>` : ''}
            ${w.status === 'resolved' ? `<button class="btn ghost sm warn-undo" type="button">${ICON('refresh')} 撤销</button>` : ''}
          </span>
        </div>
      </div>`).join('');

    $$('.warn-toggle', host).forEach(b => b.addEventListener('click', () => {
      const adv = b.closest('.warn-card').querySelector('.warn-advice');
      const show = adv.style.display !== 'block';
      adv.style.display = show ? 'block' : 'none';
      b.textContent = show ? '收起建议' : '处置建议';
    }));
    $$('.warn-resolve', host).forEach(b => b.addEventListener('click', async () => {
      const id = b.closest('.warn-card').dataset.id;
      try {
        await fetchJSON(`/api/warnings/${id}/resolve`, { method: 'POST' });
        toast('预警已处理', 'ok');
        this.refresh();
      } catch (e) { toast('操作失败：' + e.message, 'err'); }
    }));
    $$('.warn-undo', host).forEach(b => b.addEventListener('click', async () => {
      const id = b.closest('.warn-card').dataset.id;
      try {
        await fetchJSON(`/api/warnings/${id}/undo`, { method: 'POST' });
        toast('已撤销处理，预警恢复待处理', 'ok');
        this.refresh();
      } catch (e) { toast('操作失败：' + e.message, 'err'); }
    }));
  },
};
