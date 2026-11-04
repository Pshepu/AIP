import { db, uid, transact } from '../db.js';
import { loadAll, go, back } from '../app.js';
import { icon, esc, num, natCompare, normalize, stockBadge, parseIntSafe, toast, confirmDialog } from '../ui.js';

const backBtn = `<a class="icon-btn" href="#/lugares" data-back aria-label="Volver">${icon('back', 26, 2.2)}</a>`;
function wireBack(el, fallback) {
  const b = el.querySelector('[data-back]');
  if (b) b.addEventListener('click', (e) => { e.preventDefault(); back(fallback); });
}
const groupKey = (code) => (String(code).match(/^[A-Za-zÑñ]+/) || ['#'])[0].toUpperCase();

/* ================= Lista de muebles ================= */
export async function placesScreen() {
  const { furniture, products } = await loadAll();
  const byFur = {};
  for (const p of products) {
    if (!p.furnitureId) continue;
    (byFur[p.furnitureId] ||= { total: 0, shelves: new Set() });
    byFur[p.furnitureId].total++;
    if (p.shelf) byFur[p.furnitureId].shelves.add(p.shelf);
  }
  const sorted = [...furniture].sort((a, b) => natCompare(a.code, b.code));
  const noPlace = products.filter((p) => !p.furnitureId).length;

  const card = (f) => {
    const info = byFur[f.id] || { total: 0, shelves: new Set() };
    const bars = Math.min(f.shelves, 8);
    return `<a class="mcard" href="#/mueble/${f.id}" data-code="${esc(normalize(f.code + ' ' + (f.description || '')))}">
      <span class="code">${esc(f.code)}</span>
      <span class="desc">${esc(f.description || ' ')}</span>
      <span class="shelves" aria-hidden="true">${Array.from({ length: bars }, (_, i) => `<span class="shelf-bar ${info.shelves.has(i + 1) ? 'full' : ''}"></span>`).join('')}</span>
      <span class="foot">${f.shelves} ${f.shelves === 1 ? 'repisa' : 'repisas'} · ${info.total} prod.</span>
    </a>`;
  };

  let body;
  if (!sorted.length) {
    body = `<div class="empty"><div class="big-ico">${icon('pin', 34)}</div><h3>Crea tus muebles</h3>
      <p>Ponle a cada mueble un nombre corto como <b>A1</b>, <b>A2</b> o <b>C1</b>, y dile cuántas repisas (pisos) tiene. Después, al guardar un producto, eliges "Mueble A1, Repisa 2".</p></div>`;
  } else {
    const groups = {};
    sorted.forEach((f) => { (groups[groupKey(f.code)] ||= []).push(f); });
    body = Object.keys(groups).sort(natCompare).map((g) => `
      <div data-group>
        ${Object.keys(groups).length > 1 ? `<div class="letter-head" style="margin-bottom:8px">${esc(g)}</div>` : ''}
        <div class="mgrid">${groups[g].map(card).join('')}</div>
      </div>`).join('');
  }

  const html = `
    <div class="top"><div class="grow"><h1>Lugares</h1><div class="sub">${sorted.length ? `${sorted.length} muebles · toca uno para ver qué tiene` : 'Tus muebles y repisas'}</div></div></div>
    <div class="btn-row">
      <a class="btn btn-primary" href="#/mueble/nuevo">${icon('plus', 22, 3)} Nuevo mueble</a>
      <a class="btn btn-soft" href="#/muebles/varios">${icon('layers', 22)} Crear varios</a>
    </div>
    ${sorted.length > 6 ? `<div class="search"><label>${icon('search', 22, 2.2)}<input type="search" placeholder="Buscar mueble (ej: C1)" data-q aria-label="Buscar mueble"></label></div>` : ''}
    ${noPlace ? `<a class="banner warn" href="#/productos">${icon('alert', 24)}<span class="grow"><b>${noPlace} ${noPlace === 1 ? 'producto' : 'productos'} sin ubicación</b>Edítalos para decir en qué mueble están.</span></a>` : ''}
    ${body}
  `;

  function mount(el) {
    const q = el.querySelector('[data-q]');
    if (!q) return;
    q.addEventListener('input', () => {
      const v = normalize(q.value);
      el.querySelectorAll('.mcard').forEach((c) => { c.hidden = v && !c.dataset.code.includes(v); });
      el.querySelectorAll('[data-group]').forEach((g) => { g.hidden = ![...g.querySelectorAll('.mcard')].some((c) => !c.hidden); });
    });
  }
  return { html, mount };
}

/* ================= Detalle de un mueble ================= */
export async function furnitureDetailScreen({ params }) {
  const { products, furById } = await loadAll();
  const f = furById[params.id];
  if (!f) return { html: `<div class="empty"><h3>Mueble no encontrado</h3><a class="btn btn-primary" href="#/lugares">Ver lugares</a></div>` };
  const here = products.filter((p) => p.furnitureId === f.id).sort((a, b) => natCompare(a.name, b.name));
  const byShelf = {};
  here.forEach((p) => { (byShelf[p.shelf && p.shelf <= f.shelves ? p.shelf : 0] ||= []).push(p); });

  const prodRows = (list) => list.map((p) => `
    <a class="row compact" href="#/producto/${p.id}"><span class="main"><span class="name">${esc(p.name)}</span></span>${stockBadge(p)}</a>`).join('');

  const shelves = Array.from({ length: f.shelves }, (_, i) => i + 1).map((n) => {
    const list = byShelf[n] || [];
    return `<div class="shelf-block">
      <div class="sh"><span>Repisa ${n}</span><span style="font-size:.85rem">${list.length} prod.</span></div>
      ${list.length ? prodRows(list) : ''}
      <a class="row compact" href="#/producto/nuevo?mueble=${f.id}&repisa=${n}" style="color:var(--primary);font-weight:800">${icon('plus', 20, 2.6)} <span class="main"><span class="name" style="font-size:.9rem">${list.length ? 'Agregar otro aquí' : 'Vacía · agregar producto aquí'}</span></span></a>
    </div>`;
  }).join('');

  const html = `
    <div class="top">${backBtn}<div class="grow"><h1>Mueble ${esc(f.code)}</h1>${f.description ? `<div class="sub">${esc(f.description)}</div>` : ''}</div>
      <a class="icon-btn" href="#/mueble/${f.id}/editar" aria-label="Editar mueble">${icon('edit', 24)}</a></div>
    <div class="grid2">
      <div class="infobox" style="background:var(--surface);box-shadow:var(--shadow)"><span class="k">Repisas</span><span class="v">${f.shelves}</span></div>
      <div class="infobox" style="background:var(--surface);box-shadow:var(--shadow)"><span class="k">Productos</span><span class="v">${num(here.length)}</span></div>
    </div>
    <p class="hint">La repisa 1 es la de más arriba.</p>
    ${shelves}
    ${byShelf[0] ? `<div class="shelf-block"><div class="sh" style="background:var(--amber-bg);color:var(--amber)"><span>Sin repisa asignada</span><span style="font-size:.85rem">${byShelf[0].length} prod.</span></div>${prodRows(byShelf[0])}</div>` : ''}
    <a class="btn btn-block" href="#/etiquetas?mueble=${f.id}" style="box-shadow:var(--shadow)">${icon('qr', 22)} Imprimir etiqueta QR de este mueble</a>
    <button type="button" class="btn btn-ghost" data-del style="color:var(--red)">${icon('trash', 20)} Borrar mueble</button>
  `;

  function mount(el) {
    wireBack(el, '/lugares');
    el.querySelector('[data-del]').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: `¿Borrar el mueble ${f.code}?`,
        text: here.length ? `Los ${here.length} productos que tiene no se borran: quedan "sin ubicación".` : 'Este mueble no tiene productos.',
        ok: 'Sí, borrar', danger: true,
      });
      if (!ok) return;
      await transact(['furniture', 'products'], 'readwrite', (s) => {
        s.furniture.delete(f.id);
        here.forEach((p) => s.products.put({ ...p, furnitureId: null, shelf: null }));
      });
      toast(`Mueble ${f.code} borrado`);
      go('/lugares', { replace: true });
    });
  }
  return { html, mount };
}

/* ================= Crear / editar mueble ================= */
export async function furnitureFormScreen({ params }) {
  const { furniture, products, furById } = await loadAll();
  const orig = params.id ? furById[params.id] : null;
  if (params.id && !orig) return { html: `<div class="empty"><h3>Mueble no encontrado</h3></div>` };
  let shelves = orig ? orig.shelves : 4;

  const html = `
    <div class="top">${backBtn}<h1>${orig ? `Editar mueble ${esc(orig.code)}` : 'Nuevo mueble'}</h1></div>
    <label class="field"><span>Nombre corto del mueble</span>
      <input class="input" type="text" placeholder="Ej: A1" value="${esc(orig?.code || '')}" data-code autocapitalize="characters" maxlength="12" style="font-size:1.4rem;font-weight:900">
      <span class="hint">Usa letra y número, por ejemplo A1, A2, B1, C1.</span>
    </label>
    <label class="field"><span>Descripción (opcional)</span>
      <input class="input" type="text" placeholder="Ej: Pasillo de bebidas, al lado de la caja" value="${esc(orig?.description || '')}" data-desc maxlength="60">
    </label>
    <div class="card gap12" style="align-items:center">
      <span style="font-weight:800;color:var(--muted)">¿Cuántas repisas (pisos) tiene?</span>
      <div class="stepper">
        <button type="button" data-m aria-label="Una menos">${icon('minus', 32, 3)}</button>
        <input class="num" type="text" inputmode="numeric" value="${shelves}" data-n aria-label="Cantidad de repisas">
        <button type="button" class="plus" data-p aria-label="Una más">${icon('plus', 32, 3)}</button>
      </div>
      <span class="hint" data-preview></span>
    </div>
    <span class="hint bad" data-err hidden></span>
    <div class="sticky-bottom">
      <button type="button" class="btn btn-big btn-primary btn-block" data-save>${icon('check', 24, 3)} Guardar mueble</button>
    </div>
  `;

  function mount(el) {
    wireBack(el, orig ? `/mueble/${orig.id}` : '/lugares');
    const n = el.querySelector('[data-n]');
    const codeIn = el.querySelector('[data-code]');
    const prev = el.querySelector('[data-preview]');
    const paint = () => {
      n.value = shelves;
      const c = codeIn.value.trim().toUpperCase() || 'A1';
      prev.textContent = shelves <= 6
        ? Array.from({ length: shelves }, (_, i) => `${c} · Repisa ${i + 1}`).join('  |  ')
        : `${c} · Repisa 1 … ${c} · Repisa ${shelves}`;
    };
    const set = (v) => { shelves = Math.max(1, Math.min(30, v || 1)); paint(); };
    el.querySelector('[data-m]').onclick = () => set(shelves - 1);
    el.querySelector('[data-p]').onclick = () => set(shelves + 1);
    n.addEventListener('input', () => { shelves = Math.max(1, Math.min(30, parseIntSafe(n.value, 1))); prev.textContent = ''; paint(); });
    codeIn.addEventListener('input', paint);
    paint();

    el.querySelector('[data-save]').addEventListener('click', async () => {
      const err = el.querySelector('[data-err]');
      const code = codeIn.value.trim().toUpperCase();
      if (!code) { err.hidden = false; err.textContent = 'Escribe el nombre del mueble, por ejemplo A1.'; codeIn.focus(); return; }
      if (furniture.some((x) => x.id !== orig?.id && normalize(x.code) === normalize(code))) {
        err.hidden = false; err.textContent = `Ya existe un mueble llamado ${code}.`; return;
      }
      const affected = orig ? products.filter((p) => p.furnitureId === orig.id && p.shelf > shelves) : [];
      if (affected.length) {
        const ok = await confirmDialog({
          title: 'Hay productos en repisas que vas a quitar',
          text: `${affected.length} ${affected.length === 1 ? 'producto queda' : 'productos quedan'} en el mueble, pero "sin repisa". ¿Seguir?`,
          ok: 'Sí, seguir',
        });
        if (!ok) return;
      }
      const f = {
        ...(orig || {}),
        id: orig ? orig.id : uid(),
        code,
        description: el.querySelector('[data-desc]').value.trim(),
        shelves,
        createdAt: orig ? orig.createdAt : new Date().toISOString(),
      };
      await transact(['furniture', 'products'], 'readwrite', (s) => {
        s.furniture.put(f);
        affected.forEach((p) => s.products.put({ ...p, shelf: null }));
      });
      toast(orig ? 'Mueble actualizado' : `Mueble ${code} creado`);
      go(`/mueble/${f.id}`, { replace: true });
    });
  }
  return { html, mount };
}

/* ================= Crear varios muebles de una vez ================= */
export async function furnitureBulkScreen() {
  const { furniture } = await loadAll();
  const existing = new Set(furniture.map((f) => normalize(f.code)));
  const s = { letter: 'A', from: 1, to: 5, shelves: 4 };

  const html = `
    <div class="top">${backBtn}<h1>Crear varios muebles</h1></div>
    <p class="muted" style="font-weight:600">Útil si tienes muchos muebles iguales. Ejemplo: letra A, del 1 al 5 → A1, A2, A3, A4 y A5.</p>
    <div class="grid2">
      <label class="field"><span>Letra</span><input class="input" type="text" value="A" maxlength="4" data-l autocapitalize="characters" style="font-size:1.3rem;font-weight:900"></label>
      <label class="field"><span>Repisas de cada uno</span><input class="input" type="text" inputmode="numeric" value="4" data-s style="font-size:1.3rem;font-weight:900"></label>
      <label class="field"><span>Desde el número</span><input class="input" type="text" inputmode="numeric" value="1" data-f style="font-size:1.3rem;font-weight:900"></label>
      <label class="field"><span>Hasta el número</span><input class="input" type="text" inputmode="numeric" value="5" data-t style="font-size:1.3rem;font-weight:900"></label>
    </div>
    <div class="card gap8">
      <span class="flabel">Se van a crear</span>
      <div class="chips wrap" data-prev></div>
      <span class="hint" data-note></span>
    </div>
    <div class="sticky-bottom">
      <button type="button" class="btn btn-big btn-primary btn-block" data-save>${icon('check', 24, 3)} <span data-btn>Crear</span></button>
    </div>
  `;

  function mount(el) {
    wireBack(el, '/lugares');
    const $ = (q) => el.querySelector(q);
    let list = [];
    const paint = () => {
      s.letter = $('[data-l]').value.trim().toUpperCase();
      s.shelves = Math.max(1, Math.min(30, parseIntSafe($('[data-s]').value, 1)));
      s.from = parseIntSafe($('[data-f]').value, 1);
      s.to = parseIntSafe($('[data-t]').value, s.from);
      const lo = Math.min(s.from, s.to);
      const hi = Math.min(Math.max(s.from, s.to), lo + 99);
      list = s.letter ? Array.from({ length: hi - lo + 1 }, (_, i) => `${s.letter}${lo + i}`) : [];
      const fresh = list.filter((c) => !existing.has(normalize(c)));
      $('[data-prev]').innerHTML = list.map((c) => existing.has(normalize(c))
        ? `<span class="chip" style="opacity:.5;text-decoration:line-through">${esc(c)}</span>`
        : `<span class="chip on-primary">${esc(c)}</span>`).join('') || '<span class="hint">Escribe una letra</span>';
      $('[data-note]').textContent = list.length !== fresh.length ? 'Los tachados ya existen y no se tocan.' : `Cada uno con ${s.shelves} ${s.shelves === 1 ? 'repisa' : 'repisas'}.`;
      $('[data-btn]').textContent = fresh.length ? `Crear ${fresh.length} ${fresh.length === 1 ? 'mueble' : 'muebles'}` : 'Nada nuevo que crear';
      $('[data-save]').disabled = !fresh.length;
    };
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', paint));
    paint();
    $('[data-save]').addEventListener('click', async () => {
      const now = new Date().toISOString();
      const fresh = list.filter((c) => !existing.has(normalize(c))).map((code) => ({ id: uid(), code, description: '', shelves: s.shelves, createdAt: now }));
      if (!fresh.length) return;
      await db.bulkPut('furniture', fresh);
      toast(`${fresh.length} muebles creados`);
      go('/lugares', { replace: true });
    });
  }
  return { html, mount };
}
