import { db } from '../db.js';
import { loadAll } from '../app.js';
import { icon, esc, money, num, catBox, stockState, stockBadge, locText, todayKey } from '../ui.js';

export async function homeScreen() {
  const data = await loadAll();
  const { products, furniture, catById, furById } = data;
  const [storeName, lastBackup, movements] = await Promise.all([
    db.getSetting('storeName', 'Mi Almacén'),
    db.getSetting('lastBackup', null),
    db.all('movements'),
  ]);

  const today = todayKey();
  const salesToday = movements.filter((m) => m.type === 'venta' && todayKey(m.date) === today);
  const soldToday = salesToday.reduce((s, m) => s + m.qty * m.price, 0);
  const gainToday = salesToday.reduce((s, m) => s + m.qty * (m.price - m.cost), 0);

  const needing = products.filter((p) => stockState(p) !== 'ok')
    .sort((a, b) => (a.stock || 0) - (b.stock || 0));

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  const days = lastBackup ? Math.floor((Date.now() - new Date(lastBackup)) / 86400000) : null;
  let backupBanner = '';
  if (products.length > 0 && (days === null || days >= 7)) {
    backupBanner = `<a class="banner warn" href="#/mas">${icon('download', 26)}<span class="grow"><b>${days === null ? 'Aún no has hecho un respaldo' : `Último respaldo hace ${days} días`}</b>Toca aquí para guardar tu inventario en Excel.</span>${icon('chev', 22, 2.4)}</a>`;
  }

  let onboarding = '';
  if (products.length === 0) {
    onboarding = `
      <div class="card gap12">
        <h2 style="font-size:1.15rem;font-weight:900">Primeros pasos</h2>
        <a class="row compact" href="#/lugares" style="padding:8px 0">
          <span class="ico-box" style="background:${furniture.length ? 'var(--green-bg)' : 'var(--primary-soft)'};color:${furniture.length ? 'var(--green)' : 'var(--primary)'}">${icon(furniture.length ? 'check' : 'pin', 22)}</span>
          <span class="main"><span class="name">1. Crea tus muebles</span><span class="meta">${furniture.length ? `Ya tienes ${furniture.length}` : 'Ejemplo: A1 con 4 repisas'}</span></span>${icon('chev', 20, 2.4)}
        </a>
        <a class="row compact" href="#/escanear" style="padding:8px 0">
          <span class="ico-box" style="background:var(--primary-soft);color:var(--primary)">${icon('scan', 22)}</span>
          <span class="main"><span class="name">2. Escanea tu primer producto</span><span class="meta">La app te pide nombre, precio y lugar</span></span>${icon('chev', 20, 2.4)}
        </a>
        <a class="row compact" href="#/mas" style="padding:8px 0;border-bottom:0">
          <span class="ico-box" style="background:var(--primary-soft);color:var(--primary)">${icon('upload', 22)}</span>
          <span class="main"><span class="name">¿Ya tienes una lista en Excel?</span><span class="meta">Cárgala desde Más</span></span>${icon('chev', 20, 2.4)}
        </a>
      </div>`;
  }

  const html = `
    <div class="top">
      <div class="grow">
        <div class="hello">${hello}</div>
        <div class="title-xl">${esc(storeName)}</div>
      </div>
      <a class="icon-btn" href="#/avisos" aria-label="Avisos de stock">${icon('bell', 26)}${needing.length ? `<span class="dot">${needing.length}</span>` : ''}</a>
    </div>

    <a class="hero" href="#/escanear">
      <span class="ico">${icon('scan', 32)}</span>
      <span class="grow"><span class="t1">Escanear producto</span><span class="t2">Vender, sumar stock o buscar</span></span>
      ${icon('chev', 24, 2.4)}
    </a>

    ${backupBanner}
    ${onboarding}

    <div class="tiles">
      <a class="tile" href="#/ganancias">
        <span class="ico-box" style="background:var(--green-bg);color:#15803D">${icon('coins', 22)}</span>
        <span class="k">Ventas de hoy</span><span class="v">${money(soldToday)}</span>
      </a>
      <a class="tile" href="#/ganancias">
        <span class="ico-box" style="background:var(--primary-soft);color:var(--primary)">${icon('trend', 22)}</span>
        <span class="k">Ganancia de hoy</span><span class="v" style="color:var(--primary)">${money(gainToday)}</span>
      </a>
      <a class="tile" href="#/productos">
        <span class="ico-box" style="background:var(--blue-bg);color:#1D4ED8">${icon('box', 22)}</span>
        <span class="k">Productos</span><span class="v">${num(products.length)}</span>
      </a>
      <a class="tile ${needing.length ? 'warn' : ''}" href="#/avisos">
        <span class="ico-box" style="background:var(--amber-bg);color:#B45309">${icon('alert', 22)}</span>
        <span class="k">Bajo stock</span><span class="v">${needing.length} ${needing.length === 1 ? 'producto' : 'productos'}</span>
      </a>
    </div>

    ${needing.length ? `
      <div class="section-title"><h2>Hay que reponer</h2><a href="#/avisos">Ver todos</a></div>
      <div class="list">
        ${needing.slice(0, 4).map((p) => `
          <a class="row" href="#/producto/${p.id}">
            ${catBox(catById[p.categoryId], '', 22)}
            <span class="main"><span class="name">${esc(p.name)}</span><span class="meta">${esc(locText(p, furById, true))}</span></span>
            ${stockBadge(p)}
          </a>`).join('')}
      </div>` : products.length ? `
      <div class="banner ok">${icon('check', 26, 2.6)}<span class="grow"><b>Todo con stock</b>No hay productos por acabarse.</span></div>` : ''}
  `;
  return { html };
}
