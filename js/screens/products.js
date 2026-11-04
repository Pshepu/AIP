import { db, uid, recordMovement, undoMovement } from '../db.js';
import { loadAll, go, back } from '../app.js';
import {
  icon, esc, money, num, catBox, stockBadge, stockState, locText, normalize, natCompare,
  parseMoney, parseIntSafe, toast, confirmDialog, promptText, openModal, fmtDate, COLORS,
} from '../ui.js';
import { openScannerOverlay } from './scan.js';

const backBtn = (href) => `<a class="icon-btn" href="${href}" data-back aria-label="Volver">${icon('back', 26, 2.2)}</a>`;
function wireBack(el, fallback) {
  const b = el.querySelector('[data-back]');
  if (b) b.addEventListener('click', (e) => { e.preventDefault(); back(fallback); });
}

/* ================= Lista de productos ================= */
export async function productsScreen({ query }) {
  const data = await loadAll();
  const { products, categories, catById, furById } = data;
  const state = { q: query.q || '', cat: query.cat || 'all', low: query.filtro === 'bajo' };

  const html = `
    <div class="top"><h1>Productos</h1><span class="sub">${num(products.length)} en total</span></div>
    <div class="search">
      <label>${icon('search', 22, 2.2)}<input type="search" placeholder="Buscar por nombre o código" aria-label="Buscar producto" value="${esc(state.q)}" data-q></label>
      <a class="icon-btn" href="#/escanear" style="background:var(--primary);color:#fff" aria-label="Buscar escaneando">${icon('scan', 26, 2.2)}</a>
    </div>
    <div class="chips" data-chips>
      <button type="button" class="chip" data-low>${icon('alert', 16, 2.4)} Bajo stock</button>
      <button type="button" class="chip" data-cat="all">Todos</button>
      ${categories.map((c) => `<button type="button" class="chip" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
    </div>
    <div data-list></div>
    <a class="fab" href="#/producto/nuevo">${icon('plus', 22, 3)} Agregar</a>
  `;

  function mount(el) {
    const listEl = el.querySelector('[data-list]');
    const paint = () => {
      el.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('on', b.dataset.cat === state.cat));
      el.querySelector('[data-low]').classList.toggle('on', state.low);
      const q = normalize(state.q);
      let list = products.filter((p) => (state.cat === 'all' || p.categoryId === state.cat)
        && (!state.low || stockState(p) !== 'ok')
        && (!q || normalize(p.name).includes(q) || String(p.barcode || '').includes(q)));
      list.sort((a, b) => natCompare(a.name, b.name));
      if (!products.length) {
        listEl.innerHTML = `<div class="empty"><div class="big-ico">${icon('box', 34)}</div><h3>Aún no tienes productos</h3><p>Escanea un producto o toca "Agregar".</p><a class="btn btn-primary" href="#/escanear">${icon('scan', 22)} Escanear</a></div>`;
        return;
      }
      if (!list.length) {
        listEl.innerHTML = `<div class="empty"><h3>No hay resultados</h3><p>Prueba con otra palabra o categoría.</p></div>`;
        return;
      }
      const shown = list.slice(0, 300);
      listEl.innerHTML = `<div class="list">${shown.map((p) => `
        <a class="row" href="#/producto/${p.id}">
          ${catBox(catById[p.categoryId], '', 22)}
          <span class="main"><span class="name">${esc(p.name)}</span><span class="meta">${esc(locText(p, furById))} · ${money(p.price)}</span></span>
          ${stockBadge(p)}
        </a>`).join('')}</div>
        ${list.length > shown.length ? `<p class="hint center">Mostrando ${shown.length} de ${list.length}. Escribe para buscar.</p>` : ''}`;
    };
    el.querySelector('[data-q]').addEventListener('input', (e) => { state.q = e.target.value; paint(); });
    el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; paint(); }));
    el.querySelector('[data-low]').addEventListener('click', () => { state.low = !state.low; paint(); });
    paint();
  }
  return { html, mount };
}

/* ================= Detalle ================= */
const MOV = {
  venta: ['Venta', 'cart', 'var(--green-bg)', 'var(--green)'],
  entrada: ['Llegó mercadería', 'plus', 'var(--primary-soft)', 'var(--primary)'],
  ajuste: ['Ajuste de stock', 'edit', 'var(--amber-bg)', 'var(--amber)'],
};

export async function productDetailScreen({ params }) {
  const { catById, furById } = await loadAll();
  const p = await db.get('products', params.id);
  if (!p) return { html: `<div class="empty"><h3>Producto no encontrado</h3><a class="btn btn-primary" href="#/productos">Ver productos</a></div>` };
  const movs = (await db.byIndex('movements', 'productId', p.id)).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 15);
  const cat = catById[p.categoryId];
  const gain = (p.price || 0) - (p.cost || 0);
  const st = stockState(p);

  const html = `
    <div class="top">${backBtn('#/productos')}<h1>Producto</h1>
      <a class="icon-btn" href="#/producto/${p.id}/editar" aria-label="Editar">${icon('edit', 24)}</a></div>
    <div class="card hstack" style="gap:14px">
      ${catBox(cat, 'lg', 30)}
      <div class="grow" style="min-width:0">
        <div style="font-size:1.3rem;font-weight:900;line-height:1.2">${esc(p.name)}</div>
        <div class="muted" style="font-weight:700;font-size:.9rem">${esc(cat?.name || 'Sin categoría')}${p.barcode ? ` · ${esc(p.barcode)}` : ''}</div>
      </div>
    </div>
    <div class="grid2">
      <a class="infobox" href="${p.furnitureId ? `#/mueble/${p.furnitureId}` : `#/producto/${p.id}/editar`}" style="text-decoration:none;color:inherit;background:var(--surface);box-shadow:var(--shadow)">
        <span class="k">Está en</span>
        <span class="v" style="color:var(--primary)">${icon('pin', 20, 2.4)} ${esc(locText(p, furById))}</span>
      </a>
      <div class="infobox" style="background:${st === 'out' ? 'var(--red-bg)' : st === 'low' ? 'var(--amber-bg)' : 'var(--surface)'};box-shadow:var(--shadow)">
        <span class="k">Quedan</span>
        <span class="v" style="color:${st === 'out' ? 'var(--red)' : st === 'low' ? 'var(--amber)' : 'inherit'}">${num(p.stock)} ${p.stock === 1 ? 'unidad' : 'unidades'}</span>
      </div>
      <div class="infobox" style="background:var(--surface);box-shadow:var(--shadow)"><span class="k">Lo vendo a</span><span class="v">${money(p.price)}</span></div>
      <div class="infobox" style="background:var(--surface);box-shadow:var(--shadow)"><span class="k">Me costó</span><span class="v">${money(p.cost)}</span></div>
    </div>
    <div class="hint ${gain > 0 ? 'good' : gain < 0 ? 'bad' : ''}" style="margin-top:-6px">
      ${gain > 0 ? `Ganas ${money(gain)} por unidad` : gain < 0 ? `Ojo: lo vendes más barato de lo que costó` : 'Pon el costo y el precio para calcular la ganancia'} · Aviso cuando queden ${num(p.minStock)}
    </div>
    <a class="btn btn-big btn-primary btn-block" href="#/vender/${p.id}">${icon('cart', 24, 2.2)} Vender</a>
    <div class="btn-row">
      <a class="btn btn-soft" href="#/sumar/${p.id}">${icon('plus', 20, 2.8)} Sumar stock</a>
      <a class="btn" href="#/producto/${p.id}/editar" style="box-shadow:var(--shadow)">${icon('edit', 20, 2.2)} Editar</a>
    </div>

    <div class="section-title"><h2>Historial</h2></div>
    ${movs.length ? `<div class="list">${movs.map((m) => {
      const [label, ic, bg, fg] = MOV[m.type] || MOV.ajuste;
      const amount = m.type === 'venta' ? money(m.qty * m.price) : '';
      const q = m.type === 'venta' ? `-${m.qty}` : m.qty > 0 ? `+${m.qty}` : `${m.qty}`;
      return `<div class="row compact">
        <span class="ico-box" style="background:${bg};color:${fg}">${icon(ic, 20, 2.4)}</span>
        <span class="main"><span class="name">${label} · ${q} u.</span><span class="meta">${fmtDate(m.date)} · quedó en ${m.stockAfter}</span></span>
        <span style="font-weight:900">${amount}</span>
      </div>`;
    }).join('')}</div>` : `<p class="hint">Todavía no hay movimientos.</p>`}

    <button type="button" class="btn btn-ghost" data-del style="color:var(--red)">${icon('trash', 20)} Borrar producto</button>
  `;

  function mount(el) {
    wireBack(el, '/productos');
    el.querySelector('[data-del]').addEventListener('click', async () => {
      const ok = await confirmDialog({ title: `¿Borrar "${p.name}"?`, text: 'Se quita de tu inventario. Las ventas ya hechas siguen en tus reportes.', ok: 'Sí, borrar', danger: true });
      if (!ok) return;
      await db.del('products', p.id);
      toast('Producto borrado');
      go('/productos', { replace: true });
    });
  }
  return { html, mount };
}

/* ================= Crear / editar ================= */
export async function productFormScreen({ params, query }) {
  const data = await loadAll();
  const editing = !!params.id;
  const orig = editing ? await db.get('products', params.id) : null;
  if (editing && !orig) return { html: `<div class="empty"><h3>Producto no encontrado</h3></div>` };

  const f = orig ? { ...orig } : {
    barcode: query.codigo || '', name: '', categoryId: query.cat || null, furnitureId: query.mueble || null,
    shelf: query.repisa ? parseInt(query.repisa, 10) : null, cost: 0, price: 0, stock: 0, minStock: 3,
  };
  if (!editing && f.furnitureId && !data.furById[f.furnitureId]) f.furnitureId = null;

  const html = `
    <div class="top">${backBtn('#/productos')}<h1>${editing ? 'Editar producto' : 'Nuevo producto'}</h1></div>

    <div class="field">
      <span>Código de barra</span>
      <div class="input-wrap">
        <input class="input" type="text" inputmode="numeric" placeholder="Escanea o escribe el código" value="${esc(f.barcode)}" data-barcode aria-label="Código de barra">
        <button type="button" class="icon-btn" style="background:var(--primary);color:#fff" data-scan aria-label="Escanear código">${icon('scan', 24, 2.2)}</button>
      </div>
      <button type="button" class="btn btn-ghost" data-gen style="align-self:flex-start;min-height:40px;padding:0 4px">${icon('qr', 18)} No tiene código: crear uno</button>
      <span class="hint bad" data-dup hidden></span>
    </div>

    <label class="field"><span>Nombre del producto</span>
      <input class="input" type="text" placeholder="Ej: Bebida cola 1,5 L" value="${esc(f.name)}" data-name autocomplete="off">
    </label>

    <div class="field"><span>Categoría</span><div class="chips" data-cats></div></div>

    <div class="form-card" data-loc></div>

    <div class="grid2">
      <label class="field"><span>Me costó</span><input class="input" type="text" inputmode="numeric" value="${f.cost ? money(f.cost) : ''}" placeholder="$0" data-cost></label>
      <label class="field"><span>Lo vendo a</span><input class="input" type="text" inputmode="numeric" value="${f.price ? money(f.price) : ''}" placeholder="$0" data-price></label>
    </div>
    <span class="hint" data-gain style="margin-top:-8px"></span>

    <div class="grid2">
      <label class="field"><span>${editing ? 'Stock actual' : 'Tengo ahora'}</span><input class="input" type="text" inputmode="numeric" value="${f.stock}" data-stock></label>
      <label class="field"><span style="color:var(--amber)">Avisarme si quedan</span><input class="input warn" type="text" inputmode="numeric" value="${f.minStock}" data-min></label>
    </div>

    <div class="sticky-bottom">
      <button type="button" class="btn btn-big btn-primary btn-block" data-save>${icon('check', 24, 3)} Guardar producto</button>
    </div>
  `;

  function mount(el) {
    wireBack(el, editing ? `/producto/${params.id}` : '/productos');
    const $ = (s) => el.querySelector(s);
    const inBarcode = $('[data-barcode]');
    const dupEl = $('[data-dup]');

    const checkDup = () => {
      const code = inBarcode.value.trim();
      const other = code && data.products.find((p) => p.barcode === code && p.id !== f.id);
      dupEl.hidden = !other;
      if (other) dupEl.innerHTML = `Este código ya es de "${esc(other.name)}". <a href="#/producto/${other.id}">Ver producto</a>`;
      return other;
    };
    inBarcode.addEventListener('input', checkDup);
    checkDup();
    $('[data-scan]').addEventListener('click', () => {
      openScannerOverlay((code) => { inBarcode.value = code; checkDup(); });
    });
    $('[data-gen]').addEventListener('click', () => {
      let code;
      do { code = 'AIP' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0'); }
      while (data.products.some((p) => p.barcode === code));
      inBarcode.value = code;
      checkDup();
      toast('Código creado. Puedes imprimir su etiqueta en Más → Etiquetas');
    });

    // Categorías
    const catsEl = $('[data-cats]');
    const paintCats = () => {
      catsEl.innerHTML = data.categories.map((c) => `<button type="button" class="chip ${f.categoryId === c.id ? 'on-primary' : ''}" data-c="${c.id}">${f.categoryId === c.id ? icon('check', 16, 3) : ''}${esc(c.name)}</button>`).join('')
        + `<button type="button" class="chip dashed" data-newcat>${icon('plus', 16, 3)} Nueva</button>`;
      catsEl.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { f.categoryId = f.categoryId === b.dataset.c ? null : b.dataset.c; paintCats(); }));
      catsEl.querySelector('[data-newcat]').addEventListener('click', async () => {
        const name = await promptText({ title: 'Nueva categoría', label: 'Nombre', placeholder: 'Ej: Juguetes' });
        if (!name) return;
        const colors = Object.keys(COLORS);
        const c = { id: uid(), name, color: colors[data.categories.length % colors.length], icon: 'box', order: data.categories.length };
        await db.put('categories', c);
        data.categories.push(c);
        data.catById[c.id] = c;
        f.categoryId = c.id;
        paintCats();
      });
      const on = catsEl.querySelector('.on-primary');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    paintCats();

    // Ubicación: muebles creados por la persona + repisas
    const locEl = $('[data-loc]');
    const paintLoc = () => {
      const furniture = [...data.furniture].sort((a, b) => natCompare(a.code, b.code));
      const sel = f.furnitureId ? data.furById[f.furnitureId] : null;
      if (sel && f.shelf && f.shelf > sel.shelves) f.shelf = null;
      const pill = sel ? `Queda en ${esc(sel.code)}${f.shelf ? ` · Repisa ${f.shelf}` : ''}` : 'Sin ubicación';
      if (!furniture.length) {
        locEl.innerHTML = `
          <div class="head"><span class="flabel">¿Dónde lo guardas?</span></div>
          <p class="hint">Aún no has creado muebles. Crea uno para poder decir dónde está cada producto.</p>
          <button type="button" class="btn btn-soft" data-quickfur>${icon('plus', 20, 2.8)} Crear mueble</button>`;
      } else {
        locEl.innerHTML = `
          <div class="head"><span class="flabel">¿Dónde lo guardas?</span><span class="pill-loc">${icon('pin', 16, 2.6)} ${pill}</span></div>
          ${furniture.length > 15 ? `<input class="input" type="search" placeholder="Buscar mueble (ej: C1)" data-fsearch style="min-height:46px">` : ''}
          <span class="hint" style="font-weight:800">Mueble</span>
          <div class="cells ${furniture.length > 15 ? 'scroll' : ''}" data-fcells>
            ${furniture.map((x) => `<button type="button" class="cell ${x.id === f.furnitureId ? 'on' : ''}" data-f="${x.id}" data-code="${esc(normalize(x.code))}">${esc(x.code)}</button>`).join('')}
            <button type="button" class="cell" data-quickfur aria-label="Crear mueble" style="color:var(--primary);border-style:dashed">${icon('plus', 20, 2.8)}</button>
          </div>
          ${sel ? `
            <span class="hint" style="font-weight:800">Repisa de ${esc(sel.code)} (1 = la de más arriba)</span>
            <div class="cells">
              ${Array.from({ length: sel.shelves }, (_, i) => i + 1).map((n) => `<button type="button" class="cell ${f.shelf === n ? 'on' : ''}" data-s="${n}">${n}</button>`).join('')}
            </div>` : ''}
          ${sel ? `<button type="button" class="btn btn-ghost" data-clearloc style="min-height:40px;align-self:flex-start;padding:0 4px">Quitar ubicación</button>` : ''}`;
      }
      locEl.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
        if (f.furnitureId !== b.dataset.f) { f.furnitureId = b.dataset.f; f.shelf = data.furById[b.dataset.f].shelves === 1 ? 1 : null; }
        paintLoc();
      }));
      locEl.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { f.shelf = parseInt(b.dataset.s, 10); paintLoc(); }));
      const clr = locEl.querySelector('[data-clearloc]');
      if (clr) clr.addEventListener('click', () => { f.furnitureId = null; f.shelf = null; paintLoc(); });
      const fs = locEl.querySelector('[data-fsearch]');
      if (fs) fs.addEventListener('input', () => {
        const q = normalize(fs.value);
        locEl.querySelectorAll('[data-f]').forEach((b) => { b.hidden = q && !b.dataset.code.includes(q); });
      });
      locEl.querySelectorAll('[data-quickfur]').forEach((b) => b.addEventListener('click', () => quickFurniture(data, (nf) => {
        f.furnitureId = nf.id; f.shelf = nf.shelves === 1 ? 1 : null; paintLoc();
      })));
      const on = locEl.querySelector('[data-f].on');
      if (on && locEl.querySelector('.cells.scroll')) on.scrollIntoView({ block: 'nearest' });
    };
    paintLoc();

    // Precios
    const inCost = $('[data-cost]');
    const inPrice = $('[data-price]');
    const gainEl = $('[data-gain]');
    const paintGain = () => {
      const c = parseMoney(inCost.value);
      const pr = parseMoney(inPrice.value);
      if (!pr) { gainEl.className = 'hint'; gainEl.textContent = 'La app calcula tu ganancia con estos dos precios.'; return; }
      const g = pr - c;
      gainEl.className = 'hint ' + (g >= 0 ? 'good' : 'bad');
      gainEl.textContent = g >= 0 ? `Ganas ${money(g)} por unidad (${Math.round((g / pr) * 100)}%)` : `Ojo: lo vendes ${money(-g)} más barato de lo que costó`;
    };
    [inCost, inPrice].forEach((inp) => {
      inp.addEventListener('input', paintGain);
      inp.addEventListener('blur', () => { const v = parseMoney(inp.value); inp.value = v ? money(v) : ''; });
      inp.addEventListener('focus', () => { const v = parseMoney(inp.value); inp.value = v ? String(v) : ''; });
    });
    paintGain();

    $('[data-save]').addEventListener('click', async () => {
      const name = $('[data-name]').value.trim();
      if (!name) { toast('Escribe el nombre del producto', { icon: 'alert' }); $('[data-name]').focus(); return; }
      const other = checkDup();
      if (other) { toast('Ese código ya lo tiene otro producto', { icon: 'alert' }); return; }
      const newStock = parseIntSafe($('[data-stock]').value, 0);
      const now = new Date().toISOString();
      const prod = {
        ...(orig || {}),
        id: orig ? orig.id : uid(),
        barcode: inBarcode.value.trim(),
        name,
        categoryId: f.categoryId,
        furnitureId: f.furnitureId,
        shelf: f.furnitureId ? f.shelf : null,
        cost: parseMoney(inCost.value),
        price: parseMoney(inPrice.value),
        minStock: parseIntSafe($('[data-min]').value, 0),
        stock: orig ? (orig.stock || 0) : 0,
        createdAt: orig ? orig.createdAt : now,
        updatedAt: now,
      };
      await db.put('products', prod);
      const diff = newStock - prod.stock;
      if (diff !== 0) await recordMovement(prod.id, orig ? 'ajuste' : 'entrada', diff);
      toast(editing ? 'Cambios guardados' : 'Producto guardado');
      go(`/producto/${prod.id}`, { replace: true });
    });
  }
  return { html, mount };
}

// Ventana rápida para crear un mueble sin salir del formulario.
export function quickFurniture(data, onCreated) {
  openModal(`
    <h2>Nuevo mueble</h2>
    <label class="field"><span>Nombre corto del mueble</span>
      <input class="input" type="text" placeholder="Ej: A1" data-code autocapitalize="characters" maxlength="12">
    </label>
    <div class="field"><span>¿Cuántas repisas (pisos) tiene?</span>
      <div class="stepper sm">
        <button type="button" data-m aria-label="Una menos">${icon('minus', 26, 3)}</button>
        <input class="num" type="text" inputmode="numeric" value="4" data-n aria-label="Cantidad de repisas">
        <button type="button" class="plus" data-p aria-label="Una más">${icon('plus', 26, 3)}</button>
      </div>
    </div>
    <span class="hint bad" data-err hidden></span>
    <button type="button" class="btn btn-big btn-primary btn-block" data-ok>${icon('check', 22, 3)} Crear mueble</button>
    <button type="button" class="btn btn-ghost btn-block" data-close>Cancelar</button>
  `, (m, close) => {
    const n = m.querySelector('[data-n]');
    const set = (v) => { n.value = Math.max(1, Math.min(30, v)); };
    m.querySelector('[data-m]').onclick = () => set(parseIntSafe(n.value, 1) - 1);
    m.querySelector('[data-p]').onclick = () => set(parseIntSafe(n.value, 1) + 1);
    m.querySelector('[data-ok]').onclick = async () => {
      const code = m.querySelector('[data-code]').value.trim().toUpperCase();
      const err = m.querySelector('[data-err]');
      if (!code) { err.hidden = false; err.textContent = 'Escribe un nombre, por ejemplo A1.'; return; }
      if (data.furniture.some((x) => normalize(x.code) === normalize(code))) { err.hidden = false; err.textContent = `Ya existe un mueble ${code}.`; return; }
      const nf = { id: uid(), code, description: '', shelves: Math.max(1, Math.min(30, parseIntSafe(n.value, 1))), createdAt: new Date().toISOString() };
      await db.put('furniture', nf);
      data.furniture.push(nf);
      data.furById[nf.id] = nf;
      close();
      toast(`Mueble ${code} creado`);
      onCreated(nf);
    };
  });
}

/* ================= Vender ================= */
export async function sellScreen({ params, query }) {
  const { catById } = await loadAll();
  const p = await db.get('products', params.id);
  if (!p) return { html: `<div class="empty"><h3>Producto no encontrado</h3></div>` };
  const fromScan = query.desde === 'escanear';
  let qty = 1;

  const html = `
    <div class="top">${backBtn('#/producto/' + p.id)}<h1>Vender</h1></div>
    <div class="card hstack" style="gap:14px">
      ${catBox(catById[p.categoryId], 'lg', 30)}
      <div class="grow"><div style="font-size:1.2rem;font-weight:900;line-height:1.2">${esc(p.name)}</div>
      <div class="muted" style="font-weight:700">${money(p.price)} c/u · Hay ${num(p.stock)}</div></div>
    </div>
    <div class="card gap12" style="align-items:center;padding:20px 16px">
      <span style="font-size:1.05rem;font-weight:800;color:var(--muted)">¿Cuántos vendiste?</span>
      <div class="stepper">
        <button type="button" data-m aria-label="Quitar uno">${icon('minus', 32, 3)}</button>
        <input class="num" type="text" inputmode="numeric" value="1" data-n aria-label="Cantidad">
        <button type="button" class="plus" data-p aria-label="Sumar uno">${icon('plus', 32, 3)}</button>
      </div>
      <div class="chips wrap" style="justify-content:center" data-quick>
        ${[1, 2, 3, 6, 12].map((n) => `<button type="button" class="chip" data-q="${n}" style="min-width:52px;justify-content:center">${n}</button>`).join('')}
      </div>
    </div>
    <div class="card gap8">
      <div class="sumrow"><span>Total a cobrar</span><span class="big" data-total></span></div>
      <div class="sumrow"><span>Ganas en esta venta</span><span class="badge ok" data-gain></span></div>
      <div class="sumrow"><span>Quedarán en stock</span><span class="strong" data-left></span></div>
      <span class="hint bad" data-warn hidden></span>
    </div>
    ${!p.price ? `<div class="banner warn">${icon('alert', 24)}<span class="grow">Este producto no tiene precio. <a href="#/producto/${p.id}/editar">Ponerle precio</a></span></div>` : ''}
    <div class="sticky-bottom">
      <button type="button" class="btn btn-big btn-primary btn-block" data-ok>${icon('check', 26, 3)} Confirmar venta</button>
    </div>
  `;

  function mount(el) {
    wireBack(el, '/producto/' + p.id);
    const n = el.querySelector('[data-n]');
    const paint = () => {
      n.value = qty;
      el.querySelector('[data-total]').textContent = money(qty * p.price);
      el.querySelector('[data-gain]').textContent = '+' + money(qty * (p.price - p.cost));
      const left = (p.stock || 0) - qty;
      const leftEl = el.querySelector('[data-left]');
      leftEl.textContent = `${Math.max(0, left)} ${Math.max(0, left) === 1 ? 'unidad' : 'unidades'}`;
      leftEl.style.color = left <= (p.minStock || 0) ? 'var(--amber)' : '';
      const w = el.querySelector('[data-warn]');
      w.hidden = left >= 0;
      w.textContent = `Según la app solo hay ${p.stock}. Puedes vender igual; el stock quedará en 0.`;
      el.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('on', parseInt(b.dataset.q, 10) === qty));
    };
    const set = (v) => { qty = Math.max(1, Math.min(9999, v || 1)); paint(); };
    el.querySelector('[data-m]').onclick = () => set(qty - 1);
    el.querySelector('[data-p]').onclick = () => set(qty + 1);
    n.addEventListener('input', () => { qty = Math.max(1, parseIntSafe(n.value, 1)); paint(); });
    n.addEventListener('focus', () => n.select());
    el.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => set(parseInt(b.dataset.q, 10))));
    el.querySelector('[data-ok]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      const mov = await recordMovement(p.id, 'venta', qty);
      toast(`Venta guardada: ${money(qty * p.price)}`, {
        action: 'Deshacer',
        onAction: async () => { await undoMovement(mov.id); toast('Venta deshecha', { icon: 'history' }); },
      });
      if (fromScan) go('/escanear', { replace: true });
      else go('/producto/' + p.id, { replace: true });
    });
    paint();
  }
  return { html, mount };
}

/* ================= Sumar stock ================= */
export async function addStockScreen({ params, query }) {
  const { catById } = await loadAll();
  const p = await db.get('products', params.id);
  if (!p) return { html: `<div class="empty"><h3>Producto no encontrado</h3></div>` };
  const fromScan = query.desde === 'escanear';
  let qty = 1;

  const html = `
    <div class="top">${backBtn('#/producto/' + p.id)}<h1>Sumar stock</h1></div>
    <div class="card hstack" style="gap:14px">
      ${catBox(catById[p.categoryId], 'lg', 30)}
      <div class="grow"><div style="font-size:1.2rem;font-weight:900;line-height:1.2">${esc(p.name)}</div>
      <div class="muted" style="font-weight:700">Ahora hay ${num(p.stock)}</div></div>
    </div>
    <div class="card gap12" style="align-items:center;padding:20px 16px">
      <span style="font-size:1.05rem;font-weight:800;color:var(--muted)">¿Cuántos llegaron?</span>
      <div class="stepper">
        <button type="button" data-m aria-label="Quitar uno">${icon('minus', 32, 3)}</button>
        <input class="num" type="text" inputmode="numeric" value="1" data-n aria-label="Cantidad">
        <button type="button" class="plus" data-p aria-label="Sumar uno">${icon('plus', 32, 3)}</button>
      </div>
      <div class="chips wrap" style="justify-content:center">
        ${[6, 12, 24, 48].map((n) => `<button type="button" class="chip" data-q="${n}" style="min-width:52px;justify-content:center">+${n}</button>`).join('')}
      </div>
    </div>
    <label class="field"><span>Me costó cada uno (si cambió)</span>
      <input class="input" type="text" inputmode="numeric" value="${p.cost ? money(p.cost) : ''}" placeholder="$0" data-cost>
    </label>
    <div class="card"><div class="sumrow"><span>Quedarás con</span><span class="big" data-left></span></div></div>
    <div class="sticky-bottom">
      <button type="button" class="btn btn-big btn-primary btn-block" data-ok>${icon('check', 26, 3)} Guardar</button>
    </div>
  `;

  function mount(el) {
    wireBack(el, '/producto/' + p.id);
    const n = el.querySelector('[data-n]');
    const inCost = el.querySelector('[data-cost]');
    const paint = () => { n.value = qty; el.querySelector('[data-left]').textContent = `${num((p.stock || 0) + qty)} unidades`; };
    const set = (v) => { qty = Math.max(1, Math.min(99999, v || 1)); paint(); };
    el.querySelector('[data-m]').onclick = () => set(qty - 1);
    el.querySelector('[data-p]').onclick = () => set(qty + 1);
    n.addEventListener('input', () => { qty = Math.max(1, parseIntSafe(n.value, 1)); paint(); });
    n.addEventListener('focus', () => n.select());
    el.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => set(parseInt(b.dataset.q, 10))));
    inCost.addEventListener('blur', () => { const v = parseMoney(inCost.value); inCost.value = v ? money(v) : ''; });
    inCost.addEventListener('focus', () => { const v = parseMoney(inCost.value); inCost.value = v ? String(v) : ''; });
    el.querySelector('[data-ok]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      const c = parseMoney(inCost.value);
      const mov = await recordMovement(p.id, 'entrada', qty, { newCost: c && c !== p.cost ? c : null });
      toast(`Sumaste ${qty}. Ahora hay ${mov.stockAfter}`, {
        action: 'Deshacer',
        onAction: async () => { await undoMovement(mov.id); toast('Cambio deshecho', { icon: 'history' }); },
      });
      if (fromScan) go('/escanear', { replace: true });
      else go('/producto/' + p.id, { replace: true });
    });
    paint();
  }
  return { html, mount };
}
