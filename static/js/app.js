/* ============================================================ */
/* app.js —— SPA 路由 / 时钟 / 模型状态 / 全局轮询              */
/* ============================================================ */
'use strict';

const PAGE_META = {
  dashboard:  { title: '数据总览', sub: '大田病虫害智能检测与预警平台 · 边缘AI监测站' },
  statistics: { title: '数据统计', sub: '多维数据分析 · 病害态势与趋势洞察' },
  warnings:   { title: '预警中心', sub: '四级预警分级 · 智能研判与处置建议' },
  knowledge:  { title: '农业知识库', sub: '六大作物病害 · 识别特征与综合防治' },
  settings:   { title: '系统设置', sub: '模型 / 检测参数 / 预警阈值 / 数据管理' },
  detect:     { title: '智能检测', sub: '图像与视频流识别 · 目标标注 · 防治建议' },
};

const Pages = {};

function initApp() {
  bindNav();
  bindModalClose();
  startClock();
  loadModelStatus();
  // 进入默认页
  switchPage('dashboard');
}

/* ---------------------------------------------------------- */
/* 路由                                                         */
/* ---------------------------------------------------------- */
function switchPage(name) {
  if (!PAGE_META[name]) name = 'dashboard';
  $$('.nav-item[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === name));
  $$('.page').forEach(p => p.classList.remove('active'));
  const page = $('#page-' + name);
  page.classList.add('active');
  $('#pageTitle').textContent = PAGE_META[name].title;
  $('#pageSub').textContent = PAGE_META[name].sub;

  const mod = Pages[name];
  if (mod) {
    if (!mod._init) { mod._init = true; mod.init && mod.init(); }
    mod.refresh && mod.refresh();
  }
  // 全站统一使用田野背景（农业知识库同款），保证视觉一致
  setBg('/static/img/bg-alt.jpg');
}

function setBg(url) {
  const bg = $('#bg');
  if (bg.dataset.src !== url) {
    bg.dataset.src = url;
    bg.style.backgroundImage = `url('${url}')`;
  }
}

function bindNav() {
  $$('.nav-item[data-page], .nav-detect').forEach(a => {
    a.addEventListener('click', () => switchPage(a.dataset.page));
  });
  $('#logoutBtn').addEventListener('click', () => {
    toast('已安全退出（演示模式）', 'info');
  });
  $('#bellBtn').addEventListener('click', () => switchPage('warnings'));
}

/* ---------------------------------------------------------- */
/* 时钟                                                         */
/* ---------------------------------------------------------- */
function startClock() {
  const el = $('#clock');
  const tick = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    el.textContent = `${p(d.getMonth() + 1)}-${p(d.getDate())} ${week} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  tick(); setInterval(tick, 1000);
}

/* ---------------------------------------------------------- */
/* 模型状态 / 徽章轮询                                          */
/* ---------------------------------------------------------- */
let _modelLoaded = false;
let _lastActiveWarn = -1;

function loadModelStatus() {
  fetchJSON('/api/health').then(d => {
    const m = d.model;
    const chip = $('#modelChip');
    chip.classList.remove('on', 'off', 'demo');
    if (m.loaded) { chip.classList.add('on'); chip.querySelector('span').textContent = '模型已加载 · 智能检测可用'; }
    else if (m.demo) { chip.classList.add('demo'); chip.querySelector('span').textContent = '演示模式 · 未加载YOLO'; }
    else { chip.classList.add('off'); chip.querySelector('span').textContent = '模型加载失败'; }
    _modelLoaded = m.loaded;
    if (window.DetectAPI) DetectAPI.setModelInfo(m);
  }).catch(() => {});
}

async function refreshBadges() {
  try {
    const d = await fetchJSON('/api/env/latest');
    const n = d.active_warnings || 0;
    const nb = $('#navWarnBadge'), bb = $('#bellBadge');
    nb.textContent = n; nb.classList.toggle('hidden', n === 0);
    bb.textContent = n; bb.classList.toggle('hidden', n === 0);
    if (n > _lastActiveWarn && _lastActiveWarn >= 0 && n > 0) {
      toast(`新增 ${n - _lastActiveWarn} 条预警，请及时查看`, 'err');
    }
    _lastActiveWarn = n;
    if (d.env) updateWeatherChip(d.env);
  } catch (e) { /* ignore */ }
}

function updateWeatherChip(env) {
  const el = $('#weatherChip');
  el.innerHTML = `${ICON('temp')}`;
  const t = Math.round(env.temperature);
  const h = Math.round(env.humidity);
  const span = document.createElement('span');
  span.textContent = `${t}°C · ${h}%RH`;
  el.appendChild(span);
}

/* 轮询：每个模块注册自己的刷新间隔 */
function startPolling() {
  refreshBadges();
  setInterval(refreshBadges, 8000);
  setInterval(() => {
    const active = $('.page.active');
    if (!active) return;
    const name = active.id.replace('page-', '');
    const mod = Pages[name];
    if (mod && mod.poll) mod.poll();
  }, 6000);
}

/* 全局导航到指定页面（供其它模块调用） */
function goPage(name) { switchPage(name); }

/* 兼容：若 DOMContentLoaded 已触发则直接启动 */
function boot() {
  if (window.__booted) return;
  window.__booted = true;
  try { initApp(); } catch (e) { console.error('initApp error:', e); }
  try { startPolling(); } catch (e) { console.error('startPolling error:', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// 前端错误兜底提示
window.addEventListener('error', e => {
  console.error('page error:', e.message, e.filename, e.lineno);
});
