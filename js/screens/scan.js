import { db } from '../db.js';
import { loadAll, back } from '../app.js';
import { icon, esc, money, num, catBox, locText, stockState, feedback, promptText } from '../ui.js';
import { startScanner, cameraErrorText } from '../scanner.js';

const QR_FURNITURE = 'AIP-M:';

function scannerMarkup(title, closeLabel) {
  return `
    <div class="scanner">
      <video aria-label="Vista de la cámara"></video>
      <div class="shade"></div>
      <div class="bar-top">
        <button type="button" class="icon-btn" data-close aria-label="${closeLabel}">${icon('back', 26, 2.2)}</button>
        <span class="ttl">${title}</span>
        <button type="button" class="icon-btn" data-torch aria-label="Linterna" style="visibility:hidden">${icon('zap', 24)}</button>
      </div>
      <div class="frame"><i></i><i></i><i></i><i></i><div class="laser"></div></div>
      <p class="msg" data-msg>Apunta la cámara al código de barras</p>
      <div class="bottom-actions">
        <button type="button" class="btn btn-block" data-manual>${icon('keyboard', 22)} Escribir el código a mano</button>
      </div>
      <div data-sheet></div>
    </div>`;
}

async function boot(root, onCode) {
  const video = root.querySelector('video');
  try {
    const ctl = await startScanner(video, onCode);
    if (ctl.hasTorch) {
      const t = root.querySelector('[data-torch]');
      let on = false;
      t.style.visibility = 'visible';
      t.addEventListener('click', async () => {
        on = !on;
        await ctl.setTorch(on);
        t.style.background = on ? '#FCD34D' : '';
        t.style.color = on ? '#17302B' : '';
      });
    }
    return ctl;
  } catch (err) {
    const box = document.createElement('div');
    box.className = 'cam-error';
    box.innerHTML = `<b style="font-size:1.1rem">No se pudo usar la cámara</b><p class="muted" style="font-weight:600">${esc(cameraErrorText(err))}</p>
      <button type="button" class="btn btn-primary" data-retry>Intentar de nuevo</button>`;
    root.appendChild(box);
    root.querySelector('[data-msg]').hidden = true;
    root.querySelector('.frame').hidden = true;
    box.querySelector('[data-retry]').addEventListener('click', () => location.reload());
    return null;
  }
}

/* ================= Pantalla Escanear ================= */
export async function scanScreen() {
  let ctl = null;
  let alive = true;
  const html = scannerMarkup('Escanear', 'Volver');

  async function mount(el) {
    const root = el.querySelector('.scanner');
    const sheet = root.querySelector('[data-sheet]');
    const msg = root.querySelector('[data-msg]');
    root.querySelector('[data-close]').addEventListener('click', () => back('/'));

    const closeSheet = () => { sheet.innerHTML = ''; msg.hidden = false; ctl && ctl.resume(); };

    const handle = async (code) => {
      feedback();
      msg.hidden = true;
      if (code.startsWith(QR_FURNITURE)) {
        location.hash = '#/mueble/' + encodeURIComponent(code.slice(QR_FURNITURE.length));
        return;
      }
      const { catById, furById } = await loadAll();
      const found = (await db.byIndex('products', 'barcode', code))[0];
      if (found) {
        const st = stockState(found);
        sheet.innerHTML = `
          <div class="sheet">
            <div class="grab"></div>
            <span class="badge ok" style="align-self:flex-start;display:inline-flex;gap:6px;align-items:center;font-size:.85rem">${icon('check', 16, 3)} Producto encontrado</span>
            <div class="hstack" style="gap:14px">
              ${catBox(catById[found.categoryId], 'lg', 30)}
              <div class="grow" style="min-width:0"><div style="font-size:1.25rem;font-weight:900;line-height:1.2">${esc(found.name)}</div>
              <div class="muted" style="font-weight:700">${esc(catById[found.categoryId]?.name || 'Sin categoría')} · ${money(found.price)}</div></div>
            </div>
            <div class="grid2">
              <div class="infobox"><span class="k">Está en</span><span class="v" style="color:var(--primary)">${icon('pin', 20, 2.4)} ${esc(locText(found, furById))}</span></div>
              <div class="infobox" style="${st !== 'ok' ? `background:${st === 'out' ? 'var(--red-bg)' : 'var(--amber-bg)'}` : ''}"><span class="k">Quedan</span><span class="v" style="${st !== 'ok' ? `color:${st === 'out' ? 'var(--red)' : 'var(--amber)'}` : ''}">${num(found.stock)} u.</span></div>
            </div>
            <a class="btn btn-big btn-primary btn-block" href="#/vender/${found.id}?desde=escanear">${icon('cart', 24, 2.2)} Vender</a>
            <div class="btn-row">
              <a class="btn btn-soft" href="#/sumar/${found.id}?desde=escanear">${icon('plus', 20, 2.8)} Sumar stock</a>
              <a class="btn" href="#/producto/${found.id}" style="background:var(--bg)">${icon('box', 20)} Ver ficha</a>
            </div>
            <button type="button" class="btn btn-ghost btn-block" data-again>${icon('scan', 20)} Escanear otro</button>
          </div>`;
      } else {
        sheet.innerHTML = `
          <div class="sheet">
            <div class="grab"></div>
            <span class="badge info" style="align-self:flex-start;font-size:.85rem">Producto nuevo</span>
            <div style="font-size:1.25rem;font-weight:900">Este código no está en tu inventario</div>
            <div class="infobox"><span class="k">Código leído</span><span class="v" style="letter-spacing:1px">${esc(code)}</span></div>
            <a class="btn btn-big btn-primary btn-block" href="#/producto/nuevo?codigo=${encodeURIComponent(code)}">${icon('plus', 24, 3)} Agregar este producto</a>
            <button type="button" class="btn btn-ghost btn-block" data-again>${icon('scan', 20)} Escanear otro</button>
          </div>`;
      }
      sheet.querySelector('[data-again]').addEventListener('click', closeSheet);
    };

    root.querySelector('[data-manual]').addEventListener('click', async () => {
      const code = await promptText({ title: 'Escribir código', label: 'Números del código de barra', inputmode: 'numeric', ok: 'Buscar' });
      if (code) handle(code.replace(/\s/g, ''));
    });

    ctl = await boot(root, handle);
    if (!alive && ctl) ctl.stop();
  }

  return {
    html,
    mount,
    unmount() { alive = false; if (ctl) ctl.stop(); },
  };
}

/* ================= Escáner flotante (para formularios) ================= */
export function openScannerOverlay(onCode) {
  const wrap = document.createElement('div');
  wrap.innerHTML = scannerMarkup('Leer código', 'Cerrar');
  const root = wrap.firstElementChild;
  document.body.appendChild(root);
  let ctl = null;
  let closed = false;
  const close = () => { closed = true; if (ctl) ctl.stop(); root.remove(); window.removeEventListener('hashchange', close); };
  window.addEventListener('hashchange', close);
  root.querySelector('[data-close]').addEventListener('click', close);
  const done = (code) => { feedback(); close(); onCode(code); };
  root.querySelector('[data-manual]').addEventListener('click', async () => {
    const code = await promptText({ title: 'Escribir código', label: 'Números del código de barra', inputmode: 'numeric', ok: 'Usar' });
    if (code) done(code.replace(/\s/g, ''));
  });
  boot(root, done).then((c) => { ctl = c; if (closed && c) c.stop(); });
}
