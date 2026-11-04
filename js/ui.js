// Utilidades de interfaz: íconos, formato, avisos y ventanas.

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13.5 8v8M17 8v8"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  coins: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="M17 3l4 4L8 20H4v-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 21h14"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h8M12 11v8"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>',
  text: '<path d="M4 7V5h16v2M9 20h6M12 5v15"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0"/><path d="M10 20v-5h4v5"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5z"/><path d="m2 13 10 5 10-5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  // íconos de categoría
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  cup: '<path d="M7 3h10l-1.5 17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z"/><path d="M6.5 8h11"/>',
  sparkles: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  pencil: '<path d="M17 3l4 4L8 20H4v-4z"/><path d="M14 6l4 4"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8S10.5 3 8 4s0 4 4 4zm0 0s1.5-5 4-4 0 4-4 4z"/>',
  cookie: '<circle cx="12" cy="12" r="9"/><path d="M9 9h.01M14 8h.01M15 13h.01M10 14h.01M12 11h.01"/>',
  bread: '<path d="M5 11a4 4 0 0 1 0-8h14a4 4 0 0 1 0 8v9H5z"/>',
  bottle: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  toy: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  shirt: '<path d="M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  heart: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>',
  paw: '<circle cx="5" cy="10" r="2"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="19" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5S8 22 12 20s6 1.5 6-1.5S15 12 12 12z"/>',
};

export const CATEGORY_ICONS = ['bag', 'cup', 'bottle', 'bread', 'cookie', 'sparkles', 'pencil', 'gift', 'toy', 'tool', 'bulb', 'shirt', 'heart', 'paw', 'box'];

export const COLORS = {
  blue: ['#E0F2FE', '#0369A1'],
  orange: ['#FFEDD5', '#C2410C'],
  purple: ['#EDE9FE', '#6D28D9'],
  pink: ['#FCE7F3', '#BE185D'],
  green: ['#DCFCE7', '#15803D'],
  amber: ['#FEF3C7', '#B45309'],
  teal: ['#DDF1EC', '#0F7B6C'],
  red: ['#FEE4E2', '#B42318'],
  gray: ['#E9EEEC', '#3F4F4B'],
};

export function icon(name, size = 24, stroke = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.box}</svg>`;
}

export function catBox(cat, cls = '', size = 22) {
  const [bg, fg] = COLORS[cat?.color] || COLORS.gray;
  return `<span class="ico-box ${cls}" style="background:${bg};color:${fg}">${icon(cat?.icon || 'box', size)}</span>`;
}

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function num(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
export function money(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? '-$' : '$') + num(Math.abs(v));
}
// "$1.350" -> 1350
export function parseMoney(s) {
  const d = String(s ?? '').replace(/[^\d]/g, '');
  return d ? parseInt(d, 10) : 0;
}
export function parseIntSafe(s, def = 0) {
  const d = String(s ?? '').replace(/[^\d]/g, '');
  return d ? parseInt(d, 10) : def;
}

// Orden natural: A2 antes que A10.
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
export const natCompare = (a, b) => collator.compare(a, b);

export function normalize(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function stockState(p) {
  const s = p.stock || 0;
  if (s <= 0) return 'out';
  if ((p.minStock || 0) > 0 && s <= p.minStock) return 'low';
  return 'ok';
}
export function stockBadge(p) {
  const st = stockState(p);
  if (st === 'out') return '<span class="badge out">Agotado</span>';
  if (st === 'low') return `<span class="badge low">Quedan ${num(p.stock)}</span>`;
  return `<span class="badge ok">${num(p.stock)}</span>`;
}

export function locText(p, furnitureById, long = false) {
  const f = p.furnitureId ? furnitureById[p.furnitureId] : null;
  if (!f) return 'Sin ubicación';
  if (long) return `Mueble ${f.code}` + (p.shelf ? ` · Repisa ${p.shelf}` : '');
  return f.code + (p.shelf ? ` · Repisa ${p.shelf}` : '');
}

export function fmtDate(iso, withTime = true) {
  const d = new Date(iso);
  const opts = { day: 'numeric', month: 'short' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('es-CL', opts);
}
export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/* ---------- Toast ---------- */
let toastTimer;
export function toast(msg, opts = {}) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.innerHTML = `${icon(opts.icon || 'check', 22, 2.6)}<span class="grow">${esc(msg)}</span>${opts.action ? `<button type="button">${esc(opts.action)}</button>` : ''}`;
  el.hidden = false;
  if (opts.action) {
    el.querySelector('button').onclick = () => { el.hidden = true; opts.onAction && opts.onAction(); };
  }
  toastTimer = setTimeout(() => { el.hidden = true; }, opts.duration || (opts.action ? 6000 : 2600));
}

/* ---------- Modal ---------- */
// onDismiss se llama si la persona cierra sin elegir (toca afuera o "Cancelar").
export function openModal(html, onMount, onDismiss) {
  const root = document.getElementById('modal-root');
  const back = document.createElement('div');
  back.className = 'backdrop';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(back);
  const close = () => { back.remove(); };
  const dismiss = () => { close(); onDismiss && onDismiss(); };
  back.addEventListener('click', (e) => { if (e.target === back) dismiss(); });
  back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', dismiss));
  const first = back.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 60);
  onMount && onMount(back.querySelector('.modal'), close);
  return close;
}
export function closeAllModals() {
  document.getElementById('modal-root').innerHTML = '';
}

export function confirmDialog({ title, text = '', ok = 'Sí', cancel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    openModal(`
      <h2>${esc(title)}</h2>
      ${text ? `<p>${text}</p>` : ''}
      <button type="button" class="btn btn-big btn-block ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button>
      <button type="button" class="btn btn-ghost btn-block" data-close>${esc(cancel)}</button>
    `, (m, closeFn) => {
      m.querySelector('[data-ok]').onclick = () => { closeFn(); resolve(true); };
    }, () => resolve(false));
  });
}

export function promptText({ title, label, value = '', placeholder = '', ok = 'Guardar', inputmode = 'text' }) {
  return new Promise((resolve) => {
    openModal(`
      <h2>${esc(title)}</h2>
      <label class="field"><span>${esc(label)}</span>
        <input class="input" type="text" inputmode="${inputmode}" value="${esc(value)}" placeholder="${esc(placeholder)}" data-in>
      </label>
      <button type="button" class="btn btn-big btn-primary btn-block" data-ok>${esc(ok)}</button>
      <button type="button" class="btn btn-ghost btn-block" data-close>Cancelar</button>
    `, (m, close) => {
      const inp = m.querySelector('[data-in]');
      const done = () => { const v = inp.value.trim(); close(); resolve(v || null); };
      m.querySelector('[data-ok]').onclick = done;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
    }, () => resolve(null));
  });
}

export function feedback() {
  try { navigator.vibrate && navigator.vibrate(80); } catch (_) {}
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = feedback.ctx || (feedback.ctx = new Ctx());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 1200;
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.13);
  } catch (_) {}
}

export function todayKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
