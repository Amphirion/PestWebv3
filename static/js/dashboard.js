/* ============================================================ */
/* dashboard.js —— 数据总览                                      */
/* ============================================================ */
'use strict';

Pages.dashboard = {
  _counters: {},
  _envChart: null,

  init() {
    const el = $('#page-dashboard');
    el.innerHTML = `
      <div class="grid g-4" style="margin-bottom:18px">
        <div class="card glass-panel stat-card" data-anim>
          <div class="stat-label">今日累计检测</div>
          <div class="stat-icon" style="background:linear-gradient(145deg,rgba(74,222,128,.36),rgba(56,189,248,.32))">${ICON('scan')}</div>
          <div class="stat-value"><span data-roller="today"></span><small style="font-size:16px"> 次</small></div>
          <div class="stat-sub">近 24 小时检测次数</div>
        </div>
        <div class="card glass-panel stat-card" data-anim>
          <div class="stat-label">累计识别目标</div>
          <div class="stat-icon" style="background:linear-gradient(145deg,rgba(74,222,128,.32),rgba(94,234,212,.3))">${ICON('target')}</div>
          <div class="stat-value"><span data-roller="targets"></span><small style="font-size:16px"> 处</small></div>
          <div class="stat-sub">全部检测到的病害目标</div>
        </div>
        <div class="card glass-panel stat-card" data-anim>
          <div class="stat-label">活动预警</div>
          <div class="stat-icon" style="background:linear-gradient(145deg,rgba(125,211,252,.32),rgba(56,189,248,.3))">${ICON('bell')}</div>
          <div class="stat-value"><span data-roller="warnings"></span><small style="font-size:16px"> 条</small></div>
          <div class="stat-sub">当前未处理预警</div>
        </div>
        <div class="card glass-panel stat-card" data-anim>
          <div class="stat-label">综合风险指数</div>
          <div class="stat-icon" style="background:linear-gradient(145deg,rgba(74,222,128,.4),rgba(56,189,248,.36))">${ICON('alert')}</div>
          <div class="stat-value"><span data-roller="risk"></span><small style="font-size:16px"> /100</small></div>
          <div class="stat-sub" id="riskDesc">综合环境与病害评估</div>
        </div>
      </div>

      <div class="grid g-3" style="grid-template-columns:1.55fr 1fr">
        <div class="col">
          <div class="card glass-panel" data-anim>
            <div class="card-title">${ICON('activity')} 田间环境实时感知
              <span class="tag" id="envLiveTag"><i class="pulse" style="width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;margin-right:5px"></i>实时刷新</span>
            </div>
            <div class="grid g-2" id="envGrid" style="gap:12px"></div>
            <div class="chart-box" id="envTrend" style="height:210px;margin-top:14px"></div>
          </div>
        </div>
        <div class="col">
          <div class="card glass-panel" data-anim style="height:100%">
            <div class="card-title">${ICON('list')} 最近检测记录
              <a class="tag chip" style="cursor:pointer" data-goto="detect">去检测 →</a>
            </div>
            <div class="list" id="recentRecords"></div>
          </div>
        </div>
      </div>

      <div class="grid g-3" style="grid-template-columns:1.55fr 1fr;margin-top:18px">
        <div class="col">
          <div class="card glass-panel" data-anim>
            <div class="card-title">${ICON('bell')} 预警速览
              <a class="tag chip" style="cursor:pointer" data-goto="warnings">全部预警 →</a>
            </div>
            <div class="list" id="warnPreview"></div>
          </div>
        </div>
        <div class="col">
          <div class="card glass-panel" data-anim>
            <div class="card-title">${ICON('activity')} 系统动态</div>
            <div class="list" id="activityList"></div>
          </div>
        </div>
      </div>
    `;

    // 计数器初始化
    ['today', 'targets', 'warnings', 'risk'].forEach(k => {
      const host = $(`[data-roller="${k}"]`, el);
      this._counters[k] = new RollerCounter(host, { fontSize: 38, value: 0 });
    });

    // 环境卡占位
    const envGrid = $('#envGrid');
    const envDefs = [
      { key: 'temperature', name: '温度', unit: '°C', icon: 'temp', color: 'linear-gradient(135deg,#5eead4,#0ea5e9)', max: 45 },
      { key: 'humidity', name: '湿度', unit: '%', icon: 'drop', color: 'linear-gradient(135deg,#38bdf8,#2563eb)', max: 100 },
      { key: 'light', name: '光照', unit: 'lx', icon: 'sun', color: 'linear-gradient(135deg,#34d399,#0ea5e9)', max: 90000 },
      { key: 'soil', name: '土壤墒情', unit: '%', icon: 'soil', color: 'linear-gradient(135deg,#4ade80,#34d399)', max: 100 },
    ];
    envGrid.innerHTML = envDefs.map(d => `
      <div class="env-card" style="background:rgba(255,255,255,.07);border:1px solid var(--glass-line);border-radius:16px" data-env="${d.key}">
        <div class="env-top">
          <div class="env-name">${ICON(d.icon)} ${d.name}</div>
          <span class="badge gray" data-env-badge>--</span>
        </div>
        <div class="env-val">--<small>${d.unit}</small></div>
        <div class="env-bar"><i style="width:0%;background:${d.color}"></i></div>
        <div class="env-status"><span data-env-min>--</span><span data-env-max>--</span></div>
      </div>`).join('');
    this._envDefs = envDefs;

    // 点击跳转
    $$('[data-goto]', el).forEach(a => a.addEventListener('click', () => goPage(a.dataset.goto)));
  },

  async refresh() {
    try {
      const d = await fetchJSON('/api/overview');
      this.renderStats(d.stats);
      this.renderEnv(d.env, d.env_history);
      this.renderRecords(d.recent_records);
      this.renderWarnings(d.active_warnings);
      this.renderActivity(d.activity);
    } catch (e) {
      toast('数据总览加载失败：' + e.message, 'err');
    }
  },

  renderStats(s) {
    if (!s) return;
    this._counters.today.set(s.today_detections || 0);
    this._counters.targets.set(s.total_targets || 0);
    this._counters.warnings.set(s.active_warnings || 0);
    const risk = s.risk_score || 0;
    this._counters.risk.set(risk);
    const desc = $('#riskDesc');
    if (risk >= 70) desc.textContent = '风险较高，建议加强巡查';
    else if (risk >= 40) desc.textContent = '存在一定风险，请持续关注';
    else desc.textContent = '整体态势平稳，继续保持监测';
  },

  renderEnv(env, history) {
    if (!env) return;
    const defs = this._envDefs;
    defs.forEach(d => {
      const card = $(`[data-env="${d.key}"]`);
      if (!card) return;
      const v = env[d.key] || 0;
      card.querySelector('.env-val').innerHTML = `${v} <small>${d.unit}</small>`;
      const pct = Math.min(100, (v / d.max) * 100);
      card.querySelector('.env-bar i').style.width = pct + '%';
      card.querySelector('[data-env-badge]').textContent = this._envStatus(d.key, v);
    });
    // 趋势图
    if (history && history.length > 2) {
      const times = history.map(r => r.created_at.slice(5, 16));
      const temps = history.map(r => r.temperature);
      const hums = history.map(r => r.humidity);
      const soils = history.map(r => r.soil);
      if (!this._envChart) {
        this._envChart = echarts.init($('#envTrend'));
      }
      this._envChart.setOption({
        ...CHART_THEME,
        tooltip: { ...CHART_THEME.tooltip, trigger: 'axis' },
        legend: { data: ['温度°C', '湿度%', '墒情%'], bottom: 0, itemWidth: 12, itemHeight: 8,
                  textStyle: { color: 'rgba(255,255,255,.92)' } },
        grid: { left: 40, right: 14, top: 26, bottom: 34 },
        xAxis: { type: 'category', data: times, boundaryGap: false,
                 axisLine: { lineStyle: { color: 'rgba(255,255,255,.18)' } },
                 axisLabel: { color: 'rgba(255,255,255,.5)', fontSize: 10 },
                 axisTick: { show: false } },
        yAxis: [
          { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,.07)' } },
            axisLabel: { color: 'rgba(255,255,255,.5)', fontSize: 10 } },
        ],
        series: [
          { name: '温度°C', type: 'line', data: temps, smooth: true, showSymbol: false,
            lineStyle: { width: 2, color: '#5eead4' }, itemStyle: { color: '#5eead4' },
            areaStyle: { color: 'rgba(94,234,212,.14)' } },
          { name: '湿度%', type: 'line', data: hums, smooth: true, showSymbol: false,
            lineStyle: { width: 2, color: '#38bdf8' }, itemStyle: { color: '#38bdf8' } },
          { name: '墒情%', type: 'line', data: soils, smooth: true, showSymbol: false,
            lineStyle: { width: 2, color: '#4ade80' }, itemStyle: { color: '#4ade80' } },
        ],
      }, true);
    }
  },

  _envStatus(key, v) {
    if (key === 'temperature') return v >= 35 ? '偏高' : (v <= 5 ? '偏低' : '正常');
    if (key === 'humidity') return v >= 85 ? '偏高' : '正常';
    if (key === 'light') return v <= 50 ? '夜间' : (v <= 500 ? '弱光' : '正常');
    if (key === 'soil') return v <= 20 ? '干旱' : '正常';
    return '正常';
  },

  renderRecords(records) {
    const el = $('#recentRecords');
    if (!records || !records.length) {
      el.innerHTML = `<div class="empty">${ICON('scan')}<div>暂无检测记录</div></div>`;
      return;
    }
    el.innerHTML = records.map(r => `
      <div class="list-row">
        <div class="list-icon" style="background:${this._sevColor(r.severity)}">${ICON('scan')}</div>
        <div class="list-main">
          <div class="list-title">${esc(r.summary)}</div>
          <div class="list-sub">${fmtTime(r.created_at)}</div>
        </div>
        <span class="badge ${this._sevClass(r.severity)}">${esc(r.severity)}</span>
      </div>`).join('');
  },

  renderWarnings(warns) {
    const el = $('#warnPreview');
    if (!warns || !warns.length) {
      el.innerHTML = `<div class="empty">${ICON('check')}<div>当前无活动预警，田间态势良好</div></div>`;
      return;
    }
    el.innerHTML = warns.slice(0, 4).map(w => `
      <div class="list-row">
        <div class="list-icon" style="background:${THEME_SOFT}">${ICON('alert')}</div>
        <div class="list-main">
          <div class="list-title">${esc(w.title)}</div>
          <div class="list-sub">${fmtTime(w.created_at)}</div>
        </div>
        <span class="badge ${w.level}">${LEVEL_META[w.level].cn}</span>
      </div>`).join('');
  },

  renderActivity(list) {
    const el = $('#activityList');
    if (!list || !list.length) {
      el.innerHTML = `<div class="empty">${ICON('info')}<div>暂无动态</div></div>`;
      return;
    }
    el.innerHTML = list.slice(0, 6).map(a => `
      <div class="list-row">
        <div class="list-icon" style="background:rgba(56,189,248,.22)">${ICON('activity')}</div>
        <div class="list-main">
          <div class="list-title" style="font-size:13px">${esc(a.action)}</div>
          <div class="list-sub">${esc(a.detail)} · ${fmtTime(a.created_at)}</div>
        </div>
      </div>`).join('');
  },

  _sevClass(s) {
    return { '无': 'green', '轻度': 'yellow', '中度': 'orange', '重度': 'red' }[s] || 'gray';
  },
  _sevColor(s) {
    return { '无': 'rgba(74,222,128,.16)', '轻度': 'rgba(125,211,252,.2)',
             '中度': 'rgba(94,234,212,.24)', '重度': 'rgba(74,222,128,.3)' }[s] || 'rgba(255,255,255,.12)';
  },

  // 6 秒轮询只更新环境与记录
  poll() { this.refresh(); },
};
