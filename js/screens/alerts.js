import { db } from '../db.js';
import { loadAll, back } from '../app.js';
import { icon, esc, num, locText, stockState, natCompare, toast } from '../ui.js';

export async function alertsScreen() {
  const { products, furById } = await loadAll();
  const storeName = await db.getSetting('storeName', 'Mi Almacén');
  let list = new Set(await db.getSetting('shoppingList', []));
  const needing = products.filter((p) => stockState(p) !== 'ok')
    .sort((a, b) => (a.stock || 0) - (b.stock || 0) || natCompare(a.name, b.name));
  const out = needing.filter((p) => stockState(p) === 'out').length;
  const low = needing.length - out;
  // limpia de la lista los productos que ya no existen
  const ids = new Set(products.map((p) => p.id));
  list = new Set([...list].filter((id) => ids.has(id)));

  const html = `
    <div class="top"><a class="icon-btn" href="#/" data-back aria-label="Volver">${icon('back', 26, 2.2)}</a><h1>Avisos de stock</h1></div>
    <div class="grid2">
      <div class="infobox" style="background:var(--red-bg)"><span class="v" style="font-size:1.8rem;color:var(--red)">${out}</span><span class="k" style="color:var(--red);font-weight:800;font-size:.95rem">Agotados</span></div>
      <div class="infobox" style="background:var(--amber-bg)"><span class="v" style="font-size:1.8rem;color:var(--amber)">${low}</span><span class="k" style="color:var(--amber);font-weight:800;font-size:.95rem">Por acabarse</span></div>
    </div>
    ${needing.length ? `<div class="gap8" data-items>${needing.map((p) => {
      const isOut = stockState(p) === 'out';
      return `<div class="card hstack" style="padding:12px 14px;gap:12px">
        <span style="width:8px;align-self:stretch;border-radius:4px;background:${isOut ? '#F04438' : '#F59E0B'}"></span>
        <a class="grow" href="#/producto/${p.id}" style="min-width:0;text-decoration:none;color:inherit;display:flex;flex-direction:column">
          <span style="font-weight:800">${esc(p.name)}</span>
          <span class="hint" style="font-weight:700">${esc(locText(p, furById))} · aviso con ${num(p.minStock)}</span>
          <span style="font-weight:900;font-size:.9rem;color:${isOut ? 'var(--red)' : 'var(--amber)'}">${isOut ? 'Agotado' : `Quedan ${num(p.stock)}`}</span>
        </a>
        <button type="button" class="chip" data-toggle="${p.id}" style="min-height:44px"></button>
      </div>`;
    }).join('')}</div>` : `<div class="empty"><div class="big-ico">${icon('check', 34, 2.6)}</div><h3>Todo con stock</h3><p>Cuando algo llegue a su mínimo aparecerá aquí.</p></div>`}

    <div class="sticky-bottom" ${needing.length || list.size ? '' : 'hidden'}>
      <span class="hint center" style="font-weight:800" data-count></span>
      <button type="button" class="btn btn-big btn-primary btn-block" data-share>${icon('share', 24, 2.2)} Enviar lista de compras</button>
    </div>
  `;

  async function mount(el) {
    const b = el.querySelector('[data-back]');
    b.addEventListener('click', (e) => { e.preventDefault(); back('/'); });
    const paint = () => {
      el.querySelectorAll('[data-toggle]').forEach((btn) => {
        const on = list.has(btn.dataset.toggle);
        btn.classList.toggle('on-primary', on);
        btn.innerHTML = on ? `${icon('check', 16, 3)} En lista` : `${icon('plus', 16, 3)} A la lista`;
      });
      const c = el.querySelector('[data-count]');
      if (c) c.textContent = `${list.size} ${list.size === 1 ? 'producto' : 'productos'} en tu lista de compras`;
    };
    el.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.dataset.toggle;
      list.has(id) ? list.delete(id) : list.add(id);
      await db.setSetting('shoppingList', [...list]);
      paint();
    }));
    const share = el.querySelector('[data-share]');
    if (share) share.addEventListener('click', async () => {
      const chosen = products.filter((p) => list.has(p.id));
      const items = chosen.length ? chosen : needing;
      if (!items.length) { toast('La lista está vacía', { icon: 'alert' }); return; }
      const text = `Lista de compras · ${storeName}\n\n` + items.map((p) => `• ${p.name} (quedan ${p.stock || 0})`).join('\n');
      if (navigator.share) {
        try { await navigator.share({ title: 'Lista de compras', text }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    });
    paint();
  }
  return { html, mount };
}
