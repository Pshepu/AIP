import { db, undoMovement } from '../db.js';
import { loadAll, back, render } from '../app.js';
import { icon, esc, money, num, todayKey, fmtTime, confirmDialog, toast } from '../ui.js';

const DAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
let period = 'semana';

export async function reportsScreen({ query }) {
  if (query.p) period = query.p;
  const { products } = await loadAll();
  const sales = (await db.all('movements')).filter((m) => m.type === 'venta');

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nDays = period === 'hoy' ? 1 : period === 'semana' ? 7 : 30;
  start.setDate(start.getDate() - (nDays - 1));
  const inRange = sales.filter((m) => new Date(m.date) >= start);

  const total = inRange.reduce((s, m) => s + m.qty * m.price, 0);
  const gain = inRange.reduce((s, m) => s + m.qty * (m.price - m.cost), 0);
  const units = inRange.reduce((s, m) => s + m.qty, 0);

  // ventas por día
  const days = [];
  for (let i = 0; i < nDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ key: todayKey(d), date: d, total: 0 });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  inRange.forEach((m) => { const d = byKey[todayKey(m.date)]; if (d) d.total += m.qty * m.price; });
  const max = Math.max(1, ...days.map((d) => d.total));
  const best = days.reduce((a, b) => (b.total > a.total ? b : a), days[0]);

  // lo más vendido
  const top = {};
  inRange.forEach((m) => { (top[m.productId] ||= { name: m.productName, q: 0, t: 0 }); top[m.productId].q += m.qty; top[m.productId].t += m.qty * m.price; });
  const topList = Object.values(top).sort((a, b) => b.q - a.q).slice(0, 5);

  const stockCost = products.reduce((s, p) => s + (p.stock || 0) * (p.cost || 0), 0);
  const stockSale = products.reduce((s, p) => s + (p.stock || 0) * (p.price || 0), 0);

  const label = { hoy: 'Vendiste hoy', semana: 'Vendiste en 7 días', mes: 'Vendiste en 30 días' }[period];
  const kShort = (v) => (v >= 1000000 ? (v / 1000000).toFixed(1).replace('.', ',') + 'M' : v >= 1000 ? Math.round(v / 1000) + 'k' : v ? String(v) : '');

  const chart = period === 'hoy' ? '' : `
    <div class="bars" role="img" aria-label="Ventas por día">
      ${days.map((d) => `<div class="b">
        ${period === 'semana' ? `<span class="k">${kShort(d.total)}</span>` : ''}
        <div class="bar ${d.total === max && d.total > 0 ? 'max' : ''}" style="height:${Math.round((d.total / max) * 82)}%"></div>
        <span class="d">${period === 'semana' ? DAY[d.date.getDay()] : (d.date.getDate() % 5 === 1 ? d.date.getDate() : '')}</span>
      </div>`).join('')}
    </div>`;

  const todaySales = period === 'hoy' ? inRange.sort((a, b) => (a.date < b.date ? 1 : -1)) : [];

  const html = `
    <div class="top"><a class="icon-btn" href="#/" data-back aria-label="Volver">${icon('back', 26, 2.2)}</a><h1>Ventas y ganancias</h1></div>
    <div class="seg" role="tablist">
      ${[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']].map(([k, l]) => `<button type="button" class="${period === k ? 'on' : ''}" data-p="${k}" role="tab" aria-selected="${period === k}">${l}</button>`).join('')}
    </div>
    <div class="chart-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap">
        <div><div class="lbl">${label}</div><div class="big">${money(total)}</div></div>
        <div style="text-align:right"><div class="lbl">Ganaste</div><div class="gain">${money(gain)}</div></div>
      </div>
      ${chart}
    </div>
    <div class="grid2">
      <div class="infobox" style="background:var(--surface);box-shadow:var(--shadow)"><span class="k">Unidades vendidas</span><span class="v">${num(units)}</span></div>
      <div class="infobox" style="background:var(--surface);box-shadow:var(--shadow)"><span class="k">${period === 'hoy' ? 'Ventas hechas' : 'Mejor día'}</span><span class="v">${period === 'hoy' ? num(inRange.length) : best.total ? DAY_LONG[best.date.getDay()] + (period === 'mes' ? ' ' + best.date.getDate() : '') : '—'}</span></div>
    </div>

    ${period === 'hoy' ? `
      <div class="section-title"><h2>Ventas de hoy</h2></div>
      ${todaySales.length ? `<div class="list">${todaySales.map((m) => `
        <div class="row compact">
          <span class="main"><span class="name">${esc(m.productName)}</span><span class="meta">${fmtTime(m.date)} · ${m.qty} × ${money(m.price)}</span></span>
          <span style="font-weight:900">${money(m.qty * m.price)}</span>
          <button type="button" class="icon-btn" style="width:44px;height:44px;box-shadow:none;background:var(--bg)" data-undo="${m.id}" aria-label="Anular venta">${icon('x', 20, 2.4)}</button>
        </div>`).join('')}</div>` : '<p class="hint">Aún no hay ventas hoy.</p>'}
    ` : `
      <div class="card gap8">
        <span style="font-size:1.05rem;font-weight:900">Lo más vendido</span>
        ${topList.length ? topList.map((t, i) => `
          <div class="hstack" style="min-height:44px;border-top:1px solid var(--line)">
            <span class="badge info" style="min-width:30px;border-radius:50%">${i + 1}</span>
            <span class="grow" style="font-weight:700">${esc(t.name)}</span>
            <span style="font-weight:900">${num(t.q)} u.</span>
          </div>`).join('') : '<p class="hint">Aún no hay ventas en este período.</p>'}
      </div>`}

    <div class="banner info" style="background:var(--blue-bg);color:var(--blue)">
      ${icon('box', 26)}
      <span class="grow"><b>Tu mercadería vale ${money(stockCost)}</b>A precio de costo. Si vendes todo: ${money(stockSale)}.</span>
    </div>
  `;

  function mount(el) {
    el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); back('/'); });
    el.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.p; render(); }));
    el.querySelectorAll('[data-undo]').forEach((b) => b.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '¿Anular esta venta?', text: 'Se borra la venta y el producto vuelve al stock.', ok: 'Sí, anular', danger: true });
      if (!ok) return;
      await undoMovement(b.dataset.undo);
      toast('Venta anulada', { icon: 'history' });
      render();
    }));
  }
  return { html, mount };
}
