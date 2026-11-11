/* ============================================================ */
/* knowledge.js —— 农业知识库（3D 封面流 + 卡片列表 + 详情弹窗）  */
/* ============================================================ */
'use strict';

Pages.knowledge = {
  _data: [],
  _filter: 'all',
  _query: '',
  _active: 0,
  _autoTimer: null,

  init() {
    const el = $('#page-knowledge');
    el.innerHTML = `
      <div class="card glass-panel" data-anim style="margin-bottom:18px;padding:14px 20px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="position:relative;flex:1;min-width:200px">
            <div class="input" id="kbSearch" contenteditable="true" style="padding-left:40px" data-ph="搜索病害名称..."></div>
            <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--ink-faint)">${ICON('search')}</span>
          </div>
          ${['all', '水稻', '玉米'].map(k =>
            `<button class="chip kb-filter" data-f="${k}" ${k === 'all' ? 'style="background:rgba(255,255,255,.26)"' : ''}>${k === 'all' ? '全部作物' : k}</button>`
          ).join('')}
        </div>
      </div>

      <div class="card glass-panel" data-anim style="margin-bottom:18px">
        <div class="card-title">${ICON('book')} 病害知识 · 3D 浏览
          <span class="tag" id="kbCarouselName"></span>
        </div>
        <div id="kbCarousel"></div>
        <div class="carousel-indicators-container">
          <div class="carousel-indicators" id="kbDots"></div>
        </div>
      </div>

      <div class="grid g-3" id="kbGrid"></div>
    `;

    // 搜索（用 input 代替 contenteditable，避免兼容问题）
    const searchHost = $('#kbSearch');
    const realInput = document.createElement('input');
    realInput.className = 'input';
    realInput.placeholder = '搜索病害名称...';
    realInput.style.cssText = 'padding-left:40px;display:block';
    searchHost.replaceWith(realInput);
    realInput.addEventListener('input', debounce(e => {
      this._query = e.target.value.trim().toLowerCase();
      this._active = 0;
      this.render();
    }, 250));

    $$('.kb-filter', el).forEach(b => b.addEventListener('click', () => {
      this._filter = b.dataset.f;
      $$('.kb-filter', el).forEach(x => x.style.background = '');
      b.style.background = 'rgba(255,255,255,.26)';
      this._active = 0;
      this.render();
    }));
  },

  async refresh() {
    try {
      const d = await fetchJSON('/api/knowledge');
      this._data = d.knowledge || [];
      this.render();
      this._startAuto();
    } catch (e) {
      toast('知识库加载失败：' + e.message, 'err');
    }
  },

  _visible() {
    let list = this._data;
    if (this._filter !== 'all') list = list.filter(k => k.crop === this._filter);
    if (this._query) list = list.filter(k =>
      (k.name_cn + k.class_name + k.crop + k.symptoms).toLowerCase().includes(this._query));
    return list;
  },

  render() {
    const list = this._visible();
    this._renderCarousel(list);
    this._renderGrid(list);
  },

  /* ---------------- 3D 封面流 ---------------- */
  _renderCarousel(list) {
    const host = $('#kbCarousel');
    const dots = $('#kbDots');
    if (!list.length) {
      host.innerHTML = `<div class="empty">${ICON('book')}<div>没有匹配的知识条目</div></div>`;
      dots.innerHTML = '';
      return;
    }
    this._active = Math.min(this._active, list.length - 1);

    const cardHTML = (k, i) => {
      const off = i - this._active;
      const abs = Math.abs(off);
      const rotate = off < 0 ? -28 : off > 0 ? 28 : 0;
      const scale = 1 - abs * 0.14;
      const z = off === 0 ? 60 : 0;
      const opacity = abs > 2 ? 0 : 1;
      const pointer = off === 0 ? '' : 'cursor:pointer';
      return `
        <div class="carousel-item kb-car-item" data-i="${i}" style="
          width:300px; min-height:210px; transform:rotateY(${rotate}deg) scale(${scale}) translateZ(${z}px);
          opacity:${opacity}; z-index:${off === 0 ? 5 : 3 - abs}; ${pointer};
          position:absolute; left:50%; margin-left:-150px; top:0;
          transition:transform .55s cubic-bezier(.22,.61,.36,1), opacity .45s;
        ">
          <div class="carousel-item-header">
            <span class="carousel-icon-container">${ICON(k.icon || 'leaf')}</span>
          </div>
          <div class="carousel-item-content">
            <div class="carousel-item-title">${esc(k.name_cn)}</div>
            <div class="carousel-item-description">${esc((k.symptoms || '').slice(0, 60))}…</div>
          </div>
          <div class="carousel-item-foot">
            <span class="badge green">${esc(k.crop)}</span>
            <span class="badge gray">${esc(k.type)}</span>
            ${off === 0 ? `<span class="badge blue" style="margin-left:auto">查看详情 →</span>` : ''}
          </div>
        </div>`;
    };

    host.innerHTML = `
      <div style="position:relative;height:250px;perspective:1100px;overflow:visible">
        ${list.map((k, i) => cardHTML(k, i)).join('')}
      </div>`;

    $('#kbCarouselName').textContent = list[this._active].name_cn;

    dots.innerHTML = list.map((_, i) =>
      `<button type="button" class="carousel-indicator ${i === this._active ? 'active' : 'inactive'}" data-i="${i}" aria-label="第 ${i + 1} 个"></button>`).join('');

    $$('.carousel-indicator', dots).forEach(b => b.addEventListener('click', () => {
      this._active = +b.dataset.i;
      this.render();
    }));
    $$('.kb-car-item', host).forEach(item => item.addEventListener('click', () => {
      const i = +item.dataset.i;
      if (i === this._active) {
        this.showDetail(list[i]);
      } else {
        this._active = i;
        this.render();
      }
    }));
  },

  _renderGrid(list) {
    const grid = $('#kbGrid');
    if (!list.length) {
      grid.innerHTML = `<div class="card glass-panel empty" style="grid-column:1/-1">${ICON('book')}<div>没有匹配的知识条目</div></div>`;
      return;
    }
    grid.innerHTML = list.map(k => `
      <div class="card glass-panel kb-grid-card" data-id="${k.id}" style="cursor:pointer;transition:transform .25s var(--e-soft)" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <span class="carousel-icon-container" style="width:44px;height:44px">${ICON(k.icon || 'leaf')}</span>
          <div>
            <div style="font-weight:700;font-size:16px">${esc(k.name_cn)}</div>
            <div style="font-size:12px;color:var(--ink-faint)">${esc(k.class_name)}</div>
          </div>
        </div>
        <div style="font-size:12.5px;color:var(--ink-dim);line-height:1.75;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
          ${esc(k.symptoms)}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <span class="badge green">${esc(k.crop)}</span>
          <span class="badge gray">${esc(k.type)}</span>
          <span class="badge blue" style="margin-left:auto">详情</span>
        </div>
      </div>`).join('');
    $$('.kb-grid-card', grid).forEach(c => c.addEventListener('click', () => {
      const k = list.find(x => x.id === +c.dataset.id);
      if (k) this.showDetail(k);
    }));
  },

  showDetail(k) {
    openModal(`
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:14px">
          <span class="carousel-icon-container" style="width:52px;height:52px">${ICON(k.icon || 'leaf')}</span>
          <div>
            <div class="modal-title">${esc(k.name_cn)}</div>
            <div style="font-size:12.5px;color:var(--ink-faint);margin-top:4px">${esc(k.class_name)}</div>
          </div>
        </div>
        <button class="modal-close" type="button">${ICON('close')}</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:18px">
        <span class="badge green">${esc(k.crop)}</span>
        <span class="badge orange">${esc(k.type)}</span>
      </div>
      <div class="kb-section"><h4>危害症状</h4><p>${esc(k.symptoms)}</p></div>
      <div class="kb-section"><h4>发病原因</h4><p>${esc(k.cause)}</p></div>
      <div class="kb-section"><h4>发生规律</h4><p>${esc(k.pattern)}</p></div>
      <div class="kb-section"><h4>综合防治</h4><p>${esc(k.prevention)}</p></div>
      <div class="kb-section"><h4>药剂防治</h4><p style="color:#d9f99d">${esc(k.chemical)}</p></div>
    `);
  },

  _startAuto() {
    this._stopAuto();
    this._autoTimer = setInterval(() => {
      const list = this._visible();
      if (!list.length) return;
      this._active = (this._active + 1) % list.length;
      this.render();
    }, 5000);
  },
  _stopAuto() {
    if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
  },
};
