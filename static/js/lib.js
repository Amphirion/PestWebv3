/* ============================================================ */
/* lib.js —— 工具函数 / SVG 图标 / 滚筒计数器 / 玻璃图标 / 弹窗  */
/* ============================================================ */
'use strict';

const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch (e) { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function fmtTime(s) {
  if (!s) return '';
  const d = new Date(s.replace(/-/g, '/'));
  if (isNaN(d)) return s;
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------------------------------------------------- */
/* SVG 图标库（Feather 风格描边）                               */
/* ---------------------------------------------------------- */
const ICON = (() => {
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l3-4 3 3 4-6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.5"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    temp: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
    drop: '<path d="M12 2.7S6 9.4 6 14a6 6 0 0 0 12 0c0-4.6-6-11.3-6-11.3z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    soil: '<path d="M12 3l5 8a6 6 0 1 1-10 0z"/><path d="M9 13a3 3 0 0 0 3 3"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    rice: '<path d="M2 22h20"/><path d="M12 22v-6"/><path d="M12 16c0-2 1-3.5 3-4 2 .5 3 2 3 4"/><path d="M7 16c0-2 1-3.5 3-4 2 .5 3 2 3 4"/><path d="M17 16c0-2 1-3.5 3-4 2 .5 3 2 3 4"/><path d="M12 12c-2-2-1.5-5 1-6 2.5 1 3 4 1 6"/>',
    corn: '<path d="M8 22c0-6 2-10 4-14"/><path d="M16 22c0-6-2-10-4-14"/><path d="M12 8c-2-1-3-3-3-5 3 0 5 1.5 5 4 0-2.5 2-4 5-4 0 2-1 4-3 5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    spark: '<path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  };
  const cache = {};
  return (name, cls = 'icon') => {
    if (!P[name]) name = 'info';
    const key = name + '|' + cls;
    if (!cache[key]) {
      cache[key] = `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[name]}</svg>`;
    }
    return cache[key];
  };
})();

/* ---------------------------------------------------------- */
/* 等级颜色（统一为蓝绿主题系，用明度区分层级）                  */
/* ---------------------------------------------------------- */
const LEVEL_META = {
  red:    { cn: '红色', color: 'rgba(74,222,128,.9)' },
  orange: { cn: '橙色', color: 'rgba(56,230,210,.9)' },
  yellow: { cn: '黄色', color: 'rgba(125,211,252,.9)' },
  blue:   { cn: '蓝色', color: 'rgba(56,189,248,.95)' },
};

/* 主题蓝绿渐变（全局统一主色） */
const THEME_GRAD = 'linear-gradient(135deg,#34d399,#0ea5e9)';
const THEME_SOFT = 'linear-gradient(145deg, rgba(74,222,128,.34), rgba(56,189,248,.3))';

/* 严重程度 -> 主题系标签样式 */
const SEV_TAG = {
  '无':   { bg: 'rgba(74,222,128,.12)', fg: '#86efac', bd: 'rgba(74,222,128,.35)' },
  '轻度': { bg: 'rgba(125,211,252,.14)', fg: '#7dd3fc', bd: 'rgba(125,211,252,.4)' },
  '中度': { bg: 'rgba(94,234,212,.16)', fg: '#5eead4', bd: 'rgba(94,234,212,.45)' },
  '重度': { bg: 'rgba(74,222,128,.22)', fg: '#a7f3d0', bd: 'rgba(74,222,128,.6)' },
};
function sevStyle(sev, fallback) {
  const s = SEV_TAG[sev] || SEV_TAG['无'];
  return s || fallback;
}

/* ---------------------------------------------------------- */
/* 滚筒数字计数器                                               */
/* 参考：Counter.js 资源 —— 每个数字位由 0-9 竖向排列滚动        */
/* ---------------------------------------------------------- */
class RollerCounter {
  constructor(el, { value = 0, fontSize = 40, gap = 4, padding = 0,
                   duration = 0.7, gradient = 10, from = 'rgba(2,8,15,.55)', to = 'transparent' } = {}) {
    this.el = el;
    this.fontSize = fontSize;
    this.gap = gap;
    this.digitH = fontSize + padding;
    this.duration = duration;
    this.value = value;
    this._render(value);
    this.grad = { from, to, h: gradient };
  }

  _render(v) {
    const digits = String(Math.max(0, Math.round(v))).split('');
    this.el.innerHTML = '';
    this.el.style.display = 'flex';
    this.el.style.fontSize = this.fontSize + 'px';
    this.el.style.fontWeight = '700';
    this.el.style.gap = this.gap + 'px';
    this.el.style.letterSpacing = '-1px';
    this.el.style.fontVariantNumeric = 'tabular-nums';
    for (const ch of digits) {
      const col = document.createElement('span');
      col.className = 'counter-digit';
      col.style.height = this.digitH + 'px';
      col.style.width = '0.62em';
      for (let i = 0; i < 10; i++) {
        const n = document.createElement('span');
        n.className = 'counter-number';
        n.textContent = i;
        n.style.height = this.digitH + 'px';
        // 关键：每个数字按索引纵向堆叠成滚筒（0 在顶、9 在底）
        n.style.top = (i * this.digitH) + 'px';
        col.appendChild(n);
      }
      col.dataset.target = +ch;
      this.el.appendChild(col);
    }
    this._apply(0);
  }

  _apply(animate = true) {
    $$('.counter-digit', this.el).forEach(col => {
      const target = +col.dataset.target;
      // 直接下滚 target 位，保证目标数字正好落在可视窗口
      const y = target * this.digitH;
      $$('.counter-number', col).forEach(n => {
        n.style.transition = animate ? `transform ${this.duration}s cubic-bezier(.22,.61,.36,1)` : 'none';
        n.style.transform = `translateY(${-y}px)`;
      });
    });
  }

  set(v) {
    v = Math.max(0, Math.round(v));
    const old = String(this.value);
    const next = String(v);
    if (old === next) return;
    this.value = v;
    // 位数变化时重新渲染
    if (old.length !== next.length) {
      this._render(v); this._apply(true); return;
    }
    $$('.counter-digit', this.el).forEach((col, i) => {
      col.dataset.target = +next[i];
    });
    this._apply(true);
  }
}

/* ---------------------------------------------------------- */
/* 玻璃图标按钮（参考 GlassIcons 资源）                          */
/* ---------------------------------------------------------- */
const GRADIENTS = {
  theme:  'linear-gradient(135deg,#34d399,#0ea5e9)',
  blue:   'linear-gradient(135deg,#38bdf8,#0ea5e9)',
  purple: 'linear-gradient(135deg,#5eead4,#0ea5e9)',
  red:    'linear-gradient(135deg,#34d399,#0ea5e9)',
  indigo: 'linear-gradient(135deg,#5eead4,#38bdf8)',
  orange: 'linear-gradient(135deg,#34d399,#38bdf8)',
  green:  'linear-gradient(135deg,#34d399,#0ea5e9)',
};

function glassIconHTML(item) {
  const bg = GRADIENTS[item.color] || item.color || 'linear-gradient(135deg,#34d399,#0ea5e9)';
  return `
  <button class="icon-btn" type="button" data-action="${item.action || ''}" aria-label="${esc(item.label)}">
    <span class="icon-btn__back" style="background:${bg}"></span>
    <span class="icon-btn__front">
      <span class="icon-btn__icon" aria-hidden="true">${ICON(item.icon)}</span>
    </span>
    <span class="icon-btn__label">${esc(item.label)}</span>
  </button>`;
}

/* ---------------------------------------------------------- */
/* Toast                                                        */
/* ---------------------------------------------------------- */
function toast(msg, type = 'info') {
  const wrap = $('#toastWrap');
  const icons = { ok: 'check', err: 'alert', info: 'info' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${ICON(icons[type] || 'info')}<span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .4s, transform .4s';
    t.style.opacity = '0'; t.style.transform = 'translateX(40px)';
    setTimeout(() => t.remove(), 420);
  }, 3200);
}

/* ---------------------------------------------------------- */
/* 弹窗                                                         */
/* ---------------------------------------------------------- */
function openModal(html) {
  const mask = $('#modalMask');
  mask.innerHTML = `<div class="modal">${html}</div>`;
  mask.classList.add('show');
}
function closeModal() {
  const mask = $('#modalMask');
  mask.classList.remove('show');
}
function bindModalClose() {
  const mask = $('#modalMask');
  mask.addEventListener('click', e => {
    if (e.target === mask || e.target.closest('.modal-close')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ---------------------------------------------------------- */
/* 图表主题（ECharts 暗色玻璃）                                 */
/* ---------------------------------------------------------- */
const CHART_THEME = {
  textStyle: { color: 'rgba(255,255,255,.85)', fontFamily: 'Inter, Microsoft YaHei, sans-serif' },
  grid: { borderColor: 'rgba(255,255,255,.08)' },
  tooltip: {
    backgroundColor: 'rgba(12,26,36,.92)', borderColor: 'rgba(255,255,255,.18)',
    textStyle: { color: '#fff', fontSize: 12 },
    axisPointer: { lineStyle: { color: 'rgba(255,255,255,.2)' } },
  },
  legend: { textStyle: { color: 'rgba(255,255,255,.75)' } },
};
