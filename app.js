'use strict';
/* =====================================================================
   THƯ PHÒNG — thư viện sách cá nhân (PWA)
   Dữ liệu lưu trên máy bằng IndexedDB. Không cần máy chủ.
   ===================================================================== */

/* ---------- tiện ích ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const fmtAgo = t => {
  const d = (Date.now() - t) / 1000;
  if (d < 90) return 'vừa xong';
  if (d < 3600) return Math.round(d / 60) + ' phút trước';
  if (d < 86400) return Math.round(d / 3600) + ' giờ trước';
  return Math.round(d / 86400) + ' ngày trước';
};
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

/* ---------- biểu tượng ---------- */
const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  bookmark: '<path d="M7 4h10v16l-5-4-5 4z"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16z"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3.2"/>',
  prev: '<path d="M6 5v14M18 5l-9 7 9 7z"/>',
  next: '<path d="M18 5v14M6 5l9 7-9 7z"/>',
  rew: '<path d="M11 6l-6 6 6 6M19 6l-6 6 6 6"/>',
  ff: '<path d="M13 6l6 6-6 6M5 6l6 6-6 6"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.4"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
  grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  pen: '<path d="M4 20h6M14 4l6 6-9 9-6-6z"/>'
};
const icon = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const fillIcons = (root = document) => $$('[data-i]', root).forEach(el => { el.innerHTML = icon(el.dataset.i, +el.dataset.s || 22); });

/* ---------- cài đặt ---------- */
const DEF = { theme: 'paper', font: 'serif', size: 110, lh: 1.6, flow: 'paged', anim: 'flip', color: false, rate: 1, pitch: 1, voices: {}, pdfzoom: 1, lastShelf: 'inbox', tipOff: false, view: 'shelf', sort: 'manual', filter: 'all', ls: 0, ws: 0, align: 'justify', skip: true, lastBackup: 0, bkSnooze: 0 };
let S = Object.assign({}, DEF, (() => { try { return JSON.parse(localStorage.getItem('tp_settings') || '{}'); } catch (e) { return {}; } })());
const saveS = () => { try { localStorage.setItem('tp_settings', JSON.stringify(S)); } catch (e) { } };
const FONTS = {
  serif: 'Georgia,"Iowan Old Style","Times New Roman",serif',
  palatino: '"Palatino Linotype",Palatino,"Book Antiqua",serif',
  sans: '-apple-system,"Helvetica Neue",Arial,sans-serif',
  easy: '"Verdana","Trebuchet MS","Helvetica Neue",Arial,sans-serif'
};
const THEMES = { paper: { bg: '#f4f1ea', ink: '#161513' }, eink: { bg: '#dddcd7', ink: '#0d0d0d' }, night: { bg: '#0b0b0b', ink: '#dcd9d0' } };
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  document.documentElement.classList.toggle('cover-color', !!S.color);
  const m = $('meta[name=theme-color]'); if (m) m.content = THEMES[S.theme].bg;
}

/* ---------- thư viện đọc sách (nạp khi cần, được lưu offline bởi service worker) ---------- */
const CDN = {
  jszip: ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'],
  epub: ['https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js', 'https://unpkg.com/epubjs@0.3.93/dist/epub.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.88/epub.min.js'],
  pdf: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'],
  worker: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js']
};
const scriptP = {};
function loadOne(u) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = u; s.onload = res;
    s.onerror = () => { s.remove(); rej(new Error('x')); };
    document.head.appendChild(s);
  });
}
function loadScript(list, check) {
  const key = list[0];
  return scriptP[key] || (scriptP[key] = (async () => {
    for (const u of list) { try { await loadOne(u); if (!check || check()) return; } catch (e) { } }
    delete scriptP[key];
    throw new Error('Chưa tải được thư viện đọc sách. Hãy bật mạng rồi thử lại (cần mạng ở lần đầu).');
  })());
}
let pdfWorkerUrl = '';
async function needLibs(type) {
  if (type === 'epub') {
    if (!window.JSZip) await loadScript(CDN.jszip, () => window.JSZip);
    if (!window.ePub) await loadScript(CDN.epub, () => window.ePub);
  } else {
    if (!window.pdfjsLib) await loadScript(CDN.pdf, () => window.pdfjsLib);
    if (!pdfWorkerUrl) {
      let txt = '';
      for (const u of CDN.worker) { try { const r = await fetch(u); if (r.ok) { txt = await r.text(); break; } } catch (e) { } }
      if (!txt) throw new Error('Chưa tải được thư viện đọc PDF. Hãy bật mạng rồi thử lại.');
      pdfWorkerUrl = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' }));
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
}

/* ---------- IndexedDB ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('thuphong', 1);
      r.onupgradeneeded = () => { ['books', 'files', 'extra'].forEach(n => r.result.createObjectStore(n, { keyPath: 'id' })); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode);
      const rq = fn(t.objectStore(store));
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Hết dung lượng lưu trữ'));
    });
  },
  all(s) { return this.tx(s, 'readonly', o => o.getAll()); },
  get(s, id) { return this.tx(s, 'readonly', o => o.get(id)); },
  put(s, v) { return this.tx(s, 'readwrite', o => o.put(v)); },
  del(s, id) { return this.tx(s, 'readwrite', o => o.delete(id)); }
};

/* ---------- trạng thái thư phòng ---------- */
const st = { shelves: [], books: [] };
const INBOX = 'inbox';
const saveShelves = () => { try { localStorage.setItem('tp_shelves', JSON.stringify(st.shelves)); } catch (e) { } };
const shelfBooks = id => st.books.filter(b => b.shelf === id).sort((a, b) => a.order - b.order);
const normalizeOrder = id => shelfBooks(id).forEach((b, i) => { b.order = i; });
const shelfName = id => (st.shelves.find(s => s.id === id) || {}).name || 'Chưa phân loại';
const dirty = new Set(); let pt = 0;
function persistSoon(b) { dirty.add(b); clearTimeout(pt); pt = setTimeout(flushPersist, 700); }
function flushPersist() { clearTimeout(pt); for (const b of dirty) DB.put('books', b).catch(console.warn); dirty.clear(); }
addEventListener('visibilitychange', () => { if (document.hidden) flushPersist(); });
addEventListener('pagehide', flushPersist);

/* ---------- thông báo & hộp thoại ---------- */
let toastT = 0;
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
}
function openLayer(html, { center = false } = {}) {
  const o = document.createElement('div');
  o.className = 'overlay' + (center ? ' center' : '');
  o.innerHTML = `<div class="${center ? 'dialog' : 'sheet'}">${center ? '' : '<i class="grab"></i>'}${html}</div>`;
  $('#layer').appendChild(o);
  o.close = () => { o.remove(); if (o.onclose) o.onclose(); };
  o.addEventListener('click', e => { if (e.target === o) o.close(); });
  $$('[data-close]', o).forEach(b => b.addEventListener('click', () => o.close()));
  return o;
}
function ask({ title, msg = '', fields = [], ok = 'Lưu', danger = false, cancel = 'Hủy' }) {
  return new Promise(res => {
    const o = openLayer(`<h3>${esc(title)}</h3>${msg ? `<p class="msg">${esc(msg)}</p>` : ''}` +
      fields.map(f => `<label class="fld"><span>${esc(f.label)}</span><input name="${f.name}" value="${esc(f.value || '')}" placeholder="${esc(f.ph || '')}" autocomplete="off" autocapitalize="sentences"></label>`).join('') +
      `<div class="btns"><button class="btn" data-c>${cancel}</button><button class="btn solid ${danger ? 'danger' : ''}" data-ok>${ok}</button></div>`, { center: true });
    let done = false;
    const fin = v => { if (done) return; done = true; res(v); };
    o.onclose = () => fin(null);
    $('[data-c]', o).onclick = () => o.close();
    $('[data-ok]', o).onclick = () => { const r = {}; $$('input', o).forEach(i => { r[i.name] = i.value.trim(); }); fin(r); o.remove(); };
    $$('input', o).forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-ok]', o).click(); }));
    const f = $('input', o); if (f) setTimeout(() => f.focus(), 60);
  });
}

/* =====================================================================
   KỆ SÁCH
   ===================================================================== */
let editMode = false;
const SUGGEST = ['Khoa học', 'Lịch sử', 'Tiểu thuyết', 'Triết học', 'Kỹ năng', 'Thiếu nhi'];

const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const statusOf = b => { const p = (b.pos && b.pos.pct) || 0; if (p >= 0.98) return 'done'; if (p > 0 || b.lastRead) return 'reading'; return 'new'; };
const lenOf = b => b.len || b.pages || Math.round((b.size || 0) / 40000);
const hashStr = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const FILTERS = [['all', 'Tất cả'], ['reading', 'Đang đọc'], ['new', 'Chưa đọc'], ['done', 'Đã xong']];
const SORTS = [['manual', 'Tự sắp xếp (theo thứ tự bạn đặt)'], ['added', 'Mới thêm trước'], ['addedAsc', 'Thêm lâu rồi trước'], ['az', 'Tên A → Z'], ['za', 'Tên Z → A'],
  ['short', 'Ngắn → dài (số chương / trang)'], ['long', 'Dài → ngắn (số chương / trang)'], ['recent', 'Đọc gần đây']];
let q = '';

function sortBooks(list) {
  const m = editMode ? 'manual' : S.sort;
  const cmp = {
    manual: (a, b) => a.order - b.order,
    added: (a, b) => (b.added || 0) - (a.added || 0),
    addedAsc: (a, b) => (a.added || 0) - (b.added || 0),
    az: (a, b) => a.title.localeCompare(b.title, 'vi'),
    za: (a, b) => b.title.localeCompare(a.title, 'vi'),
    short: (a, b) => lenOf(a) - lenOf(b),
    long: (a, b) => lenOf(b) - lenOf(a),
    recent: (a, b) => (b.lastRead || 0) - (a.lastRead || 0)
  }[m] || ((a, b) => a.order - b.order);
  return [...list].sort(cmp);
}
function visibleBooks(sid) {
  const nq = norm(q.trim());
  let list = shelfBooks(sid);
  if (nq) list = list.filter(b => norm(b.title + ' ' + (b.author || '')).includes(nq));
  if (S.filter !== 'all') list = list.filter(b => statusOf(b) === S.filter);
  return sortBooks(list);
}

function ensureShell() {
  const v = $('#shelf-view'); if ($('#sv-head', v)) return;
  v.innerHTML = `<div id="sv-head"></div>
    <div id="sv-tools"><div class="searchbox"><input id="sv-q" type="search" placeholder="Tìm tên sách hoặc tác giả…" autocomplete="off" enterkeyhint="search">
      <button class="ib sm" data-act="view" aria-label="Cách xem và sắp xếp">${icon('grid', 22)}</button></div>
      <div class="chips left" id="sv-filter"></div></div>
    <div id="sv-body"></div>`;
  $('#sv-q').addEventListener('input', e => { q = e.target.value; renderShelf(); });
}

function bookCell(b) {
  const pct = Math.round((b.pos && b.pos.pct || 0) * 100);
  return `<div class="book" data-id="${b.id}">
    <button class="cv" data-act="open" data-id="${b.id}" aria-label="${esc(b.title)}">
      <img src="${b.cover}" alt=""><span class="tag">${b.type}</span>${b.stored === false ? '<span class="tag cloud">online</span>' : ''}
    </button>
    <div class="bt">${esc(b.title)}</div>
    ${pct > 0 ? `<div class="pb"><i style="width:${pct}%"></i></div>` : ''}
    ${editMode ? `<div class="bt-tools">
      <button class="ib sm" data-act="book-left" data-id="${b.id}" aria-label="Dịch sang trái">${icon('left', 18)}</button>
      <button class="ib sm" data-act="book-menu" data-id="${b.id}" aria-label="Tùy chọn">${icon('more', 18)}</button>
      <button class="ib sm" data-act="book-right" data-id="${b.id}" aria-label="Dịch sang phải">${icon('right', 18)}</button></div>` : ''}
  </div>`;
}
function listRow(b) {
  const pct = Math.round((b.pos && b.pos.pct || 0) * 100);
  return `<button class="hit lrow" data-act="open" data-id="${b.id}">
    <img src="${b.cover}" alt="">
    <div class="lmeta"><b>${esc(b.title)}</b><span>${esc(b.author || 'Không rõ tác giả')}</span>
      <span>${b.type.toUpperCase()} · ${lenOf(b)} ${b.type === 'pdf' ? 'trang' : 'phần'} · thêm ${new Date(b.added || Date.now()).toLocaleDateString('vi-VN')}</span>
      <div class="pb"><i style="width:${pct}%"></i></div></div>
    <span class="lpct">${pct}%</span></button>`;
}
function spineEl(b) {
  const h = hashStr(b.id), pct = Math.round((b.pos && b.pos.pct || 0) * 100);
  const w = clamp(24 + Math.round(Math.sqrt((b.size || 200000) / 20000) * 5), 26, 54), ht = 150 + (h % 5) * 12;
  const tone = [['#161513', '#f4f1ea'], ['#3b3a36', '#f4f1ea'], ['#77736a', '#f4f1ea'], ['#cbc6ba', '#161513'], ['#e4e0d6', '#161513']][h % 5];
  return { w, html: `<button class="hit spine" data-act="open" data-id="${b.id}" style="width:${w}px;height:${ht}px;background:${tone[0]};color:${tone[1]}" aria-label="${esc(b.title)}"><span>${esc(b.title)}</span><i style="height:${pct}%"></i></button>` };
}
function rowsHtml(list, mode) {
  if (!list.length) return '<div class="row empty">Kệ trống — bấm + để thêm sách</div>';
  if (mode === 'list') return `<div class="blist">${list.map(listRow).join('')}</div>`;
  if (mode === 'spines') {
    const avail = Math.min(innerWidth, 760) - 36 - 8; const rows = []; let cur = [], w = 0;
    for (const b of list) { const e = spineEl(b); if (cur.length && w + e.w + 4 > avail) { rows.push(cur); cur = []; w = 0; } cur.push(e); w += e.w + 4; }
    if (cur.length) rows.push(cur);
    return rows.map(r => `<div class="row spines">${r.map(x => x.html).join('')}</div>`).join('');
  }
  const per = mode === 'wall' ? 4 : 3; let h = '';
  for (let i = 0; i < list.length; i += per) h += `<div class="row ${mode === 'wall' ? 'wall' : ''}">${list.slice(i, i + per).map(bookCell).join('')}</div>`;
  return h;
}

function renderShelf() {
  ensureShell();
  const inboxN = shelfBooks(INBOX).length;
  const filtering = !!q.trim() || S.filter !== 'all';
  const mode = editMode ? 'shelf' : S.view;
  const nonInbox = st.shelves.filter(s => s.id !== INBOX).length;

  let h = `<header class="masthead"><div><h1>Thư Phòng</h1><p class="sub">${st.books.length} cuốn · ${nonInbox} kệ</p></div>
    <div class="mh-actions"><button class="pill ${editMode ? 'on' : ''}" data-act="edit">${editMode ? 'Xong' : 'Chỉnh sửa'}</button>
    <button class="ib" data-act="settings" aria-label="Cài đặt">${icon('sliders')}</button></div></header>`;
  if (isIOS && !isStandalone() && !S.tipOff) {
    h += `<div class="tip"><b>Cài lên màn hình iPhone:</b> mở trang này bằng Safari, bấm nút Chia sẻ rồi chọn “Thêm vào Màn hình chính”.<button class="ib sm" data-act="tip-off" aria-label="Ẩn">${icon('close', 16)}</button></div>`;
  }
  const dayMs = 86400000;
  if (st.books.length && !editMode && Date.now() - (S.lastBackup || 0) > 14 * dayMs && Date.now() - (S.bkSnooze || 0) > 7 * dayMs) {
    const days = S.lastBackup ? Math.round((Date.now() - S.lastBackup) / dayMs) : 0;
    h += `<div class="tip"><b>Nhớ sao lưu:</b> ${days ? 'đã ' + days + ' ngày chưa sao lưu' : 'bạn chưa sao lưu lần nào'}. Sách chỉ nằm trên chiếc iPhone này, mất máy là mất sách.
      <div style="margin-top:8px"><button class="pill" data-act="settings">Sao lưu ngay</button> <button class="pill" data-act="bk-snooze">Để sau</button></div></div>`;
  }
  $('#sv-head').innerHTML = h;
  $('#sv-tools').hidden = editMode || !st.books.length;
  $('#sv-filter').innerHTML = FILTERS.map(([v, l]) => `<button data-act="filter" data-v="${v}" class="${S.filter === v ? 'on' : ''}">${l}</button>`).join('');

  let b = '';
  if (!st.books.length && nonInbox === 0) {
    b += `<div class="welcome">${icon('book', 64)}<h2>Thư phòng còn trống</h2>
      <p>Tạo vài kệ sách theo chủ đề, rồi bấm nút <b>+</b> để thêm file ePub hoặc PDF vào.</p>
      <div class="chips">${SUGGEST.map(n => `<button data-act="suggest" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <button class="btn" data-act="shelf-add">Tạo kệ theo tên riêng</button></div>`;
  }
  const recent = st.books.filter(x => x.lastRead && (x.pos && x.pos.pct || 0) < 0.995).sort((a, c) => c.lastRead - a.lastRead).slice(0, 10);
  if (recent.length && !editMode && !filtering) {
    b += `<section class="recent"><h2 class="label">Đang đọc dở</h2><div class="rscroll">${recent.map(x =>
      `<button class="rcard" data-act="open" data-id="${x.id}"><img src="${x.cover}" alt=""><div><b>${esc(x.title)}</b>${Math.round((x.pos.pct || 0) * 100)}% · ${fmtAgo(x.lastRead)}</div></button>`).join('')}</div></section>`;
  }
  let shown = 0;
  st.shelves.forEach(s => {
    if (s.id === INBOX && !inboxN && st.shelves.length > 1) return;
    const all = shelfBooks(s.id).length, list = visibleBooks(s.id);
    if (filtering && !list.length) return;
    shown += list.length;
    b += `<section class="shelf"><div class="shelf-head"><h2 class="shelf-name">${esc(s.name)}</h2><span class="count">${filtering ? list.length + '/' + all : all}</span>`;
    if (editMode) {
      b += `<div class="sh-tools"><button class="ib sm" data-act="shelf-up" data-id="${s.id}">${icon('up', 18)}</button>
        <button class="ib sm" data-act="shelf-down" data-id="${s.id}">${icon('down', 18)}</button>
        <button class="ib sm" data-act="shelf-rename" data-id="${s.id}">${icon('edit', 18)}</button>
        ${s.id !== INBOX ? `<button class="ib sm" data-act="shelf-del" data-id="${s.id}">${icon('trash', 18)}</button>` : ''}</div>`;
    }
    b += '</div>' + rowsHtml(list, mode) + '</section>';
  });
  if (filtering && !shown) b += '<p class="msg" style="text-align:center;margin-top:30px">Không tìm thấy sách nào phù hợp.</p>';
  if (editMode || (!st.books.length && nonInbox)) b += `<button class="btn addshelf" data-act="shelf-add">+ Thêm kệ mới</button>`;
  $('#sv-body').innerHTML = b;
  $('#fab').hidden = editMode;
}

function showView() {
  const o = openLayer(`<h3>Cách xem & sắp xếp</h3>
    <div class="grp"><label>Kiểu xem</label>${seg('view', [['shelf', 'Kệ'], ['wall', 'Lưới nhỏ'], ['spines', 'Gáy sách'], ['list', 'Danh sách']])}</div>
    <div class="grp"><label>Sắp xếp sách trong mỗi kệ</label><div class="menu">${SORTS.map(([v, l]) => `<button data-sort="${v}">${l}${S.sort === v ? '<span>✓</span>' : ''}</button>`).join('')}</div>
      <p class="small" style="margin-top:8px">Khi bấm “Chỉnh sửa”, sách tạm xếp theo thứ tự tự sắp xếp để bạn dời được.</p></div>
    <button class="btn solid wide" data-close>Xong</button>`);
  o.addEventListener('click', e => {
    const sb = e.target.closest('.seg button');
    if (sb) { S.view = sb.dataset.v; saveS(); $$('button', sb.parentElement).forEach(x => x.classList.toggle('on', x === sb)); renderShelf(); return; }
    const so = e.target.closest('[data-sort]');
    if (so) { S.sort = so.dataset.sort; saveS(); renderShelf(); o.close(); showView(); }
  });
}

/* sự kiện chung theo data-act */
let longPressed = false;
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  if (longPressed) { longPressed = false; return; }
  const act = t.dataset.act, id = t.dataset.id;
  if (t.closest('#reader')) return readerAct(act);
  const b = st.books.find(x => x.id === id);
  switch (act) {
    case 'open': if (editMode && b) bookMenu(b); else openBook(id); break;
    case 'edit': editMode = !editMode; renderShelf(); break;
    case 'settings': showSettings(); break;
    case 'view': showView(); break;
    case 'filter': S.filter = t.dataset.v; saveS(); renderShelf(); break;
    case 'bk-snooze': S.bkSnooze = Date.now(); saveS(); renderShelf(); break;
    case 'add': showAdd(); break;
    case 'tip-off': S.tipOff = true; saveS(); renderShelf(); break;
    case 'suggest': addShelf(t.dataset.name); break;
    case 'shelf-add': newShelfDialog(); break;
    case 'shelf-up': moveShelf(id, -1); break;
    case 'shelf-down': moveShelf(id, 1); break;
    case 'shelf-rename': renameShelf(id); break;
    case 'shelf-del': deleteShelf(id); break;
    case 'book-left': moveBook(b, -1); break;
    case 'book-right': moveBook(b, 1); break;
    case 'book-menu': bookMenu(b); break;
  }
});
/* nhấn giữ bìa sách để mở menu */
(() => {
  let timer = 0, sx = 0, sy = 0;
  const SEL = '#shelf-view .cv, #shelf-view .hit';
  document.addEventListener('pointerdown', e => {
    const cv = e.target.closest(SEL); if (!cv) return;
    sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => {
      const b = st.books.find(x => x.id === cv.dataset.id);
      if (b) { longPressed = true; setTimeout(() => { longPressed = false; }, 900); if (navigator.vibrate) navigator.vibrate(12); bookMenu(b); }
    }, 550);
  });
  const stop = () => clearTimeout(timer);
  document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop);
  document.addEventListener('pointermove', e => { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) stop(); });
  document.addEventListener('contextmenu', e => { if (e.target.closest(SEL)) e.preventDefault(); });
})();

/* --- quản lý kệ --- */
function addShelf(name) {
  name = (name || '').trim(); if (!name) return null;
  const ex = st.shelves.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (ex) { toast('Kệ này đã có rồi'); return ex; }
  const s = { id: uid(), name };
  const i = st.shelves.findIndex(x => x.id === INBOX);
  if (i >= 0) st.shelves.splice(i, 0, s); else st.shelves.push(s);
  saveShelves(); renderShelf(); return s;
}
async function newShelfDialog() {
  const r = await ask({ title: 'Kệ mới', fields: [{ name: 'n', label: 'Tên đầu mục', ph: 'Ví dụ: Khoa học' }], ok: 'Tạo kệ' });
  if (r && r.n) return addShelf(r.n);
}
function moveShelf(id, d) {
  const i = st.shelves.findIndex(s => s.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= st.shelves.length) return;
  [st.shelves[i], st.shelves[j]] = [st.shelves[j], st.shelves[i]];
  saveShelves(); renderShelf();
}
async function renameShelf(id) {
  const s = st.shelves.find(x => x.id === id); if (!s) return;
  const r = await ask({ title: 'Đổi tên kệ', fields: [{ name: 'n', label: 'Tên đầu mục', value: s.name }] });
  if (r && r.n) { s.name = r.n; saveShelves(); renderShelf(); }
}
async function deleteShelf(id) {
  const s = st.shelves.find(x => x.id === id); if (!s || id === INBOX) return;
  const n = shelfBooks(id).length;
  const r = await ask({ title: 'Xóa kệ “' + s.name + '”?', msg: n ? `${n} cuốn sách trên kệ sẽ được chuyển về “Chưa phân loại”, không bị xóa.` : 'Kệ đang trống.', ok: 'Xóa kệ', danger: true });
  if (!r) return;
  const base = shelfBooks(INBOX).length;
  shelfBooks(id).forEach((b, i) => { b.shelf = INBOX; b.order = base + i; persistSoon(b); });
  st.shelves = st.shelves.filter(x => x.id !== id); saveShelves(); renderShelf();
}
function moveBook(b, d) {
  if (!b) return;
  normalizeOrder(b.shelf);
  const list = shelfBooks(b.shelf), i = list.indexOf(b), j = i + d;
  if (j < 0 || j >= list.length) return;
  const a = list[i].order; list[i].order = list[j].order; list[j].order = a;
  persistSoon(list[i]); persistSoon(list[j]); renderShelf();
}
function putOnShelf(b, sid) {
  b.shelf = sid; b.order = shelfBooks(sid).filter(x => x !== b).length; persistSoon(b);
}

/* --- menu của một cuốn sách --- */
function bookMenu(b) {
  const o = openLayer(`<h3>${esc(b.title)}</h3>
    <p class="msg">${esc(b.author || 'Không rõ tác giả')} · ${b.type.toUpperCase()} · ${fmtSize(b.size || 0)} · kệ “${esc(shelfName(b.shelf))}”</p>
    <div class="menu">
      <button data-m="open">Mở sách</button>
      <button data-m="move">Chuyển sang kệ khác…</button>
      <button data-m="edit">Sửa tên / tác giả…</button>
      <button data-m="reset">Đặt lại tiến độ đọc</button>
      ${b.url && b.stored !== false ? '<button data-m="unstore">Gỡ file khỏi máy (giữ mục, đọc online)</button>' : ''}
      ${b.url && b.stored === false ? '<button data-m="store">Tải về máy để đọc offline</button>' : ''}
      <button data-m="del" class="danger">Xóa khỏi thư phòng</button></div>`);
  o.addEventListener('click', async e => {
    const m = e.target.dataset && e.target.dataset.m; if (!m) return;
    o.close();
    if (m === 'open') openBook(b.id);
    if (m === 'move') moveSheet(b);
    if (m === 'edit') {
      const r = await ask({ title: 'Sửa thông tin', fields: [{ name: 't', label: 'Tên sách', value: b.title }, { name: 'a', label: 'Tác giả', value: b.author }] });
      if (r) { if (r.t) b.title = r.t; b.author = r.a; persistSoon(b); renderShelf(); }
    }
    if (m === 'reset') { b.pos = { pct: 0 }; b.audio = null; b.lastRead = 0; persistSoon(b); renderShelf(); toast('Đã đặt lại tiến độ'); }
    if (m === 'unstore') { await DB.del('files', b.id); b.stored = false; persistSoon(b); renderShelf(); toast('Đã gỡ file, vẫn đọc được khi có mạng'); }
    if (m === 'store') {
      try { toast('Đang tải về…', 60000); const blob = await fetchBlob(b.url); await DB.put('files', { id: b.id, blob }); b.stored = true; persistSoon(b); renderShelf(); toast('Đã lưu về máy'); }
      catch (err) { toast(err.message || 'Không tải được', 4000); }
    }
    if (m === 'del') {
      const r = await ask({ title: 'Xóa “' + b.title + '”?', msg: 'File và tiến độ đọc của cuốn này sẽ bị xóa khỏi máy.', ok: 'Xóa', danger: true });
      if (!r) return;
      await Promise.all([DB.del('books', b.id), DB.del('files', b.id), DB.del('extra', b.id)]).catch(console.warn);
      st.books = st.books.filter(x => x !== b); dirty.delete(b); renderShelf();
    }
  });
}
function moveSheet(b) {
  const o = openLayer(`<h3>Chuyển sang kệ</h3><div class="menu shelfpick">${st.shelves.map(s => `<button data-s="${s.id}">${esc(s.name)}${s.id === b.shelf ? '<span>✓</span>' : ''}</button>`).join('')}</div>
    <button class="btn wide" data-new>+ Kệ mới…</button>`);
  o.addEventListener('click', async e => {
    if (e.target.dataset.s) { putOnShelf(b, e.target.dataset.s); o.close(); renderShelf(); }
    if (e.target.dataset.new !== undefined) { o.close(); const s = await newShelfDialog(); if (s) { putOnShelf(b, s.id); renderShelf(); } }
  });
}

/* =====================================================================
   THÊM SÁCH
   ===================================================================== */
function shelfOptions(sel) {
  return st.shelves.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}
function showAdd() {
  const cur = st.shelves.find(s => s.id === S.lastShelf) ? S.lastShelf : (st.shelves.find(s => s.id !== INBOX) || st.shelves[0]).id;
  const o = openLayer(`<h3>Thêm sách</h3>
    <label class="fld"><span>Đặt vào kệ</span><select id="add-shelf">${shelfOptions(cur)}</select></label>
    <button class="btn" id="add-newshelf" style="width:100%;margin-bottom:14px">+ Tạo kệ mới</button>
    <label class="btn solid filebtn">Chọn file ePub / PDF từ máy<input type="file" id="add-file" multiple accept=".epub,.pdf,application/epub+zip,application/pdf"></label>
    <hr class="hr">
    <label class="fld"><span>Hoặc dán liên kết tới file .epub / .pdf</span><input id="add-url" type="url" inputmode="url" placeholder="https://…"></label>
    <label class="small" style="display:flex;gap:8px;align-items:center;margin:6px 0 4px"><input type="checkbox" id="add-store" checked> Lưu file về máy (bỏ chọn để tiết kiệm dung lượng — cần mạng mỗi lần đọc)</label>
    <button class="btn wide" id="add-go">Thêm từ liên kết</button>
    <p class="small" style="margin-top:12px">Liên kết phải cho phép tải trực tiếp (CORS). Nếu bị chặn, hãy tải file về máy rồi chọn bằng nút ở trên.</p>`);
  const sel = $('#add-shelf', o);
  $('#add-newshelf', o).onclick = async () => { const s = await newShelfDialog(); if (s) { sel.innerHTML = shelfOptions(s.id); } };
  $('#add-file', o).onchange = e => {
    const files = [...e.target.files]; const sid = sel.value; S.lastShelf = sid; saveS(); o.close();
    if (files.length) importFiles(files, sid);
  };
  $('#add-go', o).onclick = async () => {
    const url = $('#add-url', o).value.trim(); if (!url) return;
    const sid = sel.value, store = $('#add-store', o).checked; S.lastShelf = sid; saveS(); o.close();
    try { toast('Đang tải…', 90000); await addFromUrl(url, sid, store); toast('Đã thêm sách'); renderShelf(); }
    catch (err) { toast(err.message || 'Không thêm được', 5000); }
  };
}
async function fetchBlob(url) {
  let r;
  try { r = await fetch(url); } catch (e) { throw new Error('Không tải được (mất mạng hoặc trang chặn tải trực tiếp).'); }
  if (!r.ok) throw new Error('Không tải được (HTTP ' + r.status + ').');
  return r.blob();
}
async function addFromUrl(url, shelf, store) {
  const blob = await fetchBlob(url);
  const name = decodeURIComponent((url.split('#')[0].split('?')[0].split('/').pop()) || 'sach');
  await addBook({ blob, name, shelf, url, store });
}
async function importFiles(files, sid) {
  let ok = 0, n = 0;
  for (const f of files) {
    n++; toast(`Đang thêm ${n}/${files.length}: ${f.name}`, 120000);
    try { await addBook({ blob: f, name: f.name, shelf: sid, store: true }); ok++; renderShelf(); }
    catch (err) { console.error(err); toast('Không thêm được “' + f.name + '”: ' + (err.message || err), 5000); await sleep(2200); }
  }
  toast(ok ? `Đã thêm ${ok} cuốn vào “${shelfName(sid)}”` : 'Không thêm được cuốn nào', 3000);
}

function sniffType(buf, name) {
  const h = new Uint8Array(buf.slice(0, 5));
  const s = String.fromCharCode(...h);
  if (s.startsWith('%PDF')) return 'pdf';
  if (s.startsWith('PK')) return 'epub';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.epub$/i.test(name)) return 'epub';
  return null;
}
async function metaEpub(buf) {
  const bk = ePub(buf.slice(0), { openAs: 'binary' });
  try {
    await bk.ready;
    const m = await bk.loaded.metadata; let cover = null;
    try { const u = await bk.coverUrl(); if (u) cover = await (await fetch(u)).blob(); } catch (e) { }
    return { title: m.title, author: m.creator, lang: m.language, cover, chapters: bk.spine.length || ((bk.spine.items || []).length) };
  } finally { try { bk.destroy(); } catch (e) { } }
}
async function metaPdf(buf) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  let title = '', author = '', canvas = null;
  try { const m = await doc.getMetadata(); title = (m.info && m.info.Title) || ''; author = (m.info && m.info.Author) || ''; } catch (e) { }
  try {
    const p = await doc.getPage(1); const v1 = p.getViewport({ scale: 1 }); const v = p.getViewport({ scale: 360 / v1.width });
    canvas = document.createElement('canvas'); canvas.width = v.width; canvas.height = v.height;
    await p.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
  } catch (e) { canvas = null; }
  const pages = doc.numPages; try { doc.destroy(); } catch (e) { }
  if (/^(microsoft word|untitled|bản sao|document)/i.test(title)) title = '';
  return { title, author, canvas, pages };
}
async function loadImg(blob) {
  const img = new Image(); img.src = URL.createObjectURL(blob); await img.decode(); return img;
}
async function makeCover(src, title, author) {
  const W = 300, H = 450, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  let ok = false;
  try {
    let img = null, iw = 0, ih = 0;
    if (src instanceof Blob) { img = await loadImg(src); iw = img.naturalWidth; ih = img.naturalHeight; }
    else if (src) { img = src; iw = src.width; ih = src.height; }
    if (img && iw > 20 && ih > 20) {
      const sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc;
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, (W - dw) / 2, 0, dw, dh); ok = true;
    }
  } catch (e) { ok = false; }
  if (!ok) {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#161513'; g.lineWidth = 3; g.strokeRect(14, 14, W - 28, H - 28); g.lineWidth = 1; g.strokeRect(21, 21, W - 42, H - 42);
    g.fillStyle = '#161513'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const wrap = (txt, maxW, font) => { g.font = font; const words = txt.split(/\s+/), lines = []; let l = ''; for (const w of words) { const t = l ? l + ' ' + w : w; if (g.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; } if (l) lines.push(l); return lines; };
    let fs = 30, lines = wrap(title, W - 80, `700 ${fs}px Georgia,serif`);
    while (lines.length > 6 && fs > 16) { fs -= 3; lines = wrap(title, W - 80, `700 ${fs}px Georgia,serif`); }
    const lh = fs * 1.25, y0 = H * 0.42 - (lines.length - 1) * lh / 2;
    g.font = `700 ${fs}px Georgia,serif`; lines.slice(0, 8).forEach((l, i) => g.fillText(l, W / 2, y0 + i * lh));
    g.fillRect(W / 2 - 30, H * 0.72, 60, 2);
    if (author) { g.font = 'italic 17px Georgia,serif'; wrap(author, W - 80, 'italic 17px Georgia,serif').slice(0, 2).forEach((l, i) => g.fillText(l, W / 2, H * 0.8 + i * 22)); }
  }
  return c.toDataURL('image/jpeg', 0.82);
}

async function addBook(o) {
  const buf = await o.blob.arrayBuffer();
  const type = sniffType(buf, o.name || '');
  if (!type) throw new Error('Chỉ hỗ trợ file .epub và .pdf');
  await needLibs(type);
  const meta = type === 'epub' ? await metaEpub(buf) : await metaPdf(buf);
  const base = (o.name || 'Sách').replace(/\.(epub|pdf)$/i, '').replace(/[_]+/g, ' ');
  const title = (meta.title || '').trim() || base;
  const cover = await makeCover(meta.cover || meta.canvas, title, meta.author);
  const sid = o.shelf || INBOX;
  const rec = {
    id: uid(), title, author: (meta.author || '').trim(), type, lang: meta.lang || '', shelf: sid,
    order: shelfBooks(sid).length, cover, size: o.blob.size, sig: (o.name || title) + '|' + o.blob.size,
    url: o.url || '', stored: o.store !== false, added: Date.now(), lastRead: 0, pos: { pct: 0 }, bookmarks: [], notes: [], audio: null, pages: meta.pages || 0, len: meta.chapters || meta.pages || 0
  };
  if (rec.stored) await DB.put('files', { id: rec.id, blob: o.blob });
  applyRestore(rec);
  await DB.put('books', rec);
  st.books.push(rec);
}

/* ---------- sao lưu / khôi phục ---------- */
function backupData() {
  return {
    v: 2, t: Date.now(), app: 'thu-phong', shelves: st.shelves,
    settings: { theme: S.theme, font: S.font, size: S.size, lh: S.lh, ls: S.ls, ws: S.ws, align: S.align, flow: S.flow, anim: S.anim, color: S.color, rate: S.rate, pitch: S.pitch, view: S.view, sort: S.sort, skip: S.skip, voices: S.voices },
    books: st.books.map(b => ({ id: b.id, title: b.title, author: b.author, type: b.type, lang: b.lang, shelf: b.shelf, order: b.order, cover: b.cover, size: b.size, sig: b.sig, url: b.url, stored: b.stored, pos: b.pos, bookmarks: b.bookmarks, notes: b.notes, audio: b.audio, lastRead: b.lastRead, added: b.added, pages: b.pages, len: b.len }))
  };
}
function deliverFile(blob, name, title) {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const can = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const o = openLayer(`<h3>${esc(title)}</h3><p class="msg">${esc(name)} · ${fmtSize(blob.size)}</p>
    ${can ? '<button class="btn solid wide" id="dl-share">Lưu vào Tệp / Chia sẻ</button>' : ''}
    <a class="btn wide filebtn" id="dl-a" href="${url}" download="${esc(name)}" style="text-decoration:none;color:var(--ink)">Tải xuống</a>
    <p class="small" style="margin-top:10px">Nên cất file này vào iCloud Drive hoặc chuyển sang máy tính. Khi cần, vào Cài đặt › Khôi phục và chọn lại file này.</p>
    <button class="btn wide" data-close>Đóng</button>`);
  const sh = $('#dl-share', o);
  if (sh) sh.onclick = async () => { try { await navigator.share({ files: [file], title: 'Sao lưu Thư Phòng' }); } catch (e) { if (e.name !== 'AbortError') toast('Không chia sẻ được, hãy thử nút Tải xuống'); } };
}
async function quickBackup() {
  const blob = new Blob([JSON.stringify(backupData())], { type: 'application/json' });
  S.lastBackup = Date.now(); saveS(); renderShelf();
  deliverFile(blob, 'thu-phong-sao-luu-nhanh.json', 'Sao lưu nhanh sẵn sàng');
}
async function fullBackup() {
  if (!st.books.length) { toast('Chưa có sách để sao lưu'); return; }
  try { if (!window.JSZip) await loadScript(CDN.jszip, () => window.JSZip); } catch (e) { toast(e.message, 5000); return; }
  try {
    const z = new JSZip(); z.file('data.json', JSON.stringify(backupData()));
    let n = 0;
    for (const b of st.books) {
      n++; toast(`Đang gói sách ${n}/${st.books.length}…`, 120000);
      if (b.stored === false) continue;
      const f = await DB.get('files', b.id);
      if (f && f.blob) z.file('files/' + b.id + '.' + b.type, f.blob, { compression: 'STORE' });
    }
    toast('Đang tạo file zip, có thể mất vài chục giây…', 120000);
    const blob = await z.generateAsync({ type: 'blob', compression: 'STORE', streamFiles: true });
    S.lastBackup = Date.now(); saveS(); renderShelf();
    deliverFile(blob, 'thu-phong-sao-luu-day-du-' + new Date().toISOString().slice(0, 10) + '.zip', 'Sao lưu đầy đủ sẵn sàng');
    $('#toast').hidden = true;
  } catch (err) { console.error(err); toast('Không tạo được file sao lưu (có thể thiếu bộ nhớ). Thử sao lưu nhanh hoặc từng ít sách một.', 7000); }
}
function applyRestore(rec) {
  try {
    const map = JSON.parse(localStorage.getItem('tp_restore') || '{}'); const m = map[rec.sig]; if (!m) return;
    if (m.shelf && st.shelves.find(s => s.id === m.shelf)) rec.shelf = m.shelf;
    rec.order = m.order != null ? m.order : rec.order; rec.pos = m.pos || rec.pos; rec.bookmarks = m.bookmarks || []; rec.notes = m.notes || []; rec.audio = m.audio || null; rec.lastRead = m.lastRead || 0;
    if (m.title) rec.title = m.title; if (m.author != null) rec.author = m.author;
    delete map[rec.sig]; localStorage.setItem('tp_restore', JSON.stringify(map));
  } catch (e) { }
}
function mergeShelves(data) {
  (data.shelves || []).forEach(s => {
    if (!st.shelves.find(x => x.id === s.id)) { const i = st.shelves.findIndex(x => x.id === INBOX); st.shelves.splice(i < 0 ? st.shelves.length : i, 0, s); }
  });
  saveShelves();
}
function mergeMeta(local, x) {
  Object.assign(local, { shelf: st.shelves.find(s => s.id === x.shelf) ? x.shelf : INBOX, order: x.order != null ? x.order : local.order, pos: x.pos || local.pos, bookmarks: x.bookmarks || [], notes: x.notes || [], audio: x.audio || null, lastRead: x.lastRead || 0 });
  persistSoon(local);
}
function applySettings(o) {
  if (!o) return; ['theme', 'font', 'size', 'lh', 'ls', 'ws', 'align', 'flow', 'anim', 'color', 'rate', 'pitch', 'view', 'sort', 'skip', 'voices'].forEach(k => { if (o[k] != null) S[k] = o[k]; });
  saveS(); applyTheme();
}
async function restoreJson(file) {
  const data = JSON.parse(await file.text());
  if (!data || !Array.isArray(data.books)) throw new Error('File sao lưu không hợp lệ');
  mergeShelves(data);
  const map = JSON.parse(localStorage.getItem('tp_restore') || '{}'); let applied = 0, waiting = 0, added = 0;
  for (const x of data.books) {
    const local = st.books.find(b => b.sig === x.sig);
    if (local) { mergeMeta(local, x); applied++; }
    else if (x.url && x.cover) { const rec = Object.assign({}, x, { id: uid(), stored: false }); await DB.put('books', rec); st.books.push(rec); added++; }
    else { map[x.sig] = { shelf: x.shelf, order: x.order, pos: x.pos, bookmarks: x.bookmarks, notes: x.notes, audio: x.audio, lastRead: x.lastRead, title: x.title, author: x.author }; waiting++; }
  }
  localStorage.setItem('tp_restore', JSON.stringify(map)); applySettings(data.settings); flushPersist(); renderShelf();
  toast(`Khôi phục xong: ${applied} cuốn khớp, ${added} cuốn online, ${waiting} cuốn chờ bạn thêm lại file (tiến độ và ghi chú sẽ tự gắn vào).`, 8000);
}
async function restoreZip(file) {
  if (!window.JSZip) await loadScript(CDN.jszip, () => window.JSZip);
  const z = await JSZip.loadAsync(file); const dj = z.file('data.json');
  if (!dj) throw new Error('Đây không phải file sao lưu của Thư Phòng');
  const data = JSON.parse(await dj.async('string')); mergeShelves(data);
  let added = 0, updated = 0, n = 0;
  for (const x of data.books || []) {
    n++; toast(`Đang khôi phục ${n}/${data.books.length}…`, 120000);
    const local = st.books.find(b => b.sig === x.sig);
    if (local) { mergeMeta(local, x); updated++; continue; }
    const entry = z.file('files/' + x.id + '.' + x.type); let blob = null;
    if (entry) blob = new Blob([await entry.async('arraybuffer')], { type: x.type === 'pdf' ? 'application/pdf' : 'application/epub+zip' });
    if (!blob && !x.url) continue;
    const rec = Object.assign({}, x, { stored: !!blob });
    if (st.books.find(b => b.id === rec.id)) rec.id = uid();
    if (blob) await DB.put('files', { id: rec.id, blob });
    await DB.put('books', rec); st.books.push(rec); added++;
  }
  applySettings(data.settings); flushPersist(); renderShelf();
  toast(`Khôi phục xong: thêm ${added} cuốn, cập nhật ${updated} cuốn.`, 6000);
}
async function restoreAny(file) {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (head[0] === 0x50 && head[1] === 0x4b) return restoreZip(file);
  return restoreJson(file);
}

/* =====================================================================
   CÀI ĐẶT
   ===================================================================== */
const seg = (k, opts) => {
  const cur = k === 'color' ? (S.color ? '1' : '0') : String(S[k]);
  return `<div class="seg" data-k="${k}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
};
function setSetting(k, v) {
  if (k === 'color') v = (v === '1' || v === true);
  else if (['size', 'lh', 'pdfzoom', 'ls', 'ws'].includes(k)) v = +v;
  S[k] = v; saveS(); applyTheme();
  if (!R.b) { renderShelf(); return; }
  if (k === 'flow') reopenReader();
  else if (['theme', 'font', 'lh', 'size', 'ls', 'ws', 'align'].includes(k)) restyleEpub();
  else if (k === 'pdfzoom') rerenderPdf();
  if (k === 'color') renderShelf();
}
function applyPreset(name) {
  if (name === 'easy') Object.assign(S, { font: 'easy', lh: 1.9, ls: 0.06, ws: 0.18, align: 'left', size: 125 });
  else Object.assign(S, { font: 'serif', lh: 1.6, ls: 0, ws: 0, align: 'justify', size: 110 });
  saveS(); applyTheme(); if (R.b) restyleEpub();
}
async function showSettings() {
  const isPdf = R.type === 'pdf';
  const pv = () => `font-family:${FONTS[S.font]};font-size:${Math.round(S.size * 0.17)}px;line-height:${S.lh};letter-spacing:${S.ls}em;word-spacing:${S.ws}em;text-align:${S.align}`;
  const o = openLayer(`<h3>Giao diện & đọc sách</h3>
    <div class="grp"><label>Màu giấy</label>${seg('theme', [['paper', 'Giấy trắng'], ['eink', 'E-ink'], ['night', 'Đêm']])}</div>
    ${!isPdf ? `<div class="grp"><label>Chữ dễ đọc</label><div class="row2"><button class="btn" data-preset="easy">Bật chế độ dễ đọc</button><button class="btn" data-preset="normal">Về mặc định</button></div>
      <p class="small" style="margin-top:6px">Dùng chữ không chân, giãn chữ và giãn dòng rộng hơn, căn lề trái. Hợp với người đọc khó khăn hoặc dễ mỏi mắt.</p></div>
      <p id="pv" style="${pv()};margin:6px 0 14px;padding:10px 12px;border:1px dashed var(--ink)">Trăng lên đầu cành liễu, người hẹn sau hoàng hôn. Ánh tà dương ảm đạm treo phía tây.</p>
      <div class="grp"><label>Phông chữ</label>${seg('font', [['serif', 'Georgia'], ['palatino', 'Palatino'], ['sans', 'Không chân'], ['easy', 'Dễ đọc']])}</div>
      <div class="grp"><label>Cỡ chữ <b id="v-size">${S.size}%</b></label><input type="range" data-k="size" min="80" max="220" step="5" value="${S.size}"></div>
      <div class="grp"><label>Giãn dòng <b id="v-lh">${S.lh}</b></label><input type="range" data-k="lh" min="1.2" max="2.4" step="0.05" value="${S.lh}"></div>
      <div class="grp"><label>Giãn chữ <b id="v-ls">${S.ls}</b></label><input type="range" data-k="ls" min="0" max="0.2" step="0.01" value="${S.ls}"></div>
      <div class="grp"><label>Giãn từ <b id="v-ws">${S.ws}</b></label><input type="range" data-k="ws" min="0" max="0.5" step="0.02" value="${S.ws}"></div>
      <div class="grp"><label>Căn lề</label>${seg('align', [['justify', 'Đều hai bên'], ['left', 'Căn trái']])}</div>`
      : `<div class="grp"><label>Phóng to trang <b id="v-pdfzoom">${Math.round(S.pdfzoom * 100)}%</b></label><input type="range" data-k="pdfzoom" min="1" max="2.5" step="0.1" value="${S.pdfzoom}"></div>`}
    <div class="grp"><label>Kiểu đọc</label>${seg('flow', [['paged', 'Lật trang'], ['scroll', 'Cuộn dọc']])}</div>
    <div class="grp"><label>Hiệu ứng lật</label>${seg('anim', [['flip', 'Lật'], ['slide', 'Trượt'], ['fade', 'Mờ'], ['none', 'Tắt']])}</div>
    <div class="grp"><label>Bìa sách trên kệ</label>${seg('color', [['0', 'Đen trắng'], ['1', 'Giữ màu']])}</div>
    ${!R.b ? `<hr class="hr"><div class="grp"><label>Dữ liệu & sao lưu</label>
      <p class="small" id="st-info">Đang kiểm tra dung lượng…</p>
      <button class="btn solid wide" id="bk-full">Sao lưu đầy đủ (kèm file sách) → .zip</button>
      <button class="btn wide" id="bk-quick">Sao lưu nhanh (kệ, tiến độ, ghi chú — không kèm sách)</button>
      <label class="btn wide filebtn">Khôi phục từ file sao lưu<input type="file" id="bk-in" accept=".zip,.json,application/zip,application/json"></label>
      <p class="small" style="margin-top:8px">${S.lastBackup ? 'Sao lưu gần nhất: ' + new Date(S.lastBackup).toLocaleString('vi-VN') + '. ' : 'Bạn chưa sao lưu lần nào. '}Sao lưu đầy đủ cần bộ nhớ trống khoảng bằng tổng dung lượng sách. Nếu thư viện rất lớn, hãy dùng sao lưu nhanh.</p></div>` : ''}
    <button class="btn solid wide" data-close>Xong</button>`);
  const updPv = () => { const p = $('#pv', o); if (p) p.style.cssText = pv() + ';margin:6px 0 14px;padding:10px 12px;border:1px dashed var(--ink)'; };
  o.addEventListener('click', e => {
    const pr = e.target.closest('[data-preset]');
    if (pr) { applyPreset(pr.dataset.preset); o.close(); showSettings(); return; }
    const b = e.target.closest('.seg button'); if (!b) return;
    const k = b.parentElement.dataset.k; setSetting(k, b.dataset.v);
    $$('button', b.parentElement).forEach(x => x.classList.toggle('on', x === b)); updPv();
  });
  o.addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.k; if (!k || e.target.type !== 'range') return;
    const el = $('#v-' + k, o); if (!el) return;
    el.textContent = k === 'size' ? e.target.value + '%' : k === 'pdfzoom' ? Math.round(e.target.value * 100) + '%' : e.target.value;
    S[k] = +e.target.value; updPv();
  });
  o.addEventListener('change', e => {
    const k = e.target.dataset && e.target.dataset.k; if (k && e.target.type === 'range') setSetting(k, e.target.value);
    if (e.target.id === 'bk-in' && e.target.files[0]) { const f = e.target.files[0]; o.close(); restoreAny(f).catch(err => toast(err.message || 'Không khôi phục được', 6000)); }
  });
  const bf = $('#bk-full', o); if (bf) bf.onclick = () => { o.close(); fullBackup(); };
  const bq = $('#bk-quick', o); if (bq) bq.onclick = () => { o.close(); quickBackup(); };
  const info = $('#st-info', o);
  if (info) {
    try {
      const e = await navigator.storage.estimate(); const p = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      info.textContent = `Đã dùng ${fmtSize(e.usage || 0)} trên máy · ${p ? 'dữ liệu được bảo vệ khỏi tự xóa' : 'hãy thêm app vào Màn hình chính để máy không tự xóa dữ liệu'}.`;
    } catch (err) { info.textContent = ''; }
  }
}

/* =====================================================================
   TRÌNH ĐỌC
   ===================================================================== */
let R = {};
const resetR = () => { R = { b: null, type: '', rendition: null, ebook: null, pdf: null, page: 1, pages: 0, cfi: '', toc: null, audioOpen: false, selMode: false, sel: null }; };
resetR();
let turning = false, sliding = false, lastTouch = 0, chromeT = 0;

async function openBook(id) {
  const b = st.books.find(x => x.id === id); if (!b) return;
  try { await needLibs(b.type); } catch (e) { toast(e.message, 5000); return; }
  resetR(); resetAudio();
  R.b = b; R.type = b.type;
  const rd = $('#reader');
  rd.hidden = false; rd.classList.remove('chrome-off'); document.body.classList.add('reading');
  $('#r-load').classList.remove('off'); $('#r-load').textContent = 'Đang mở sách…';
  $('#r-title').textContent = b.title; $('#r-sub').textContent = b.author || '';
  $('#page-wrap').classList.toggle('paged', S.flow === 'paged');
  $('#epub-area').style.display = b.type === 'epub' ? 'block' : 'none';
  $('#pdf-area').style.display = b.type === 'pdf' ? '' : 'none';
  $('#pdf-area').classList.toggle('scroll', S.flow !== 'paged');
  updateTapLayer();
  await nextFrame(); await nextFrame();
  try {
    let blob = null;
    if (b.stored !== false) { const f = await DB.get('files', b.id); blob = f && f.blob; }
    if (!blob) {
      if (!b.url) throw new Error('Thiếu file của cuốn này. Hãy thêm lại file (tiến độ vẫn được giữ).');
      $('#r-load').textContent = 'Đang tải sách từ mạng…'; blob = await fetchBlob(b.url);
    }
    b.lastRead = Date.now(); persistSoon(b);
    if (b.type === 'epub') await openEpub(b, blob); else await openPdf(b, blob);
    $('#r-load').classList.add('off');
    clearTimeout(chromeT); chromeT = setTimeout(() => { if (R.b && !R.audioOpen) $('#reader').classList.add('chrome-off'); }, 2200);
  } catch (err) {
    console.error(err); toast(err.message || 'Không mở được sách', 6000);
    await closeReader();
  }
}
async function closeReader() {
  stopAudioAll(); flushPersist();
  try { R.rendition && R.rendition.destroy(); } catch (e) { }
  try { R.ebook && R.ebook.destroy(); } catch (e) { }
  try { R.pdf && R.pdf.destroy(); } catch (e) { }
  if (R.obs) R.obs.disconnect();
  $('#epub-area').innerHTML = ''; $('#pdf-area').innerHTML = '';
  const au = $('#audio'); if (au) au.remove();
  $('#reader').hidden = true; document.body.classList.remove('reading');
  resetR(); resetAudio(); renderShelf();
}
async function reopenReader() { const id = R.b && R.b.id; if (!id) return; await closeReader(); openBook(id); }

function toggleChrome(force) {
  const rd = $('#reader'); const off = force != null ? !force : !rd.classList.contains('chrome-off');
  rd.classList.toggle('chrome-off', off);
}

function updateTapLayer() { $('#tap-layer').hidden = !(R.type === 'epub' && S.flow === 'paged' && !R.selMode); }
function toggleSelMode() {
  if (R.type !== 'epub') { toast('Tô sáng và ghi chú hiện chỉ dùng được với sách ePub.', 3500); return; }
  R.selMode = !R.selMode; updateTapLayer(); R.miss = 0;
  if (R.selMode && !selPoll) selPoll = setInterval(pollSel, 500);
  const pen = $('[data-act=pen]', $('#reader')); if (pen) pen.classList.toggle('on', R.selMode);
  if (S.flow === 'paged' && R.selMode) toast('Chế độ chọn chữ (bản 8): nhấn giữ vào chữ rồi kéo để chọn. Bấm nút bút lần nữa để về lật trang.', 5500);
  else if (!R.selMode) { hideSelbar(); toast('Đã về chế độ lật trang'); }
}
function readerAct(act) {
  if (act === 'search') return showSearch();
  if (act === 'pen') return toggleSelMode();
  if (act === 'close') closeReader();
  else if (act === 'toc') showToc();
  else if (act === 'bookmark') toggleBookmark();
  else if (act === 'audio') openAudio();
  else if (act === 'rset') showSettings();
}

/* --- cử chỉ chạm: chạm mép trái/phải để lật, chạm giữa để hiện thanh, vuốt ngang để lật --- */
function gesture(dx, dy, dt, x, target) {
  if (R.audioOpen || !R.b) return;
  if (target && target.closest && target.closest('a[href]')) return;
  const paged = S.flow === 'paged', W = innerWidth;
  const canFlip = paged && (R.type === 'epub' || S.pdfzoom <= 1.01);
  if (canFlip && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { turn(dx < 0 ? 1 : -1); return; }
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 450) {
    if (canFlip) { if (x < W * 0.3) { turn(-1); return; } if (x > W * 0.7) { turn(1); return; } }
    toggleChrome();
  }
}
function bindTouch(doc, getX) {
  let x0 = 0, y0 = 0, t0 = 0;
  doc.addEventListener('touchstart', e => { const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
  doc.addEventListener('touchend', e => {
    lastTouch = Date.now(); const t = e.changedTouches[0];
    const sel = doc.getSelection ? doc.getSelection().toString() : ''; if (sel) return;
    gesture(t.clientX - x0, t.clientY - y0, Date.now() - t0, getX(t.clientX), e.target);
  }, { passive: true });
  doc.addEventListener('click', e => {
    if (Date.now() - lastTouch < 700) return;
    gesture(0, 0, 0, getX(e.clientX), e.target);
  });
  doc.addEventListener('keydown', e => { if (e.key === 'ArrowRight') turn(1); else if (e.key === 'ArrowLeft') turn(-1); });
}
document.addEventListener('keydown', e => {
  if (!R.b || R.audioOpen) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') turn(1);
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn(-1);
});

/* --- hiệu ứng lật trang --- */
async function flipAnim(dir, action) {
  const el = $('#page-wrap'), mode = S.anim;
  if (mode === 'none' || S.flow !== 'paged' || matchMedia('(prefers-reduced-motion: reduce)').matches) { await action(); return; }
  const D = 170, P = 'perspective(1600px) ';
  const out = { flip: P + `rotateY(${dir > 0 ? -62 : 62}deg)`, slide: `translateX(${dir > 0 ? -36 : 36}px)`, fade: 'none' }[mode];
  const inn = { flip: P + `rotateY(${dir > 0 ? 62 : -62}deg)`, slide: `translateX(${dir > 0 ? 36 : -36}px)`, fade: 'none' }[mode];
  el.style.transformOrigin = mode === 'flip' ? (dir > 0 ? 'left center' : 'right center') : 'center';
  el.style.transition = `transform ${D}ms ease-in, opacity ${D}ms ease-in`;
  el.style.transform = out; el.style.opacity = '0.12';
  if (mode === 'flip') el.style.boxShadow = '0 0 38px rgba(0,0,0,.28)';
  await sleep(D);
  try { await action(); } catch (e) { console.warn(e); }
  el.style.transition = 'none';
  el.style.transformOrigin = mode === 'flip' ? (dir > 0 ? 'right center' : 'left center') : 'center';
  el.style.transform = inn; el.style.opacity = '0.12';
  void el.offsetWidth;
  el.style.transition = `transform ${D + 40}ms ease-out, opacity ${D + 40}ms ease-out`;
  el.style.transform = 'none'; el.style.opacity = '1';
  await sleep(D + 40);
  el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; el.style.boxShadow = ''; el.style.transformOrigin = '';
}
async function turn(dir) {
  if (!R.b || turning || S.flow !== 'paged') return;
  turning = true;
  try {
    await flipAnim(dir, async () => {
      if (R.type === 'epub') { if (dir > 0) await R.rendition.next(); else await R.rendition.prev(); }
      else await showPdfPage(R.page + dir);
    });
  } finally { turning = false; }
}

/* --- cập nhật thanh tiến độ --- */
function updateUI() {
  const b = R.b; if (!b) return;
  const pct = (b.pos && b.pos.pct) || 0, p = Math.round(pct * 100);
  const chap = R.type === 'epub' ? chapterFor(b.pos && b.pos.idx) : `Trang ${R.page}/${R.pages}`;
  $('#r-chap').textContent = chap; $('#r-pct').textContent = p + '%';
  $('#r-foot').textContent = (chap ? chap + ' · ' : '') + p + '%';
  if (!sliding) $('#r-slider').value = Math.round(pct * 1000);
  const bm = $('[data-act=bookmark]', $('#reader')); if (bm) bm.classList.toggle('on', hasBookmark());
}
const slider = $('#r-slider');
slider.addEventListener('input', () => { sliding = true; $('#r-pct').textContent = Math.round(slider.value / 10) + '%'; });
slider.addEventListener('change', async () => {
  const p = slider.value / 1000; sliding = false; if (!R.b) return;
  if (R.type === 'epub') {
    const loc = R.ebook.locations;
    if (loc && loc.length()) R.rendition.display(loc.cfiFromPercentage(p));
    else { const n = R.ebook.spine.length || R.ebook.spine.items.length; const it = R.ebook.spine.get(Math.min(n - 1, Math.floor(p * n))); if (it) R.rendition.display(it.href); }
  } else goPage(Math.round(p * (R.pages - 1)) + 1);
});

/* ---------- ePub ---------- */
function epubCSS() {
  const t = THEMES[S.theme], night = S.theme === 'night';
  return `html,body{background:${t.bg}!important;color:${t.ink}!important}
body{font-family:${FONTS[S.font]}!important;line-height:${S.lh}!important;letter-spacing:${S.ls}em!important;word-spacing:${S.ws}em!important;-webkit-text-size-adjust:none;-webkit-user-select:text;user-select:text}
body *{color:${t.ink}!important;background-color:transparent!important;font-family:inherit!important}
p,li,blockquote{line-height:${S.lh}!important}
p{text-align:${S.align}!important;-webkit-hyphens:${S.align === 'left' ? 'manual' : 'auto'};hyphens:${S.align === 'left' ? 'manual' : 'auto'};orphans:2;widows:2}
a{text-decoration:underline}
img,svg,image{max-width:100%!important;filter:grayscale(1)${night ? ' brightness(.85)' : ''}}
${S.flow === 'paged' ? 'html{touch-action:none}' : ''}
*::first-letter{color:${t.ink}!important;text-shadow:none!important;font-size:inherit!important;float:none!important;line-height:inherit!important;font-weight:inherit!important;font-family:inherit!important;-webkit-initial-letter:normal!important;initial-letter:normal!important}
*::first-line{color:${t.ink}!important}
*::before,*::after{text-shadow:none!important}
*{text-shadow:none!important}
::selection{background:${t.ink};color:${t.bg}}`;
}
function styleContents(c) {
  const d = c.document; if (!d || !d.head) return;
  let s = d.getElementById('tp-style');
  if (!s) { s = d.createElement('style'); s.id = 'tp-style'; d.head.appendChild(s); }
  s.textContent = epubCSS();
}
function restyleEpub() {
  if (R.type !== 'epub' || !R.rendition) return;
  R.rendition.getContents().forEach(styleContents);
  R.rendition.themes.fontSize(S.size + '%');
  if (R.b && R.b.notes && R.b.notes.length) setTimeout(drawAllNotes, 600);
  const cfi = R.cfi; clearTimeout(R.rt);
  R.rt = setTimeout(() => { if (cfi && R.rendition) R.rendition.display(cfi).catch(() => { }); }, 250);
}
let tocIdx = [];
async function openEpub(b, blob) {
  const buf = await blob.arrayBuffer();
  const book = ePub(buf, { openAs: 'binary' }); R.ebook = book;
  const paged = S.flow === 'paged';
  const rend = book.renderTo($('#epub-area'), paged
    ? { width: '100%', height: '100%', flow: 'paginated', spread: 'none' }
    : { width: '100%', height: '100%', flow: 'scrolled', manager: 'continuous', spread: 'none' });
  R.rendition = rend;
  rend.hooks.content.register(contents => {
    styleContents(contents);
    const frame = contents.window.frameElement;
    bindTouch(contents.document, x => (frame ? frame.getBoundingClientRect().left : 0) + x);
    contents.document.addEventListener('click', () => {
      if (!R.selMode) return;
      const sl = contents.window.getSelection();
      if (sl && !sl.isCollapsed) return;
      setTimeout(() => { const s2 = contents.window.getSelection(); if (!s2 || s2.isCollapsed) toggleChrome(); }, 120);
    });
    contents.document.addEventListener('selectionchange', () => {
      const sl = contents.window.getSelection();
      clearTimeout(selHideT);
      if (!sl || sl.isCollapsed) { selHideT = setTimeout(hideSelbar, 700); return; }
      selHideT = setTimeout(() => {
        try { const rg = sl.getRangeAt(0); if (!sl.isCollapsed) onSelected(contents.cfiFromRange(rg), sl.toString()); } catch (e) { toast('Lỗi chọn chữ: ' + e.message, 4000); }
      }, 450);
    });
  });
  rend.themes.fontSize(S.size + '%');
  rend.on('relocated', onRelocated);
  rend.on('selected', onSelected);
  try { await rend.display((b.pos && b.pos.cfi) || undefined); }
  catch (e) { console.warn('Không mở lại được vị trí cũ', e); await rend.display(); }
  drawAllNotes();
  book.ready.then(async () => { if (!b.len) { b.len = book.spine.length || 0; persistSoon(b); } await buildTocIndex(); genLocations(b, book); }).catch(console.warn);
}
function onRelocated(loc) {
  const b = R.b; if (!b || !loc || !loc.start) return;
  const cfi = loc.start.cfi; R.cfi = cfi;
  let pct = loc.start.percentage || 0;
  const L = R.ebook && R.ebook.locations;
  if (L && L.length()) { try { pct = L.percentageFromCfi(cfi); } catch (e) { } }
  else { const n = R.ebook.spine.length || 1; pct = Math.max(pct, (loc.start.index || 0) / n); }
  if (loc.atEnd) pct = 1;
  b.pos = Object.assign({}, b.pos, { cfi, pct, idx: loc.start.index, href: loc.start.href });
  b.lastRead = Date.now(); persistSoon(b); updateUI();
}
async function genLocations(b, book) {
  try {
    const ex = await DB.get('extra', b.id);
    if (ex && ex.locs) book.locations.load(ex.locs);
    else { await book.locations.generate(1200); if (R.ebook !== book) return; await DB.put('extra', { id: b.id, locs: book.locations.save() }); }
    if (R.ebook === book && R.cfi) onRelocated(R.rendition.currentLocation());
  } catch (e) { console.warn('locations', e); }
}
function spineIndexOf(href) {
  if (!href || !R.ebook) return -1;
  const base = href.split('#')[0]; const sp = R.ebook.spine;
  let it = null; try { it = sp.get(base); } catch (e) { }
  if (!it) it = (sp.items || sp.spineItems || []).find(s => s.href === base || s.href.endsWith(base) || base.endsWith(s.href));
  return it ? it.index : -1;
}
async function buildTocIndex() {
  const nav = await R.ebook.loaded.navigation; const out = [];
  const walk = (items, d) => items.forEach(it => { out.push({ label: (it.label || '').trim(), href: it.href, depth: d, index: spineIndexOf(it.href) }); if (it.subitems && it.subitems.length) walk(it.subitems, d + 1); });
  walk(nav.toc || [], 0); tocIdx = out; R.toc = out; updateUI();
}
function chapterFor(idx) {
  if (!tocIdx.length || idx == null) return '';
  let best = null;
  for (const t of tocIdx) if (t.index >= 0 && t.index <= idx) best = t;
  return best ? best.label : '';
}
function readerFraction() {
  try {
    const c = R.rendition.getContents()[0]; const loc = R.rendition.currentLocation();
    const range = c.range(loc.start.cfi); const body = c.document.body;
    const pre = c.document.createRange(); pre.setStart(body, 0); pre.setEnd(range.startContainer, range.startOffset);
    return clamp(pre.toString().length / Math.max(1, body.textContent.length), 0, 1);
  } catch (e) { return 0; }
}

/* ---------- PDF ---------- */
async function openPdf(b, blob) {
  const data = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise; R.pdf = doc; R.pages = doc.numPages;
  const area = $('#pdf-area');
  area.addEventListener('touchstart', () => { }, { passive: true });
  if (!area._bound) { area._bound = true; bindTouch(area, x => x); }
  if (S.flow === 'paged') await showPdfPage((b.pos && b.pos.page) || 1); else await buildPdfScroll();
}
let pdfTask = null;
async function showPdfPage(n) {
  n = clamp(n, 1, R.pages); const area = $('#pdf-area');
  if (pdfTask) { try { pdfTask.cancel(); } catch (e) { } }
  const page = await R.pdf.getPage(n); const v1 = page.getViewport({ scale: 1 });
  const aw = area.clientWidth, ah = area.clientHeight;
  const fit = Math.min(aw / v1.width, ah / v1.height), scale = fit * S.pdfzoom;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5), vp = page.getViewport({ scale: scale * dpr });
  let cv = area.querySelector('canvas.pg');
  if (!cv) { area.innerHTML = ''; cv = document.createElement('canvas'); cv.className = 'pg'; area.appendChild(cv); }
  cv.width = vp.width; cv.height = vp.height; cv.style.width = (vp.width / dpr) + 'px'; cv.style.height = (vp.height / dpr) + 'px';
  pdfTask = page.render({ canvasContext: cv.getContext('2d'), viewport: vp });
  try { await pdfTask.promise; } catch (e) { if (!e || e.name !== 'RenderingCancelledException') throw e; return; }
  area.scrollTop = 0; area.scrollLeft = 0;
  R.page = n; setPdfPos(n);
}
function setPdfPos(n) {
  const b = R.b; R.page = n;
  b.pos = Object.assign({}, b.pos, { page: n, pct: R.pages > 1 ? (n - 1) / (R.pages - 1) : 1 });
  b.lastRead = Date.now(); persistSoon(b); updateUI();
}
async function buildPdfScroll() {
  const area = $('#pdf-area'); area.innerHTML = ''; area.classList.add('scroll');
  const p1 = await R.pdf.getPage(1), v1 = p1.getViewport({ scale: 1 });
  const w = area.clientWidth; const h0 = Math.round(w * v1.height / v1.width); R.rowH = h0 + 10; R.rowW = w;
  const obs = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) renderScrollPage(en.target, h0); else releaseScrollPage(en.target); }), { root: area, rootMargin: '900px 0px' });
  R.obs = obs;
  for (let i = 1; i <= R.pages; i++) { const d = document.createElement('div'); d.className = 'spage'; d.dataset.n = i; d.style.height = h0 + 'px'; area.appendChild(d); obs.observe(d); }
  area.scrollTop = (((R.b.pos && R.b.pos.page) || 1) - 1) * R.rowH;
  let raf = 0;
  area.addEventListener('scroll', () => {
    if (raf) return;
    raf = setTimeout(() => { raf = 0; const n = clamp(Math.round((area.scrollTop + area.clientHeight * 0.3) / R.rowH) + 1, 1, R.pages); if (n !== R.page) setPdfPos(n); }, 150);
  }, { passive: true });
  setPdfPos((R.b.pos && R.b.pos.page) || 1);
}
async function renderScrollPage(div, h0) {
  if (div.dataset.done) return; div.dataset.done = '1';
  try {
    const page = await R.pdf.getPage(+div.dataset.n), v1 = page.getViewport({ scale: 1 });
    const sc = Math.min(R.rowW / v1.width, h0 / v1.height), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vp = page.getViewport({ scale: sc * dpr }); const cv = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height; cv.style.width = (vp.width / dpr) + 'px'; cv.style.height = (vp.height / dpr) + 'px';
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    if (div.dataset.done) { div.innerHTML = ''; div.appendChild(cv); }
  } catch (e) { delete div.dataset.done; }
}
function releaseScrollPage(div) { if (div.dataset.done) { delete div.dataset.done; div.innerHTML = ''; } }
function goPage(n) {
  n = clamp(n, 1, R.pages);
  if (S.flow === 'paged') showPdfPage(n); else { $('#pdf-area').scrollTop = (n - 1) * R.rowH; setPdfPos(n); }
}
function rerenderPdf() { if (R.type !== 'pdf') return; if (S.flow === 'paged') showPdfPage(R.page); }

/* ---------- mục lục & đánh dấu ---------- */
async function getToc() {
  if (R.toc && R.type === 'epub') return R.toc;
  if (R.type === 'epub') { await buildTocIndex(); return R.toc || []; }
  if (R.toc) return R.toc;
  const out = [];
  try {
    const ol = await R.pdf.getOutline();
    const walk = async (items, d) => {
      for (const it of items) {
        if (out.length > 500) return;
        let page = 0;
        try { let dest = it.dest; if (typeof dest === 'string') dest = await R.pdf.getDestination(dest); if (dest) page = (await R.pdf.getPageIndex(dest[0])) + 1; } catch (e) { }
        out.push({ label: it.title, depth: d, page });
        if (it.items && it.items.length) await walk(it.items, d + 1);
      }
    };
    if (ol) await walk(ol, 0);
  } catch (e) { }
  R.toc = out; return out;
}
function hasBookmark() {
  const b = R.b; if (!b || !b.bookmarks) return false;
  if (R.type === 'pdf') return b.bookmarks.some(m => m.page === R.page);
  const p = (b.pos && b.pos.pct) || 0; return b.bookmarks.some(m => m.cfi === R.cfi || Math.abs(m.pct - p) < 0.0015);
}
function toggleBookmark() {
  const b = R.b; if (!b) return; b.bookmarks = b.bookmarks || [];
  if (hasBookmark()) {
    const p = (b.pos && b.pos.pct) || 0;
    b.bookmarks = b.bookmarks.filter(m => R.type === 'pdf' ? m.page !== R.page : !(m.cfi === R.cfi || Math.abs(m.pct - p) < 0.0015));
    toast('Đã bỏ đánh dấu');
  } else {
    let snip = '';
    if (R.type === 'epub') { try { const r = R.rendition.getRange(R.cfi); snip = r ? r.toString().replace(/\s+/g, ' ').trim().slice(0, 70) : ''; } catch (e) { } }
    const label = R.type === 'pdf' ? `Trang ${R.page}` : (chapterFor(b.pos.idx) || 'Đoạn đã đánh dấu');
    b.bookmarks.push({ id: uid(), label, snip, pct: (b.pos && b.pos.pct) || 0, cfi: R.type === 'epub' ? R.cfi : '', page: R.type === 'pdf' ? R.page : 0, t: Date.now() });
    toast('Đã đánh dấu trang này');
  }
  persistSoon(b); updateUI();
}
let selHideT = 0;
let selPoll = 0;
function hideSelbar(force) {
  if (!force && Date.now() - (R.hold || 0) < 3000) return;
  const b = $('#selbar'); if (b) b.hidden = true; R.sel = null;
}
function pollSel() {
  if (!R.selMode || !R.rendition) { clearInterval(selPoll); selPoll = 0; return; }
  try {
    for (const c of R.rendition.getContents()) {
      const sl = c.window.getSelection();
      if (sl && !sl.isCollapsed) {
        const t = sl.toString().replace(/\s+/g, ' ').trim();
        if (t.length >= 2) { if (!R.sel || R.sel.text !== t) onSelected(c.cfiFromRange(sl.getRangeAt(0)), t); R.miss = 0; return; }
      }
    }
    if (R.sel && ++R.miss >= 2) hideSelbar();
  } catch (e) { }
}
function clearSelection() { try { R.rendition.getContents().forEach(c => { const sl = c.window.getSelection(); if (sl) sl.removeAllRanges(); }); } catch (e) { } }
function onSelected(cfiRange, rawText) {
  let text = rawText || '';
  if (!text) { try { const r = R.rendition.getRange(cfiRange); text = r ? r.toString() : ''; } catch (e) { } }
  text = text.replace(/\s+/g, ' ').trim(); if (text.length < 2 || !cfiRange) return;
  clearTimeout(selHideT); R.sel = { cfi: cfiRange, text }; $('#selbar').hidden = false;
}
function hlStyles(kind) {
  const night = S.theme === 'night', c = night ? '#ffffff' : '#000000';
  return kind === 'underline' ? { stroke: c, 'stroke-opacity': '0.8', 'stroke-width': '1.5', 'mix-blend-mode': 'normal' }
    : { fill: c, 'fill-opacity': night ? '0.3' : '0.2', 'mix-blend-mode': night ? 'screen' : 'multiply' };
}
function drawNote(n) {
  if (!R.rendition || R.type !== 'epub') return;
  try { R.rendition.annotations.remove(n.cfi, 'highlight'); R.rendition.annotations.remove(n.cfi, 'underline'); } catch (e) { }
  try { R.rendition.annotations.add(n.style === 'underline' ? 'underline' : 'highlight', n.cfi, { id: n.id }, () => noteMenu(n), 'tp-hl', hlStyles(n.style)); } catch (e) { console.warn(e); }
}
function drawAllNotes() { if (R.b && R.type === 'epub') (R.b.notes || []).forEach(drawNote); }
function createNote(kind, noteText) {
  const sel = R.sel, b = R.b; if (!sel || !b) return;
  b.notes = b.notes || [];
  const n = { id: uid(), cfi: sel.cfi, text: sel.text.slice(0, 2000), style: kind, note: noteText || '', t: Date.now(), pct: (b.pos && b.pos.pct) || 0, label: chapterFor(b.pos && b.pos.idx) || '' };
  b.notes.push(n); drawNote(n); clearSelection(); hideSelbar(); persistSoon(b);
  toast(noteText ? 'Đã lưu ghi chú' : (kind === 'underline' ? 'Đã gạch chân' : 'Đã tô sáng'));
}
function bindSelbar() {
  $('#selbar').addEventListener('touchstart', () => { R.hold = Date.now(); }, { passive: true });
  $('#selbar').addEventListener('click', async e => {
    const t = e.target.closest('[data-sel]'); if (!t || !R.sel) return;
    const a = t.dataset.sel, sel = R.sel; R.hold = 0;
    if (a === 'hl') createNote('highlight');
    else if (a === 'ul') createNote('underline');
    else if (a === 'note') {
      const r = await ask({ title: 'Ghi chú cho đoạn này', msg: '“' + sel.text.slice(0, 120) + (sel.text.length > 120 ? '…' : '') + '”', fields: [{ name: 'n', label: 'Nội dung ghi chú' }] });
      if (r && r.n) { R.sel = sel; createNote('highlight', r.n); }
    }
    else if (a === 'share') quoteSheet(sel.text);
    else if (a === 'copy') { try { await navigator.clipboard.writeText(sel.text); toast('Đã sao chép'); } catch (err) { toast('Không sao chép được'); } }
    else if (a === 'x') { clearSelection(); hideSelbar(); }
  });
}
function noteMenu(n) {
  const b = R.b; if (!b) return;
  const o = openLayer(`<h3>${n.style === 'underline' ? 'Gạch chân' : 'Tô sáng'}</h3>
    <p class="msg" style="font:italic 15px/1.5 var(--font);color:var(--ink)">“${esc(n.text.slice(0, 300))}${n.text.length > 300 ? '…' : ''}”</p>
    ${n.note ? `<p class="msg"><b>Ghi chú:</b> ${esc(n.note)}</p>` : ''}
    <div class="menu"><button data-m="go">Đi tới đoạn này</button><button data-m="note">${n.note ? 'Sửa' : 'Thêm'} ghi chú…</button>
    <button data-m="style">Đổi sang ${n.style === 'underline' ? 'tô nền' : 'gạch chân'}</button>
    <button data-m="share">Chia sẻ thành ảnh trích dẫn…</button><button data-m="del" class="danger">Xóa</button></div>`);
  o.addEventListener('click', async e => {
    const m = e.target.dataset && e.target.dataset.m; if (!m) return; o.close();
    if (m === 'go') { toggleChrome(false); R.rendition.display(n.cfi).catch(() => { }); }
    if (m === 'note') { const r = await ask({ title: 'Ghi chú', fields: [{ name: 'n', label: 'Nội dung ghi chú', value: n.note }] }); if (r) { n.note = r.n; persistSoon(b); toast('Đã lưu ghi chú'); } }
    if (m === 'style') { n.style = n.style === 'underline' ? 'highlight' : 'underline'; drawNote(n); persistSoon(b); }
    if (m === 'share') quoteSheet(n.text);
    if (m === 'del') {
      try { R.rendition.annotations.remove(n.cfi, 'highlight'); R.rendition.annotations.remove(n.cfi, 'underline'); } catch (err) { }
      b.notes = b.notes.filter(x => x.id !== n.id); persistSoon(b); toast('Đã xóa');
    }
  });
}
async function shareText(txt) {
  if (navigator.share) { try { await navigator.share({ text: txt, title: R.b.title }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(txt); toast('Đã chép vào bộ nhớ tạm'); } catch (e) { toast('Không chia sẻ được'); }
}
function notesText() {
  const b = R.b;
  return b.title + (b.author ? ' — ' + b.author : '') + '\n\n' + (b.notes || []).slice().sort((x, y) => x.pct - y.pct).map(n => `• “${n.text}”${n.note ? '\n   Ghi chú: ' + n.note : ''}${n.label ? '\n   (' + n.label + ')' : ''}`).join('\n\n');
}

/* ---------- ảnh trích dẫn ---------- */
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const qFill = (g, W, H, c) => { g.fillStyle = c; g.fillRect(0, 0, W, H); };
const qGrad = (g, W, H, stops, x0 = 0, y0 = 0, x1 = 0, y1 = H) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
const qGrain = (g, W, H, r, rgb, n = 9000) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${rgb},${r() * 0.035})`; g.fillRect(r() * W, r() * H, 2, 2); } };
const qFrame = (g, W, H, col) => { g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(60, 60, W - 120, H - 120); g.lineWidth = 1.5; g.strokeRect(76, 76, W - 152, H - 152); };
const qPanel = (g, W, H, col, y0 = 250) => {
  const x = 90, y = y0, w = W - 180, h = H - 90 - y0, r = 26;
  g.fillStyle = col; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill();
};
const qLeaf = (g, x, y, len, ang, col) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.ellipse(len / 2, 0, len / 2, len / 4.2, 0, 0, 7); g.fill(); g.restore(); };
const qFlower = (g, x, y, rad, col, mid) => {
  g.save(); g.translate(x, y); g.fillStyle = col;
  for (let k = 0; k < 5; k++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(rad * 0.62, 0, rad * 0.62, rad * 0.4, 0, 0, 7); g.fill(); }
  g.fillStyle = mid; g.beginPath(); g.arc(0, 0, rad * 0.2, 0, 7); g.fill(); g.restore();
};
function qVine(g, r, p0, c, p1, o) {
  const pt = t => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]];
  g.strokeStyle = o.stem; g.lineWidth = o.w || 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(p0[0], p0[1]);
  for (let i = 1; i <= 40; i++) { const q = pt(i / 40); g.lineTo(q[0], q[1]); } g.stroke();
  for (let i = 2; i <= 40; i++) {
    const [x, y] = pt(i / 40), [x2, y2] = pt(Math.min(1, i / 40 + 0.02)), ang = Math.atan2(y2 - y, x2 - x);
    const L = (o.leaf || 46) * (0.6 + r() * 0.6);
    qLeaf(g, x, y, L, ang + 1.0 + r() * 0.4, o.leaves[i % o.leaves.length]); qLeaf(g, x, y, L, ang - 1.0 - r() * 0.4, o.leaves[(i + 1) % o.leaves.length]);
    if (o.flowers && i % 6 === 0) qFlower(g, x + (r() - 0.5) * 24, y + (r() - 0.5) * 24, (o.fr || 26) * (0.7 + r() * 0.6), o.flowers[i % o.flowers.length], '#ffd34d');
  }
}
const QT = [
  { id: 'paper', label: 'Giấy', ink: '#161513', mute: '#77736a', draw(g, W, H, r) { qFill(g, W, H, '#f4f1ea'); qGrain(g, W, H, r, '0,0,0'); qFrame(g, W, H, '#161513'); } },
  { id: 'eink', label: 'E-ink', ink: '#0d0d0d', mute: '#585853', draw(g, W, H, r) { qFill(g, W, H, '#dddcd7'); qGrain(g, W, H, r, '0,0,0'); qFrame(g, W, H, '#0d0d0d'); } },
  { id: 'night', label: 'Đêm', ink: '#e6e3da', mute: '#8d8a82', draw(g, W, H, r) { qFill(g, W, H, '#0f0f0e'); qGrain(g, W, H, r, '255,255,255'); qFrame(g, W, H, '#e6e3da'); } },
  { id: 'school', label: 'Thanh xuân', ink: '#3a2a2a', mute: '#8a6a62',
    draw(g, W, H, r) {
      qGrad(g, W, H, [[0, '#a9d8f2'], [0.45, '#e9f3f7'], [1, '#fdeedd']]);
      const sun = g.createRadialGradient(W - 170, 150, 10, W - 170, 150, 260); sun.addColorStop(0, 'rgba(255,244,190,.95)'); sun.addColorStop(1, 'rgba(255,244,190,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, 500);
      g.fillStyle = 'rgba(255,255,255,.8)'; [[200, 190, 1], [620, 120, .8], [880, 300, .7]].forEach(([x, y, k]) => { [[0, 0, 70], [60, -20, 60], [120, 0, 65], [60, 20, 70]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx * k, y + dy * k, rr * k, 0, 7); g.fill(); }); });
      // trường học mờ phía dưới
      const by = H - 330; g.fillStyle = '#f2d4c0'; g.fillRect(120, by, W - 240, 230); g.fillStyle = '#d98f7c'; g.beginPath(); g.moveTo(100, by); g.lineTo(W / 2, by - 90); g.lineTo(W - 100, by); g.closePath(); g.fill();
      g.fillStyle = '#fff6e0'; for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) g.fillRect(170 + i * 140, by + 30 + j * 100, 70, 62);
      g.fillStyle = '#8bbf6a'; g.beginPath(); g.ellipse(W / 2, H - 80, W * 0.7, 170, 0, 0, 7); g.fill();
      for (let i = 0; i < 26; i++) { g.save(); g.translate(r() * W, r() * H); g.rotate(r() * 6); g.fillStyle = r() < 0.7 ? 'rgba(232,69,44,.85)' : 'rgba(255,170,160,.85)'; g.beginPath(); g.ellipse(0, 0, 13, 7, 0, 0, 7); g.fill(); g.restore(); }
      qPanel(g, W, H, 'rgba(255,252,247,.86)', 270);
      const o = { stem: '#6b4a3a', leaves: ['#6fae5a', '#8cc66e', '#5c9a4c'], flowers: ['#e8452c', '#f25c3b', '#d93a2b'], leaf: 54, fr: 34 };
      qVine(g, r, [-20, 40], [260, 40], [500, 210], o); qVine(g, r, [W + 20, 20], [W - 220, 60], [W - 420, 230], { ...o, flowers: ['#f25c3b', '#e8452c'] });
    } },
  { id: 'science', label: 'Khoa học', ink: '#f2f7ff', mute: '#8fb2e0',
    draw(g, W, H, r) {
      qGrad(g, W, H, [[0, '#071a38'], [1, '#0d2c57']]);
      g.strokeStyle = 'rgba(120,170,230,.13)'; g.lineWidth = 1; for (let x = 0; x < W; x += 54) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 54) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      const atom = (cx, cy, R, al) => { g.strokeStyle = `rgba(150,200,255,${al})`; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.save(); g.translate(cx, cy); g.rotate(k * Math.PI / 3); g.beginPath(); g.ellipse(0, 0, R, R * 0.36, 0, 0, 7); g.stroke(); g.fillStyle = `rgba(255,220,120,${al + .1})`; g.beginPath(); g.arc(R * Math.cos(k * 2), R * 0.36 * Math.sin(k * 2), 9, 0, 7); g.fill(); g.restore(); } g.fillStyle = `rgba(255,120,100,${al + .2})`; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill(); };
      atom(W - 190, 190, 130, 0.55); atom(W - 150, H - 120, 80, 0.3);
      g.font = 'italic 34px Georgia,serif'; g.fillStyle = 'rgba(160,200,255,.2)';
      ['E = mc²', 'F = ma', 'ΔxΔp ≥ ħ/2', 'eⁱᵖ + 1 = 0', 'a² + b² = c²', 'PV = nRT', 'λ = h / p', 'ΣF = 0', 'v = fλ', 'C₆H₁₂O₆'].forEach((t, i) => g.fillText(t, 100 + (i % 2) * 520 + r() * 60, 330 + i * ((H - 600) / 9)));
      g.strokeStyle = '#8fb2e0'; g.lineWidth = 3; g.strokeRect(60, 60, W - 120, H - 120);
    } },
  { id: 'garden', label: 'Vườn xanh', ink: '#1f3a24', mute: '#5c7a60',
    draw(g, W, H, r) {
      qGrad(g, W, H, [[0, '#f4f9ec'], [1, '#d9ecd0']]); qGrain(g, W, H, r, '30,80,30', 5000);
      qPanel(g, W, H, 'rgba(255,255,255,.72)', 240);
      const o = { stem: '#4d7a45', leaves: ['#5f9e57', '#7bb86a', '#3f8a4f', '#98c97f'], leaf: 60, flowers: ['#f6a6b8', '#fff0f3', '#ffc9a8'], fr: 28 };
      qVine(g, r, [-10, H - 40], [30, H - 420], [30, 200], o); qVine(g, r, [W + 10, 40], [W - 30, 420], [W - 30, H - 120], { ...o, flowers: ['#ffd36b', '#fff3c4'] });
      qVine(g, r, [-20, 30], [300, 60], [620, 40], { ...o, flowers: null, leaf: 44 });
    } },
  { id: 'sunset', label: 'Hoàng hôn', ink: '#fffaf2', mute: '#ffe0cf', shadow: true,
    draw(g, W, H, r) {
      qGrad(g, W, H, [[0, '#3a3a7a'], [0.4, '#d86a7a'], [0.7, '#ffb26b'], [1, '#ffe2a8']]);
      const sg = g.createRadialGradient(W / 2, H - 330, 20, W / 2, H - 330, 330); sg.addColorStop(0, 'rgba(255,250,210,1)'); sg.addColorStop(0.35, 'rgba(255,210,140,.7)'); sg.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = sg; g.fillRect(0, H - 700, W, 700);
      for (let k = 0; k < 5; k++) { g.fillStyle = `rgba(${40 + k * 8},${30 + k * 6},${90 - k * 8},${0.3 + k * 0.14})`; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 12) g.lineTo(x, H - 170 + k * 36 + Math.sin(x / 70 + k * 1.7) * 11); g.lineTo(W, H); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(40,30,70,.7)'; g.lineWidth = 4; g.lineCap = 'round'; [[200, 300], [300, 250], [420, 330]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 30, y); g.quadraticCurveTo(x - 12, y - 22, x, y); g.quadraticCurveTo(x + 12, y - 22, x + 30, y); g.stroke(); });
      qPanel(g, W, H, 'rgba(30,20,60,.28)', 250);
    } },
  { id: 'stars', label: 'Đêm sao', ink: '#f6f0d8', mute: '#b8b4cf',
    draw(g, W, H, r) {
      qGrad(g, W, H, [[0, '#070a24'], [0.6, '#1a1f5a'], [1, '#33307a']]);
      for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H, s = r() * 2.4 + 0.4; g.fillStyle = `rgba(255,250,220,${0.4 + r() * 0.6})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
      const mg = g.createRadialGradient(W - 210, 190, 20, W - 210, 190, 200); mg.addColorStop(0, 'rgba(255,245,200,.55)'); mg.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = mg; g.fillRect(W - 420, 0, 420, 420);
      g.fillStyle = '#fff3c2'; g.beginPath(); g.arc(W - 210, 190, 72, 0, 7); g.fill(); g.fillStyle = 'rgba(210,190,130,.45)'; [[-20, -10, 14], [18, 22, 10], [8, -30, 8]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(W - 210 + dx, 190 + dy, rr, 0, 7); g.fill(); });
      g.strokeStyle = 'rgba(246,240,216,.7)'; g.lineWidth = 2.5; g.strokeRect(70, 70, W - 140, H - 140);
    } },
  { id: 'vintage', label: 'Cổ điển', ink: '#3b2a17', mute: '#7d6643',
    draw(g, W, H, r) {
      qFill(g, W, H, '#ecdcb8'); qGrain(g, W, H, r, '90,60,20', 14000);
      const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78); v.addColorStop(0, 'rgba(120,80,30,0)'); v.addColorStop(1, 'rgba(120,80,30,.38)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#5a4020'; g.lineWidth = 5; g.strokeRect(56, 56, W - 112, H - 112); g.lineWidth = 1.5; g.strokeRect(78, 78, W - 156, H - 156);
      g.fillStyle = '#5a4020'; [[56, 56], [W - 56, 56], [56, H - 56], [W - 56, H - 56]].forEach(([x, y]) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-14, -14, 28, 28); g.restore(); });
      g.fillRect(W / 2 - 60, 74, 120, 3); g.fillRect(W / 2 - 60, H - 77, 120, 3);
    } },
  { id: 'ink', label: 'Thủy mặc', ink: '#111111', mute: '#5d5a52',
    draw(g, W, H, r) {
      qFill(g, W, H, '#f1eee5'); qGrain(g, W, H, r, '0,0,0', 7000);
      [[0.10, 260, 0.65], [0.16, 200, 0.45], [0.24, 140, 0.3]].forEach(([al, hh, sp], k) => { g.fillStyle = `rgba(20,20,20,${al})`; g.beginPath(); g.moveTo(0, H); let y = H - hh - k * 40; for (let x = 0; x <= W; x += 30) { y += (r() - 0.5) * 70 * sp; y = Math.max(H - hh - 180, Math.min(H - 40, y)); g.lineTo(x, y); } g.lineTo(W, H); g.closePath(); g.fill(); });
      g.strokeStyle = 'rgba(20,20,20,.55)'; g.lineWidth = 2; g.strokeRect(70, 70, W - 140, H - 140);
      g.fillStyle = '#b3261e'; g.fillRect(W - 190, H - 250, 84, 84); g.fillStyle = '#f7e8e4'; g.font = 'bold 34px serif'; g.textAlign = 'center'; g.fillText('書', W - 148, H - 213); g.fillText('房', W - 148, H - 175); g.textAlign = 'left';
    } },
];
function renderQuote(text, theme, title, author, ratio) {
  const W = 1080, H = ratio === 'sq' ? 1080 : ratio === 'story' ? 1920 : 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const t = QT.find(x => x.id === theme) || QT[0], r = mulberry(hashStr(text) + 7);
  t.draw(g, W, H, r);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  if (t.shadow) { g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 2; }
  const small = H <= 1100, qs = small ? 160 : 220, top = small ? 290 : 360, cb = small ? 250 : 300;
  g.fillStyle = t.ink; g.font = `bold ${qs}px Georgia,serif`; g.fillText('“', 120, top - 30 + (small ? -10 : 0));
  let body = text.replace(/\s+/g, ' ').trim(); if (body.length > 620) body = body.slice(0, 617).trim() + '…';
  const words = body.split(' '), maxW = W - 260, bot = H - cb - 40;
  const wrap = fs => { g.font = `italic ${fs}px Georgia,"Times New Roman",serif`; const out = []; let l = ''; for (const w of words) { const tt = l ? l + ' ' + w : w; if (g.measureText(tt).width > maxW && l) { out.push(l); l = w; } else l = tt; } if (l) out.push(l); return out; };
  let fs = 62, lines = wrap(fs);
  while (lines.length * fs * 1.5 > bot - top && fs > 24) { fs -= 2; lines = wrap(fs); }
  const lh = fs * 1.5, y0 = top + (bot - top - lines.length * lh) / 2 + fs;
  g.fillStyle = t.ink; lines.forEach((l, i) => g.fillText(l, 130, y0 + i * lh));
  g.fillRect(130, H - cb, 90, 3);
  const fit = (txt, w) => { if (g.measureText(txt).width <= w) return txt; while (txt.length > 1 && g.measureText(txt + '…').width > w) txt = txt.slice(0, -1); return txt + '…'; };
  g.font = 'bold 40px Georgia,serif'; g.fillStyle = t.ink; g.fillText(fit(title || '', maxW), 130, H - cb + 65);
  if (author) { g.font = 'italic 32px Georgia,serif'; g.fillStyle = t.mute; g.fillText(fit(author, maxW), 130, H - cb + 115); }
  g.font = '600 24px -apple-system,Helvetica,sans-serif'; g.fillStyle = t.mute; g.fillText('T H Ư   P H Ò N G', 130, H - cb + 175);
  g.shadowColor = 'transparent';
  return new Promise(res => c.toBlob(res, 'image/png'));
}
async function quoteSheet(text) {
  let theme = ['paper', 'eink', 'night'].includes(S.theme) ? S.theme : 'paper', ratio = 'p', blob = null, url = '';
  const b = R.b || {};
  const o = openLayer(`<h3>Ảnh trích dẫn</h3>
    <img id="q-img" alt="Ảnh trích dẫn" style="width:100%;max-height:52vh;object-fit:contain;display:block;border:1px solid var(--ink);margin:8px 0 12px;min-height:120px">
    <div id="q-th" style="display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;-webkit-overflow-scrolling:touch">${QT.map(x => `<button type="button" class="btn" data-v="${x.id}" style="flex:none;white-space:nowrap">${x.label}</button>`).join('')}</div>
    <div class="seg" id="q-ra">${[['p', 'Dọc 4:5'], ['sq', 'Vuông'], ['story', 'Story 9:16']].map(([v, l]) => `<button type="button" data-r="${v}" class="${v === ratio ? 'on' : ''}">${l}</button>`).join('')}</div>
    <button class="btn solid wide" id="q-share">Lưu / Gửi cho bạn bè</button>
    <p class="small" style="margin-top:8px">Nếu chưa hiện bảng chia sẻ, hãy nhấn giữ vào ảnh rồi chọn “Lưu vào Ảnh”.</p>
    <button class="btn wide" data-close>Đóng</button>`);
  const img = $('#q-img', o);
  const mark = () => $$('#q-th button', o).forEach(x => { const on = x.dataset.v === theme; x.classList.toggle('solid', on); });
  const draw = async () => { mark(); blob = await renderQuote(text, theme, b.title, b.author, ratio); if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob); img.src = url; };
  $('#q-th', o).addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; theme = t.dataset.v; draw(); });
  $('#q-ra', o).addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; ratio = t.dataset.r; $$('#q-ra button', o).forEach(x => x.classList.toggle('on', x === t)); draw(); });
  $('#q-share', o).onclick = async () => {
    if (!blob) return;
    const file = new File([blob], 'trich-dan.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = url; a.download = 'trich-dan.png'; document.body.appendChild(a); a.click(); a.remove();
  };
  draw();
}

/* ---------- tìm trong sách ---------- */
function hiExcerpt(ex, term) {
  const i = ex.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return esc(ex);
  return esc(ex.slice(0, i)) + '<mark>' + esc(ex.slice(i, i + term.length)) + '</mark>' + esc(ex.slice(i + term.length));
}
async function pdfRawText(i) {
  R.ptext = R.ptext || {};
  if (R.ptext[i] != null) return R.ptext[i];
  const page = await R.pdf.getPage(i + 1), tc = await page.getTextContent();
  const t = tc.items.map(it => typeof it.str === 'string' ? it.str : '').join(' ').replace(/\s+/g, ' ').trim();
  R.ptext[i] = t; return t;
}
function showSearch() {
  const o = openLayer(`<h3>Tìm trong sách</h3>
    <div class="searchbox"><input id="bs-q" type="search" placeholder="Gõ từ hoặc câu cần tìm…" autocomplete="off" enterkeyhint="search"><button class="btn solid" id="bs-go">Tìm</button></div>
    <p class="small" id="bs-st" style="margin:8px 0"></p><div id="bs-res"></div>`);
  const inp = $('#bs-q', o), stt = $('#bs-st', o), box = $('#bs-res', o);
  let tok = 0, results = [], term = '';
  o.onclose = () => { tok++; };
  const show = () => {
    box.innerHTML = results.slice(0, 200).map((r, i) => `<button class="li" data-k="${i}" style="display:block"><div class="where">${esc(r.where)}</div>${hiExcerpt(r.excerpt, term)}</button>`).join('');
  };
  const run = async () => {
    term = inp.value.trim(); if (term.length < 2) { stt.textContent = 'Gõ ít nhất 2 ký tự.'; return; }
    const my = ++tok; results = []; box.innerHTML = '';
    try {
      if (R.type === 'epub') {
        const n = R.ebook.spine.length || R.ebook.spine.items.length;
        for (let i = 0; i < n; i++) {
          if (my !== tok) return;
          stt.textContent = `Đang tìm… ${i + 1}/${n} · ${results.length} kết quả`;
          try {
            const item = R.ebook.spine.get(i); await item.load(R.ebook.load.bind(R.ebook));
            const found = (item.find ? item.find(term) : item.search(term)) || [];
            found.forEach(f => results.push({ cfi: f.cfi, excerpt: f.excerpt, where: chapterFor(i) || ('Phần ' + (i + 1)) }));
            try { item.unload(); } catch (e) { }
          } catch (e) { }
          if (results.length >= 200) break;
          if (i % 3 === 2) show();
        }
      } else {
        const lt = term.toLowerCase();
        for (let i = 0; i < R.pages; i++) {
          if (my !== tok) return;
          if (i % 5 === 0) stt.textContent = `Đang tìm… trang ${i + 1}/${R.pages} · ${results.length} kết quả`;
          const t = await pdfRawText(i), low = t.toLowerCase(); let pos = 0, c = 0;
          while (c < 3 && (pos = low.indexOf(lt, pos)) >= 0) {
            results.push({ page: i + 1, excerpt: t.slice(Math.max(0, pos - 60), pos + term.length + 80), where: 'Trang ' + (i + 1) }); pos += lt.length; c++;
          }
          if (results.length >= 200) break;
          if (i % 10 === 9) show();
        }
      }
    } catch (err) { console.warn(err); }
    if (my !== tok) return; show();
    stt.textContent = results.length ? (results.length >= 200 ? '200+ kết quả (hiện 200 đầu tiên)' : results.length + ' kết quả') : 'Không tìm thấy. Hãy thử gõ đúng dấu tiếng Việt hoặc ít chữ hơn.';
  };
  $('#bs-go', o).onclick = run;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { inp.blur(); run(); } });
  o.addEventListener('click', e => {
    const t = e.target.closest('[data-k]'); if (!t) return;
    const r = results[+t.dataset.k]; if (!r) return;
    o.close(); toggleChrome(false);
    if (R.type === 'pdf') { goPage(r.page); return; }
    R.rendition.display(r.cfi).then(() => {
      try {
        R.rendition.annotations.highlight(r.cfi, {}, () => { }, 'tp-find', { fill: '#000', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' });
        setTimeout(() => { try { R.rendition.annotations.remove(r.cfi, 'highlight'); } catch (e) { } }, 4500);
      } catch (e) { }
    }).catch(() => { });
  });
  setTimeout(() => inp.focus(), 80);
}

/* ---------- mục lục · đánh dấu · ghi chú ---------- */
async function showToc(tab = 'toc') {
  const o = openLayer(`<div class="tabs"><button data-t="toc">Mục lục</button><button data-t="bm">Đánh dấu</button><button data-t="nt">Ghi chú</button></div><div id="toc-body"></div>`);
  const body = $('#toc-body', o); let items = [];
  const draw = async t => {
    $$('.tabs button', o).forEach(x => x.classList.toggle('on', x.dataset.t === t));
    if (t === 'toc') {
      body.innerHTML = '<p class="msg">Đang tải…</p>'; items = await getToc();
      body.innerHTML = items.length ? items.map((it, i) => `<button class="li" data-n="${i}" style="padding-left:${6 + it.depth * 16}px">${esc(it.label)}${it.page ? `<span>${it.page}</span>` : ''}</button>`).join('') : '<p class="msg">Sách này không có mục lục.</p>';
    } else if (t === 'bm') {
      const bms = (R.b.bookmarks || []).slice().sort((a, b) => a.pct - b.pct);
      body.innerHTML = bms.length ? bms.map(m => `<div class="li"><button data-g="${m.id}" style="all:unset;flex:1;cursor:pointer"><b style="font-weight:600">${esc(m.label)}</b>${m.snip ? `<br><span style="font:italic 13px var(--font)">${esc(m.snip)}…</span>` : ''}</button><span>${Math.round(m.pct * 100)}%</span><button class="x" data-d="${m.id}" aria-label="Xóa">${icon('close', 16)}</button></div>`).join('') : '<p class="msg">Chưa có đánh dấu. Bấm biểu tượng đánh dấu trên thanh trên cùng để lưu trang đang đọc.</p>';
    } else {
      if (R.type !== 'epub') { body.innerHTML = '<p class="msg">Tô sáng và ghi chú hiện chỉ dùng được với sách ePub.</p>'; return; }
      const ns = (R.b.notes || []).slice().sort((a, b) => a.pct - b.pct);
      body.innerHTML = ns.length
        ? ns.map(n => `<div class="li"><button data-hn="${n.id}" style="all:unset;flex:1;cursor:pointer"><i class="q ${n.style}">“${esc(n.text.slice(0, 160))}${n.text.length > 160 ? '…' : ''}”</i>${n.note ? `<br><b style="font:600 14px var(--ui)">✎ ${esc(n.note)}</b>` : ''}<br><small style="font:11px var(--ui);color:var(--mute)">${esc(n.label || '')} · ${Math.round(n.pct * 100)}%</small></button><button class="x" data-hm="${n.id}" aria-label="Tùy chọn">${icon('more', 18)}</button></div>`).join('') + '<button class="btn wide" data-exp>Chia sẻ tất cả ghi chú (văn bản)</button>'
        : '<p class="msg">Chưa có ghi chú. Bấm nút bút trên thanh trên cùng để bật chế độ chọn chữ, nhấn giữ vào chữ rồi kéo để chọn, sau đó chọn Tô sáng, Gạch chân hoặc Ghi chú.</p>';
    }
  };
  o.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.t) return draw(t.dataset.t);
    if (t.dataset.exp !== undefined) return shareText(notesText());
    if (t.dataset.hn) { const n = R.b.notes.find(x => x.id === t.dataset.hn); o.close(); toggleChrome(false); if (n) R.rendition.display(n.cfi).catch(() => { }); return; }
    if (t.dataset.hm) { const n = R.b.notes.find(x => x.id === t.dataset.hm); o.close(); if (n) noteMenu(n); return; }
    if (t.dataset.n != null) {
      const it = items[+t.dataset.n]; o.close(); toggleChrome(false);
      if (R.type === 'pdf') { if (it.page) goPage(it.page); return; }
      let target = it.href; const i = spineIndexOf(it.href);
      if (i >= 0) { const sp = R.ebook.spine.get(i); const frag = (it.href.split('#')[1]); target = sp.href + (frag ? '#' + frag : ''); }
      R.rendition.display(target).catch(() => R.rendition.display(it.href).catch(() => { }));
    }
    if (t.dataset.g) {
      const m = R.b.bookmarks.find(x => x.id === t.dataset.g); o.close(); toggleChrome(false);
      if (m) { if (R.type === 'pdf') goPage(m.page); else R.rendition.display(m.cfi); }
    }
    if (t.dataset.d) { R.b.bookmarks = R.b.bookmarks.filter(x => x.id !== t.dataset.d); persistSoon(R.b); updateUI(); draw('bm'); }
  });
  draw(tab);
}

/* =====================================================================
   NGHE SÁCH (đọc thành tiếng bằng giọng có sẵn trên iPhone)
   ===================================================================== */
const A = {};
function resetAudio() {
  try { if (A.playing) speechSynthesis.cancel(); } catch (e) { }
  releaseWake(); clearTimeout(A.timer);
  Object.assign(A, { playing: false, bookId: '', unit: 0, sent: 0, sents: [], count: 0, gen: 0, lgen: 0, lang: 'vi-VN', langSet: false, cache: new Map(), busy: false, err: 0, timer: 0 });
}
resetAudio();
const speechOK = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const VI = /[ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ]/gi;

function splitSentences(text) {
  const out = [];
  for (let par of text.split(/\n+/)) {
    par = par.replace(/\s+/g, ' ').trim(); if (!par) continue;
    const parts = par.match(/[^.!?…]+(?:[.!?…]+["'”’)\]»]*|$)\s*/g) || [par];
    for (let p of parts) {
      p = p.trim(); if (!/[\p{L}\p{N}]/u.test(p)) continue;
      while (p.length > 260) {
        let cut = p.lastIndexOf(',', 240); if (cut < 80) cut = p.lastIndexOf(' ', 240); if (cut < 80) cut = 240;
        out.push(p.slice(0, cut + 1).trim()); p = p.slice(cut + 1).trim();
      }
      if (p) out.push(p);
    }
  }
  return out;
}
const SKIP_RE = /^(muc luc|loi cam on|loi tua|loi noi dau|loi ngo|loi gioi thieu|cam on|tri an|ban quyen|ve tac gia|thong tin xuat ban|table of contents|contents|acknowledg|copyright|preface|foreword|about the author|dedication|title page|cover)/;
function skipEpubUnit(i, sec, src, sents) {
  const t = tocIdx.find(x => x.index === i), label = norm(t ? t.label : '');
  const head = (src.outerHTML || '').slice(0, 700), m = head.match(/epub:type="([^"]+)"/), ty = m ? m[1].toLowerCase() : '';
  const href = (sec.href || '').toLowerCase();
  if (/(^|\s)(toc|landmarks|copyright-page|colophon|dedication|acknowledgments|titlepage|halftitle|cover|imprint)(\s|$)/.test(ty)) return true;
  if (/(^|[\/_-])(toc|nav|copyright|colophon|cover|titlepage|title_page|acknowledg\w*|dedication)\.x?html?$/.test(href)) return true;
  if (SKIP_RE.test(label)) return true;
  const chars = sents.reduce((a, x) => a + x.length, 0);
  return sents.length <= 3 && chars < 160;
}
async function epubUnit(i) {
  const sec = R.ebook.spine.get(i); if (!sec) return [];
  const root = await sec.load(R.ebook.load.bind(R.ebook));
  const src = root.querySelector ? root.querySelector('body') : null; if (!src) return [];
  const body = src.cloneNode(true);
  body.querySelectorAll('script,style').forEach(n => n.remove());
  body.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,tr,blockquote,section,br').forEach(n => n.insertAdjacentText('afterend', '\n'));
  const out = splitSentences(body.textContent || '');
  out.skipFlag = skipEpubUnit(i, sec, src, out);
  return out;
}
async function pdfUnit(i) {
  const page = await R.pdf.getPage(i + 1); const tc = await page.getTextContent();
  const lines = []; let cur = '', lastY = null;
  for (const it of tc.items) {
    if (typeof it.str !== 'string') continue;
    const y = Math.round(it.transform[5]);
    if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(cur); cur = ''; }
    cur += it.str; lastY = y;
    if (it.hasEOL) { lines.push(cur); cur = ''; lastY = null; }
  }
  if (cur) lines.push(cur);
  let ls = lines.map(l => l.trim()).filter(Boolean);
  const dotted = ls.filter(l => /(\.{4,}|…{2,}|(\. ){4,})\s*\d+\s*$/.test(l)).length;
  const first = ls.length ? norm(ls[0]).replace(/[^a-z ]/g, '').trim() : '';
  const tocLike = (ls.length >= 5 && dotted / ls.length > 0.4) || /^(muc luc|table of contents|contents)$/.test(first);
  ls = ls.filter(l => !/^(trang\s*)?\d{1,4}(\s*[\/\-]\s*\d{1,4})?$/i.test(l) && !/^([IVXLC]{1,6}|[ivxl]{1,5})$/.test(l));
  let text = '';
  for (const ln of ls) {
    if (text.endsWith('-') && /^[a-zà-ỹ]/.test(ln)) text = text.slice(0, -1) + ln;
    else text += (text && !/[.!?…:]$/.test(text) ? ' ' : '\n') + ln;
  }
  const out = splitSentences(text); out.skipFlag = !!tocLike; return out;
}
async function loadUnit(i) {
  if (A.cache.has(i)) return A.cache.get(i);
  let s = []; try { s = R.type === 'epub' ? await epubUnit(i) : await pdfUnit(i); } catch (e) { console.warn(e); }
  A.cache.set(i, s); if (A.cache.size > 6) A.cache.delete(A.cache.keys().next().value);
  return s;
}
function detectLang() {
  if (A.langSet) return; const sample = A.sents.slice(0, 40).join(' ');
  const m = (sample.match(VI) || []).length; const bl = ((R.b && R.b.lang) || '').slice(0, 2).toLowerCase();
  const l2 = m / Math.max(1, sample.length) > 0.02 ? 'vi' : (bl || 'en');
  A.lang = l2 === 'vi' ? 'vi-VN' : (l2 === 'en' ? 'en-US' : l2); A.langSet = true; fillVoices();
}
const isLang = (v, l2) => v.lang.toLowerCase().replace('_', '-').startsWith(l2);
const voiceScore = v => (/premium|cao cấp/i.test(v.name) ? 3 : 0) + (/enhanced|nâng cao/i.test(v.name) ? 2 : 0) + (/natural/i.test(v.name) ? 1 : 0) + (v.localService ? 0.5 : 0);
function pickVoice() {
  const vs = speechSynthesis.getVoices(); if (!vs.length) return null;
  const l2 = A.lang.slice(0, 2).toLowerCase(), want = S.voices[l2];
  const v = want && vs.find(x => x.voiceURI === want); if (v) return v;
  return vs.filter(x => isLang(x, l2)).sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
}
function cleanForSpeech(t) {
  return t.replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/\[\d{1,3}\]|\(\d{1,3}\)(?=\s|$)/g, ' ')
    .replace(/[*_#~^|<>{}\\=]+/g, ' ')
    .replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\.{3,}/g, '…').replace(/-{2,}|–|—/g, ', ')
    .replace(/\s+/g, ' ').trim();
}
function stopSpeech() { A.gen++; try { speechSynthesis.cancel(); } catch (e) { } }

async function gotoUnit(i, sent = 0, play = A.playing, auto = false) {
  const my = ++A.lgen; stopSpeech(); i = clamp(i, 0, A.count - 1);
  const dir = i >= A.unit ? 1 : -1; let k = i, found = null, fb = null, fbk = i;
  A.busy = true; renderAudio();
  while (k >= 0 && k < A.count) {
    const sn = await loadUnit(k); if (my !== A.lgen) return;
    if (sn.length) { if (!fb) { fb = sn; fbk = k; } if (!(S.skip && sn.skipFlag)) { found = sn; break; } }
    k += dir;
  }
  A.busy = false;
  if (!found && fb && !auto) { found = fb; k = fbk; }
  if (!found) {
    A.playing = false; releaseWake(); renderAudio();
    toast(auto ? 'Đã nghe hết phần chính của sách' : (R.type === 'pdf' ? 'PDF này là ảnh quét, không có lớp chữ nên không nghe được.' : 'Không tìm thấy nội dung chữ để đọc.'), 5000); return;
  }
  A.unit = k; A.sents = found; A.sent = sent < 0 ? Math.max(0, found.length + sent) : Math.min(sent, found.length - 1);
  detectLang(); saveAudio(); renderAudio();
  if (play) { A.playing = true; speakCurrent(); }
}
function speakCurrent() {
  if (!A.playing) return;
  const text = A.sents[A.sent]; if (text == null) { advanceUnit(); return; }
  const my = ++A.gen; try { speechSynthesis.cancel(); } catch (e) { }
  const spoken = cleanForSpeech(text);
  if (!/[\p{L}\p{N}]/u.test(spoken) || (S.skip && /^(trang\s*)?\d{1,4}$/i.test(spoken))) { A.sent++; if (A.sent >= A.sents.length) advanceUnit(); else speakCurrent(); return; }
  const u = new SpeechSynthesisUtterance(spoken); u.rate = S.rate; u.pitch = S.pitch || 1; u.lang = A.lang;
  const v = pickVoice(); if (v) u.voice = v;
  u.onend = () => {
    if (my !== A.gen || !A.playing) return; A.err = 0; A.sent++;
    if (A.sent >= A.sents.length) advanceUnit(); else { saveAudio(); renderAudio(); speakCurrent(); }
  };
  u.onerror = ev => {
    if (my !== A.gen) return; if (ev.error === 'canceled' || ev.error === 'interrupted') return;
    if (++A.err > 4) { A.playing = false; renderAudio(); toast('Không phát được giọng đọc. Kiểm tra nút gạt im lặng, âm lượng và giọng nói trong Cài đặt của iPhone.', 6000); return; }
    A.sent++; speakCurrent();
  };
  A.u = u; setTimeout(() => { if (my === A.gen) speechSynthesis.speak(u); }, 20); renderAudio();
}
function advanceUnit() {
  if (A.unit + 1 >= A.count) { A.playing = false; releaseWake(); renderAudio(); toast('Đã nghe hết sách'); return; }
  gotoUnit(A.unit + 1, 0, true, true);
}
function saveAudio() {
  const b = R.b; if (!b) return; b.audio = { unit: A.unit, sent: A.sent };
  const frac = A.sents.length ? A.sent / A.sents.length : 0;
  const pct = R.type === 'epub' ? (A.unit + frac) / Math.max(1, A.count) : (A.count > 1 ? A.unit / (A.count - 1) : 1);
  b.pos = Object.assign({}, b.pos, { pct: clamp(pct, 0, 1) }); b.lastRead = Date.now(); persistSoon(b);
}
async function wake() { try { if ('wakeLock' in navigator && !A.wl) { A.wl = await navigator.wakeLock.request('screen'); A.wl.addEventListener('release', () => { A.wl = null; }); } } catch (e) { } }
function releaseWake() { try { if (A.wl) A.wl.release(); } catch (e) { } A.wl = null; }
function playAudio() { if (!A.sents.length) return; A.playing = true; wake(); speakCurrent(); }
function pauseAudio() { A.playing = false; stopSpeech(); releaseWake(); saveAudio(); renderAudio(); }
function stopAudioAll() { A.playing = false; stopSpeech(); releaseWake(); clearTimeout(A.timer); }
function skip(n) {
  const s = A.sent + n;
  if (s < 0) { if (A.unit > 0) gotoUnit(A.unit - 1, s, A.playing); else { A.sent = 0; if (A.playing) speakCurrent(); else renderAudio(); } }
  else if (s >= A.sents.length) { if (A.unit + 1 < A.count) gotoUnit(A.unit + 1, s - A.sents.length, A.playing); }
  else { A.sent = s; saveAudio(); if (A.playing) speakCurrent(); else renderAudio(); }
}
async function syncFromReader(play) {
  if (R.type === 'epub') {
    const idx = (R.b.pos && R.b.pos.idx) || 0, frac = readerFraction(), sents = await loadUnit(idx);
    await gotoUnit(idx, Math.round(frac * sents.length), play);
  } else await gotoUnit((R.page || 1) - 1, 0, play);
}
async function jumpReaderToAudio() {
  closeAudio(); toggleChrome(false);
  if (R.type === 'epub') { const it = R.ebook.spine.get(A.unit); if (it) R.rendition.display(it.href).catch(() => { }); }
  else goPage(A.unit + 1);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && A.playing) { try { if (!speechSynthesis.speaking) speakCurrent(); } catch (e) { } wake(); }
});

async function openAudio() {
  if (!speechOK()) { toast('Trình duyệt này chưa hỗ trợ đọc thành tiếng'); return; }
  if (A.bookId !== R.b.id) {
    resetAudio(); A.bookId = R.b.id; A.count = R.type === 'epub' ? (R.ebook.spine.length || R.ebook.spine.items.length) : R.pages;
    buildAudioPanel();
    const sv = R.b.audio;
    if (sv && sv.unit != null) await gotoUnit(sv.unit, sv.sent || 0, false); else await syncFromReader(false);
  } else buildAudioPanel();
}
function closeAudio() { const p = $('#audio'); if (p) p.hidden = true; R.audioOpen = false; }
function fillVoices() {
  const sel = $('#a-voice'); if (!sel || !speechOK()) return;
  const vs = speechSynthesis.getVoices(), l2 = A.lang.slice(0, 2).toLowerCase();
  const mine = vs.filter(v => isLang(v, l2)).sort((a, b) => voiceScore(b) - voiceScore(a));
  const cur = pickVoice();
  const opt = v => `<option value="${esc(v.voiceURI)}" ${cur && cur.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)}</option>`;
  sel.innerHTML = mine.length ? mine.map(opt).join('') : '<option value="">Giọng mặc định của máy</option>';
  const hint = $('#a-hint'); if (hint) hint.hidden = mine.length > 1 || !vs.length;
}
if (speechOK()) speechSynthesis.onvoiceschanged = () => fillVoices();

function buildAudioPanel() {
  let p = $('#audio'); if (!p) { p = document.createElement('div'); p.id = 'audio'; $('#reader').appendChild(p); }
  p.hidden = false; R.audioOpen = true;
  p.innerHTML = `<div class="a-head"><button class="ib" data-a="close" aria-label="Đóng">${icon('down')}</button>
      <div class="a-title"><b id="a-chap"></b><span id="a-book"></span></div>
      <button class="ib" data-a="jump" aria-label="Mở trang đang nghe">${icon('book')}</button></div>
    <div class="a-text" id="a-text"></div>
    <div><input type="range" id="a-seek" min="0" max="0" value="0" aria-label="Vị trí trong chương">
      <div class="a-meta"><span id="a-pos"></span><span id="a-left"></span></div></div>
    <div class="a-ctrl">
      <button class="ib" data-a="pc" aria-label="Chương trước">${icon('prev', 26)}</button>
      <button class="ib" data-a="m10" aria-label="Lùi 10 câu">${icon('rew', 28)}</button>
      <button class="play" data-a="play" id="a-play"></button>
      <button class="ib" data-a="p10" aria-label="Tới 10 câu">${icon('ff', 28)}</button>
      <button class="ib" data-a="nc" aria-label="Chương sau">${icon('next', 26)}</button></div>
    <div class="a-opts">
      <div class="chips" id="a-rate">${[0.75, 1, 1.25, 1.5, 1.75, 2].map(r => `<button data-r="${r}">${r}×</button>`).join('')}</div>
      <div class="chips" id="a-pitch">${[[0.8, 'Trầm'], [0.9, 'Trầm nhẹ'], [1, 'Thường'], [1.1, 'Cao nhẹ'], [1.2, 'Cao']].map(([v, l]) => `<button data-p="${v}">${l}</button>`).join('')}</div>
      <div class="row2"><select id="a-voice" aria-label="Giọng đọc"></select>
      <select id="a-sleep" aria-label="Hẹn giờ tắt"><option value="0">Hẹn giờ tắt</option><option value="15">15 phút</option><option value="30">30 phút</option><option value="45">45 phút</option><option value="60">60 phút</option></select></div>
      <p class="small" id="a-hint" hidden style="margin:8px 0 0">iPhone chỉ cho app dùng các giọng tiếng Việt đã cài trong máy. Muốn thêm giọng hoặc bản tự nhiên hơn: Cài đặt › Trợ năng › Nội dung được đọc › Giọng nói › Tiếng Việt, rồi tải các giọng có chữ “Nâng cao” hoặc “Cao cấp” nếu có. Có thể chỉnh độ Trầm/Cao ở trên để đổi sắc giọng.</p>
      <label class="small" style="display:flex;gap:8px;align-items:center;margin:10px 0 0"><input type="checkbox" id="a-skip"> Tự bỏ qua mục lục, lời cảm ơn, bản quyền và số trang</label>
      <button class="btn wide" data-a="sync">Nghe từ trang đang đọc</button></div>`;
  p.onclick = e => {
    const t = e.target.closest('[data-a],[data-r],[data-p]'); if (!t) return;
    if (t.dataset.p) { S.pitch = +t.dataset.p; saveS(); if (A.playing) speakCurrent(); else renderAudio(); return; }
    if (t.dataset.r) { S.rate = +t.dataset.r; saveS(); if (A.playing) speakCurrent(); else renderAudio(); return; }
    const a = t.dataset.a;
    if (a === 'close') closeAudio();
    else if (a === 'play') { A.playing ? pauseAudio() : playAudio(); }
    else if (a === 'm10') skip(-10); else if (a === 'p10') skip(10);
    else if (a === 'pc') gotoUnit(A.unit - 1, 0, A.playing); else if (a === 'nc') gotoUnit(A.unit + 1, 0, A.playing);
    else if (a === 'sync') syncFromReader(A.playing);
    else if (a === 'jump') jumpReaderToAudio();
  };
  const seek = $('#a-seek', p);
  seek.oninput = () => { $('#a-pos', p).textContent = `Câu ${+seek.value + 1}/${A.sents.length}`; };
  seek.onchange = () => { A.sent = +seek.value; saveAudio(); if (A.playing) speakCurrent(); else renderAudio(); };
  $('#a-skip', p).checked = !!S.skip; $('#a-skip', p).onchange = e => { S.skip = e.target.checked; saveS(); A.cache = new Map(); };
  $('#a-voice', p).onchange = e => { S.voices[A.lang.slice(0, 2).toLowerCase()] = e.target.value; saveS(); if (A.playing) speakCurrent(); };
  $('#a-sleep', p).onchange = e => {
    clearTimeout(A.timer); const m = +e.target.value;
    if (m) { A.timer = setTimeout(() => { pauseAudio(); toast('Đã hết giờ hẹn, tạm dừng đọc'); }, m * 60000); toast(`Sẽ tự dừng sau ${m} phút`); }
  };
  fillVoices(); renderAudio();
}
function renderAudio() {
  const p = $('#audio'); if (!p || p.hidden) return;
  $('#a-play', p).innerHTML = icon(A.playing ? 'pause' : 'play', 32);
  $('#a-play', p).setAttribute('aria-label', A.playing ? 'Tạm dừng' : 'Phát');
  $('#a-book', p).textContent = R.b ? R.b.title : '';
  $('#a-chap', p).textContent = R.type === 'epub' ? (chapterFor(A.unit) || `Phần ${A.unit + 1}/${A.count}`) : `Trang ${A.unit + 1}/${A.count}`;
  $$('#a-rate button', p).forEach(b => b.classList.toggle('on', +b.dataset.r === S.rate));
  $$('#a-pitch button', p).forEach(b => b.classList.toggle('on', +b.dataset.p === (S.pitch || 1)));
  const box = $('#a-text', p);
  if (A.busy && !A.sents.length) { box.innerHTML = '<p class="none">Đang chuẩn bị nội dung…</p>'; return; }
  if (!A.sents.length) { box.innerHTML = '<p class="none">Chưa có nội dung để đọc.</p>'; return; }
  const from = Math.max(0, A.sent - 3), to = Math.min(A.sents.length, A.sent + 7);
  let h = ''; for (let i = from; i < to; i++) h += `<p class="${i === A.sent ? 'cur' : ''}">${esc(A.sents[i])}</p>`;
  box.innerHTML = h;
  const cur = box.querySelector('.cur'); if (cur) box.scrollTop = Math.max(0, cur.offsetTop - box.clientHeight / 3);
  const seek = $('#a-seek', p); seek.max = Math.max(0, A.sents.length - 1); seek.value = A.sent;
  $('#a-pos', p).textContent = `Câu ${A.sent + 1}/${A.sents.length}`;
  let chars = 0; for (let i = A.sent; i < A.sents.length; i++) chars += A.sents[i].length;
  const mins = Math.max(1, Math.round(chars / (14 * S.rate) / 60));
  $('#a-left', p).textContent = `còn khoảng ${mins} phút trong phần này`;
}

/* =====================================================================
   KHỞI ĐỘNG
   ===================================================================== */
async function init() {
  applyTheme(); fillIcons();
  bindTouch($('#tap-layer'), x => x);
  $('#r-foot').addEventListener('click', () => toggleChrome());
  bindSelbar();
  try { await DB.open(); }
  catch (e) { $('#shelf-view').innerHTML = '<p style="padding:40px 20px;font:16px/1.6 var(--ui)">Không mở được kho lưu trữ của trình duyệt. Hãy thoát chế độ riêng tư rồi mở lại.</p>'; return; }
  st.books = await DB.all('books');
  try { st.shelves = JSON.parse(localStorage.getItem('tp_shelves') || 'null') || []; } catch (e) { st.shelves = []; }
  if (!st.shelves.find(s => s.id === INBOX)) st.shelves.push({ id: INBOX, name: 'Chưa phân loại', fixed: true });
  st.books.forEach(b => { if (!st.shelves.find(s => s.id === b.shelf)) b.shelf = INBOX; });
  saveShelves(); renderShelf();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
  }
}
init();
