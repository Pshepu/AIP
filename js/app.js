// AIP · Aplicación Inventario Personal — arranque y navegación.
import { db, seedIfEmpty } from './db.js';
import { icon, closeAllModals, toast } from './ui.js';
import { homeScreen } from './screens/home.js';
import { productsScreen, productDetailScreen, productFormScreen, sellScreen, addStockScreen } from './screens/products.js';
import { scanScreen } from './screens/scan.js';
import { placesScreen, furnitureDetailScreen, furnitureFormScreen, furnitureBulkScreen } from './screens/places.js';
import { alertsScreen } from './screens/alerts.js';
import { reportsScreen } from './screens/reports.js';
import { moreScreen, categoriesScreen, labelsScreen, helpScreen, installScreen } from './screens/more.js';

export const APP_VERSION = '1.0.0';

const routes = [
  ['/', homeScreen, { tab: 'inicio' }],
  ['/productos', productsScreen, { tab: 'productos' }],
  ['/producto/nuevo', productFormScreen, { nav: false }],
  ['/producto/:id', productDetailScreen, { tab: 'productos' }],
  ['/producto/:id/editar', productFormScreen, { nav: false }],
  ['/vender/:id', sellScreen, { nav: false }],
  ['/sumar/:id', addStockScreen, { nav: false }],
  ['/escanear', scanScreen, { nav: false, dark: true }],
  ['/lugares', placesScreen, { tab: 'lugares' }],
  ['/mueble/nuevo', furnitureFormScreen, { nav: false }],
  ['/muebles/varios', furnitureBulkScreen, { nav: false }],
  ['/mueble/:id', furnitureDetailScreen, { tab: 'lugares' }],
  ['/mueble/:id/editar', furnitureFormScreen, { nav: false }],
  ['/avisos', alertsScreen, { tab: 'inicio' }],
  ['/ganancias', reportsScreen, { tab: 'inicio' }],
  ['/mas', moreScreen, { tab: 'mas' }],
  ['/categorias', categoriesScreen, { tab: 'mas' }],
  ['/etiquetas', labelsScreen, { tab: 'mas' }],
  ['/ayuda', helpScreen, { tab: 'mas' }],
  ['/instalar', installScreen, { tab: 'mas' }],
];

function match(path) {
  const parts = path.split('/').filter(Boolean);
  for (const [pattern, screen, opts] of routes) {
    const pp = pattern.split('/').filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(parts[i]);
      else if (pp[i] !== parts[i]) { ok = false; break; }
    }
    if (ok) return { screen, opts, params };
  }
  return null;
}

function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

export function go(path, { replace = false } = {}) {
  const target = '#' + path;
  if (replace) location.replace(target);
  else if (location.hash === target) render();
  else location.hash = target;
}

let navCount = 0;
export function back(fallback = '/') {
  if (navCount > 0) history.back();
  else go(fallback, { replace: true });
}

// Carga todos los datos (son pocos, entran en memoria sin problema).
export async function loadAll() {
  const [products, categories, furniture] = await Promise.all([db.all('products'), db.all('categories'), db.all('furniture')]);
  categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'es'));
  return {
    products,
    categories,
    furniture,
    catById: Object.fromEntries(categories.map((c) => [c.id, c])),
    furById: Object.fromEntries(furniture.map((f) => [f.id, f])),
  };
}

const appEl = document.getElementById('app');
let current = null;
let renderId = 0;

export async function render() {
  const id = ++renderId;
  const { path, query } = parseHash();
  const m = match(path) || match('/');
  if (current && current.unmount) { try { current.unmount(); } catch (_) {} }
  current = null;
  closeAllModals();

  document.body.classList.toggle('no-nav', m.opts.nav === false);
  document.body.classList.toggle('dark-screen', !!m.opts.dark);
  document.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('on', a.dataset.tab === m.opts.tab));

  try {
    const view = await m.screen({ params: m.params, query, path });
    if (id !== renderId) { view.unmount && view.unmount(); return; }
    appEl.innerHTML = view.html;
    window.scrollTo(0, 0);
    current = view;
    if (view.mount) await view.mount(appEl);
  } catch (err) {
    console.error(err);
    appEl.innerHTML = `<div class="empty"><div class="big-ico">${icon('alert', 34)}</div><h3>Algo salió mal</h3><p>${String(err.message || err)}</p><a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;
  }
}

window.addEventListener('hashchange', () => { navCount++; render(); });

/* ---------- Instalación como app ---------- */
export const install = { prompt: null };
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  install.prompt = e;
  document.dispatchEvent(new CustomEvent('aip-install-ready'));
});
window.addEventListener('appinstalled', () => { install.prompt = null; toast('AIP quedó instalada en tu teléfono'); });
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/* ---------- Actualizaciones (service worker) ---------- */
function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offer = (worker) => {
      toast('Hay una versión nueva de AIP', {
        icon: 'download', action: 'Actualizar', duration: 15000,
        onAction: () => worker.postMessage('skipWaiting'),
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

/* ---------- Arranque ---------- */
async function start() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, el.closest('.nav-scan') ? 30 : 26, el.closest('.nav-scan') ? 2.2 : 2);
  });
  try {
    await seedIfEmpty();
    if (await db.getSetting('bigText', false)) document.documentElement.classList.add('big');
    // pide al navegador no borrar los datos por falta de espacio
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (err) {
    appEl.innerHTML = `<div class="empty"><h3>No se pudo abrir la base de datos</h3><p>Abre AIP en Chrome (no en modo incógnito).</p></div>`;
    return;
  }
  setupServiceWorker();
  render();
}

start();
