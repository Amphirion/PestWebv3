/* ============================================================ */
/* statistics.js —— 数据统计（ECharts 多维分析）                 */
/* ============================================================ */
'use strict';

Pages.statistics = {
  _charts: {},
  _days: 7,

  init() {
    const el = $('#page-statistics');
    el.innerHTML = `
      <div class="card glass-panel" data-anim style="margin-bottom:18px;padding:14px 20px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--ink-dim);font-weight:500">统计周期：</span>
          ${[7, 14, 30].map(d => `<button class="chip stat-days" data-days="${d}" ${d === 7 ? 'style="background:rgba(255,255,255,.26)"' : ''}>近 ${d} 天</button>`).join('')}
          <span class="tag" style="margin-left:auto;color:var(--ink-faint);font-size:12.5px" id="statTotal"></span>
        </div>
      </div>

      <div class="grid g-2" style="margin-bottom:18px">
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('chart')} 检测趋势</div>
          <div class="chart-box" id="chartTrend" style="height:280px"></div>
        </div>
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('target')} 病害类别分布</div>
          <div class="chart-box" id="chartCategory" style="height:280px"></div>
        </div>
      </div>

      <div class="grid g-2" style="margin-bottom:18px">
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('alert')} 病害严重程度</div>
          <div class="chart-box" id="chartSeverity" style="height:270px"></div>
        </div>
        <div class="card glass-panel" data-anim>
          <div class="card-title">${ICON('bell')} 预警等级分布</div>
          <div class="chart-box" id="chartWarnLevel" style="height:270px"></div>
        </div>
      </div>

      <div class="card glass-panel" data-anim>
        <div class="card-title">${ICON('activity')} 环境数据趋势（72 小时）</div>
        <div class="chart-box" id="chartEnv" style="height:300px"></div>
      </div>
    `;

    $$('.stat-days', el).forEach(b => b.addEventListener('click', () => {
      this._days = +b.dataset.days;
      $$('.stat-days', el).forEach(x => x.style.background = '');
      b.style.background = 'rgba(255,255,255,.26)';
      this.refresh();
    }));

    // 窗口自适应
    window.addEventListener('resize', debounce(() => {
      Object.values(this._charts).forEach(c => c && c.resize());
    }, 300));
  },

  async refresh() {
    try {
      const d = await fetchJSON(`/api/statistics?days=${this._days}`);
      $('#statTotal').textContent = `共 ${d.total} 条检测记录`;
      this._trend(d.trend);
      this._category(d.categories);
      this._severity(d.severity);
      this._warnLevel(d.warnings_level);
      this._env(d.env_history);
    } catch (e) {
      toast('统计数据加载失败：' + e.message, 'err');
    }
  },

  _chart(name) {
    if (!this._charts[name]) this._charts[name] = echarts.init($('#' + name));
    return this._charts[name];
  },

  _trend(data) {
    const c = this._chart('chartTrend');
    c.setOption({
      ...CHART_THEME,
      tooltip: { ...CHART_THEME.tooltip, trigger: 'axis' },
      grid: { left: 42, right: 16, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: data.map(x => x.date),
               axisLine: { lineStyle: { color: 'rgba(255,255,255,.18)' } },
               axisLabel: { color: 'rgba(255,255,255,.55)' }, axisTick: { show: false } },
      yAxis: { type: 'value', minInterval: 1,
               splitLine: { lineStyle: { color: 'rgba(255,255,255,.07)' } },
               axisLabel: { color: 'rgba(255,255,255,.55)' } },
      series: [{
        name: '检测次数', type: 'bar', data: data.map(x => x.count),
        barWidth: '46%',
        itemStyle: { borderRadius: [8, 8, 0, 0],
                     color: new echarts.graphic.LinearGradient(0, 0, 0, 1,
                       [{ offset: 0, color: '#4ade80' }, { offset: 1, color: 'rgba(56,189,248,.35)' }]) },
        label: { show: true, position: 'top', color: 'rgba(255,255,255,.8)', fontSize: 11 },
      }],
    }, true);
  },

  _category(data) {
    const c = this._chart('chartCategory');
    // 主题蓝绿渐变色板（同色系深浅递进，保持专业统一）
    const colors = ['#34d399', '#4ade80', '#5eead4', '#38bdf8', '#2dd4bf', '#0ea5e9', '#22d3ee'];
    c.setOption({
      ...CHART_THEME,
      tooltip: { ...CHART_THEME.tooltip, trigger: 'item', formatter: '{b}<br/>{c} 处（{d}%）' },
      legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,.7)', fontSize: 11 },
                type: 'scroll' },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '46%'],
        itemStyle: { borderRadius: 8, borderColor: 'rgba(3,11,17,.6)', borderWidth: 2 },
        label: { color: 'rgba(255,255,255,.8)', fontSize: 11 },
        data: data.map((x, i) => ({ name: x.name, value: x.value,
          itemStyle: { color: colors[i % colors.length] } })),
      }],
    }, true);
  },

  _severity(data) {
    const c = this._chart('chartSeverity');
    const colors = { '轻度': '#7dd3fc', '中度': '#5eead4', '重度': '#34d399', '无': '#38bdf8' };
    c.setOption({
      ...CHART_THEME,
      tooltip: { ...CHART_THEME.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,.07)' } },
               axisLabel: { color: 'rgba(255,255,255,.55)' } },
      yAxis: { type: 'category', data: data.map(x => x.name),
               axisLine: { lineStyle: { color: 'rgba(255,255,255,.18)' } },
               axisLabel: { color: 'rgba(255,255,255,.75)', fontSize: 13 } },
      series: [{
        type: 'bar', data: data.map(x => ({
          value: x.value, itemStyle: { color: colors[x.name] || '#38bdf8', borderRadius: [0, 8, 8, 0] } })),
        barWidth: 22,
        label: { show: true, position: 'right', color: 'rgba(255,255,255,.8)' },
      }],
    }, true);
  },

  _warnLevel(data) {
    const c = this._chart('chartWarnLevel');
    const colors = { '红色': '#34d399', '橙色': '#5eead4', '黄色': '#7dd3fc', '蓝色': '#38bdf8' };
    c.setOption({
      ...CHART_THEME,
      tooltip: { ...CHART_THEME.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,.07)' } },
               axisLabel: { color: 'rgba(255,255,255,.55)' } },
      yAxis: { type: 'category', data: data.map(x => x.name),
               axisLine: { lineStyle: { color: 'rgba(255,255,255,.18)' } },
               axisLabel: { color: 'rgba(255,255,255,.75)', fontSize: 13 } },
      series: [{
        type: 'bar', data: data.map(x => ({
          value: x.value, itemStyle: { color: colors[x.name] || '#38bdf8', borderRadius: [0, 8, 8, 0] } })),
        barWidth: 22,
        label: { show: true, position: 'right', color: 'rgba(255,255,255,.8)' },
      }],
    }, true);
  },

  _env(history) {
    if (!history || history.length < 2) return;
    const c = this._chart('chartEnv');
    const step = Math.max(1, Math.floor(history.length / 96));
    const hist = history.filter((_, i) => i % step === 0);
    c.setOption({
      ...CHART_THEME,
      tooltip: { ...CHART_THEME.tooltip, trigger: 'axis' },
      legend: { data: ['温度°C', '湿度%', '光照(kx)', '墒情%'], bottom: 0,
                textStyle: { fontSize: 11, color: 'rgba(255,255,255,.92)' } },
      grid: { left: 44, right: 44, top: 30, bottom: 34 },
      xAxis: { type: 'category', data: hist.map(r => r.created_at.slice(5, 16)),
               boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(255,255,255,.18)' } },
               axisLabel: { color: 'rgba(255,255,255,.7)', fontSize: 10 } },
      yAxis: [
        { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } },
          axisLabel: { color: 'rgba(255,255,255,.75)', fontSize: 10 } },
        { type: 'value', splitLine: { show: false },
          axisLabel: { color: 'rgba(255,255,255,.75)', fontSize: 10, formatter: v => v / 1000 } },
      ],
      series: [
        { name: '温度°C', type: 'line', data: hist.map(r => r.temperature), smooth: true,
          showSymbol: false, lineStyle: { width: 2, color: '#5eead4' }, itemStyle: { color: '#5eead4' } },
        { name: '湿度%', type: 'line', data: hist.map(r => r.humidity), smooth: true,
          showSymbol: false, lineStyle: { width: 2, color: '#38bdf8' }, itemStyle: { color: '#38bdf8' } },
        { name: '光照(kx)', type: 'line', yAxisIndex: 1, data: hist.map(r => r.light), smooth: true,
          showSymbol: false, lineStyle: { width: 2, color: '#22d3ee' }, itemStyle: { color: '#22d3ee' } },
        { name: '墒情%', type: 'line', data: hist.map(r => r.soil), smooth: true,
          showSymbol: false, lineStyle: { width: 2, color: '#4ade80' }, itemStyle: { color: '#4ade80' } },
      ],
    }, true);
  },
};
