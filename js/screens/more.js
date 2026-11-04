import { db, uid, transact } from '../db.js';
import { loadAll, render, back, install, isInstalled, APP_VERSION } from '../app.js';
import {
  icon, esc, num, fmtDate, toast, confirmDialog, promptText, openModal, COLORS, CATEGORY_ICONS, catBox, natCompare,
} from '../ui.js';
import { backupFile, downloadBlob, readExcel, importData } from '../excel.js';
import { loadZxing } from '../scanner.js';

const wireBack = (el, fb) => {
  const b = el.querySelector('[data-back]');
  if (b) b.addEventListener('click', (e) => { e.preventDefault(); back(fb); });
};
const backBtn = (href = '#/mas') => `<a class="icon-btn" href="${href}" data-back aria-label="Volver">${icon('back', 26, 2.2)}</a>`;

/* ================= Más ================= */
export async function moreScreen() {
  const { products, categories, furniture } = await loadAll();
  const [lastBackup, storeName, bigText] = await Promise.all([
    db.getSetting('lastBackup', null), db.getSetting('storeName', 'Mi Almacén'), db.getSetting('bigText', false),
  ]);
  const days = lastBackup ? Math.floor((Date.now() - new Date(lastBackup)) / 86400000) : null;
  const status = !lastBackup
    ? `<div class="banner warn">${icon('alert', 26)}<span class="grow"><b>Aún no tienes respaldo</b>Tus datos viven solo en este teléfono. Guarda un Excel.</span></div>`
    : days >= 7
      ? `<div class="banner warn">${icon('alert', 26)}<span class="grow"><b>Último respaldo hace ${days} días</b>Es bueno hacer uno cada semana.</span></div>`
      : `<div class="banner ok">${icon('check', 26, 2.6)}<span class="grow"><b>Respaldo al día</b>Último: ${fmtDate(lastBackup)}</span></div>`;

  const bigBtn = (attr, ic, bg, fg, t1, t2) => `
    <button type="button" class="row" ${attr} style="min-height:72px">
      <span class="ico-box md" style="background:${bg};color:${fg}">${icon(ic, 24)}</span>
      <span class="main"><span class="name">${t1}</span><span class="meta">${t2}</span></span>
    </button>`;
  const linkRow = (href, ic, t, extra = '') => `
    <a class="row compact" href="${href}"><span style="color:var(--muted)">${icon(ic, 22)}</span><span class="main"><span class="name" style="font-weight:700">${t}</span></span>${extra}<span class="chev">${icon('chev', 20, 2.4)}</span></a>`;

  const html = `
    <div class="top"><h1>Más</h1></div>
    ${status}
    <div class="label-caps">Tus datos</div>
    <div class="list">
      ${bigBtn('data-export', 'file', 'var(--green-bg)', '#15803D', 'Descargar Excel', 'Se guarda en la carpeta Descargas')}
      ${bigBtn('data-share', 'share', 'var(--primary-soft)', 'var(--primary)', 'Enviar respaldo', 'Por WhatsApp, Gmail o Google Drive')}
      ${bigBtn('data-import', 'upload', '#FFEDD5', '#C2410C', 'Cargar desde Excel', 'Recuperar un respaldo o cargar muchos productos')}
    </div>
    <input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-file hidden>
    <p class="hint">${num(products.length)} productos · ${num(furniture.length)} muebles · ${num(categories.length)} categorías</p>

    <div class="label-caps">Ajustes</div>
    <div class="list">
      <button type="button" class="row compact" data-name><span style="color:var(--muted)">${icon('store', 22)}</span><span class="main"><span class="name" style="font-weight:700">Nombre del local</span><span class="meta">${esc(storeName)}</span></span><span class="chev">${icon('chev', 20, 2.4)}</span></button>
      ${linkRow('#/categorias', 'grid', 'Categorías')}
      ${linkRow('#/lugares', 'pin', 'Muebles y repisas')}
      ${linkRow('#/etiquetas', 'qr', 'Imprimir etiquetas QR')}
      <button type="button" class="row compact" data-big aria-pressed="${bigText}"><span style="color:var(--muted)">${icon('text', 22)}</span><span class="main"><span class="name" style="font-weight:700">Letra grande</span></span><span class="toggle ${bigText ? 'on' : ''}"></span></button>
      ${isInstalled() ? '' : linkRow('#/instalar', 'phone', 'Instalar AIP en el teléfono')}
      ${linkRow('#/ayuda', 'help', 'Ayuda: cómo usar AIP')}
    </div>
    <p class="hint center">AIP versión ${APP_VERSION} · Tus datos se guardan solo en este teléfono.</p>
  `;

  async function mount(el) {
    const markBackup = () => db.setSetting('lastBackup', new Date().toISOString());

    el.querySelector('[data-export]').addEventListener('click', async () => {
      try {
        const { blob, name } = await backupFile();
        downloadBlob(blob, name);
        await markBackup();
        toast('Excel descargado. Búscalo en la carpeta Descargas');
        setTimeout(render, 1500);
      } catch (e) { toast(e.message, { icon: 'alert' }); }
    });

    el.querySelector('[data-share]').addEventListener('click', async () => {
      try {
        const { blob, name, type } = await backupFile();
        const file = new File([blob], name, { type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'Respaldo AIP', text: 'Respaldo del inventario AIP' });
            await markBackup();
            toast('Respaldo enviado');
            render();
          } catch (e) { if (e.name !== 'AbortError') throw e; }
        } else {
          downloadBlob(blob, name);
          await markBackup();
          toast('Este teléfono no permite compartir directo. Se descargó el Excel.');
          setTimeout(render, 1500);
        }
      } catch (e) { toast(e.message || 'No se pudo enviar', { icon: 'alert' }); }
    });

    const fileIn = el.querySelector('[data-file]');
    el.querySelector('[data-import]').addEventListener('click', () => { fileIn.value = ''; fileIn.click(); });
    fileIn.addEventListener('change', async () => {
      const file = fileIn.files[0];
      if (!file) return;
      let data;
      try { data = await readExcel(file); } catch (e) { toast('No se pudo leer el archivo. ¿Es un Excel?', { icon: 'alert' }); return; }
      if (!data.products.length && !data.furniture.length) { toast('El archivo no tiene productos', { icon: 'alert' }); return; }
      openModal(`
        <h2>Cargar "${esc(file.name)}"</h2>
        <p>Encontré ${num(data.products.length)} productos${data.furniture.length ? `, ${num(data.furniture.length)} muebles` : ''}${data.movements.length ? ` y ${num(data.movements.length)} movimientos` : ''}.</p>
        <button type="button" class="btn btn-big btn-primary btn-block" data-merge>${icon('plus', 22, 3)} Agregar y actualizar</button>
        <p class="hint" style="margin-top:-6px">Suma los productos nuevos y actualiza los que ya tienes (por código o nombre). No borra nada.</p>
        <button type="button" class="btn btn-big btn-danger btn-block" data-replace>${icon('history', 22)} Recuperar respaldo (reemplazar todo)</button>
        <p class="hint" style="margin-top:-6px">Borra lo que hay en este teléfono y deja exactamente lo del Excel. Úsalo si cambiaste de teléfono.</p>
        <button type="button" class="btn btn-ghost btn-block" data-close>Cancelar</button>
      `, (m, close) => {
        const run = async (mode) => {
          if (mode === 'replace') {
            const ok = await confirmDialog({ title: '¿Reemplazar todo?', text: 'Lo que tienes ahora en el teléfono se borra y queda solo lo del Excel.', ok: 'Sí, reemplazar', danger: true });
            if (!ok) return;
          }
          close();
          try {
            const r = await importData(data, mode);
            toast(`Listo: ${r.created} nuevos, ${r.updated} actualizados`, { duration: 4500 });
            render();
          } catch (e) { console.error(e); toast('Hubo un problema al cargar: ' + e.message, { icon: 'alert' }); }
        };
        m.querySelector('[data-merge]').onclick = () => run('merge');
        m.querySelector('[data-replace]').onclick = () => run('replace');
      });
    });

    el.querySelector('[data-name]').addEventListener('click', async () => {
      const v = await promptText({ title: 'Nombre del local', label: 'Se muestra en el inicio', value: storeName });
      if (v) { await db.setSetting('storeName', v); render(); }
    });
    el.querySelector('[data-big]').addEventListener('click', async () => {
      const on = !document.documentElement.classList.contains('big');
      document.documentElement.classList.toggle('big', on);
      await db.setSetting('bigText', on);
      render();
    });
  }
  return { html, mount };
}

/* ================= Categorías ================= */
export async function categoriesScreen() {
  const { categories, products } = await loadAll();
  const count = {};
  products.forEach((p) => { if (p.categoryId) count[p.categoryId] = (count[p.categoryId] || 0) + 1; });

  const html = `
    <div class="top">${backBtn()}<h1>Categorías</h1></div>
    <button type="button" class="btn btn-primary btn-block" data-new>${icon('plus', 22, 3)} Nueva categoría</button>
    <div class="list">
      ${categories.map((c) => `
        <button type="button" class="row" data-edit="${c.id}">
          ${catBox(c, '', 22)}
          <span class="main"><span class="name">${esc(c.name)}</span><span class="meta">${count[c.id] || 0} productos</span></span>
          <span class="chev">${icon('edit', 20)}</span>
        </button>`).join('')}
    </div>
  `;

  function editor(c) {
    const cat = c ? { ...c } : { id: uid(), name: '', color: 'teal', icon: 'box', order: categories.length };
    openModal(`
      <h2>${c ? 'Editar categoría' : 'Nueva categoría'}</h2>
      <label class="field"><span>Nombre</span><input class="input" type="text" value="${esc(cat.name)}" placeholder="Ej: Juguetes" data-n></label>
      <div class="field"><span>Color</span><div class="chips wrap" data-colors>
        ${Object.entries(COLORS).map(([k, [bg, fg]]) => `<button type="button" class="chip" data-c="${k}" aria-label="Color ${k}" style="width:44px;padding:0;justify-content:center;background:${bg};border-color:${bg}"><span style="width:18px;height:18px;border-radius:50%;background:${fg}"></span></button>`).join('')}
      </div></div>
      <div class="field"><span>Ícono</span><div class="chips wrap" data-icons>
        ${CATEGORY_ICONS.map((k) => `<button type="button" class="chip" data-i="${k}" aria-label="Ícono ${k}" style="width:48px;padding:0;justify-content:center">${icon(k, 22)}</button>`).join('')}
      </div></div>
      <button type="button" class="btn btn-big btn-primary btn-block" data-ok>${icon('check', 22, 3)} Guardar</button>
      ${c ? `<button type="button" class="btn btn-ghost btn-block" data-del style="color:var(--red)">${icon('trash', 20)} Borrar categoría</button>` : ''}
      <button type="button" class="btn btn-ghost btn-block" data-close>Cancelar</button>
    `, (m, close) => {
      const paint = () => {
        m.querySelectorAll('[data-c]').forEach((b) => { b.style.outline = b.dataset.c === cat.color ? '3px solid var(--ink)' : ''; });
        m.querySelectorAll('[data-i]').forEach((b) => {
          const on = b.dataset.i === cat.icon;
          const [bg, fg] = COLORS[cat.color] || COLORS.gray;
          b.style.background = on ? bg : '';
          b.style.color = on ? fg : '';
          b.style.borderColor = on ? fg : '';
        });
      };
      m.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { cat.color = b.dataset.c; paint(); }));
      m.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { cat.icon = b.dataset.i; paint(); }));
      paint();
      m.querySelector('[data-ok]').onclick = async () => {
        cat.name = m.querySelector('[data-n]').value.trim();
        if (!cat.name) { toast('Escribe un nombre', { icon: 'alert' }); return; }
        await db.put('categories', cat);
        close();
        toast('Categoría guardada');
        render();
      };
      const del = m.querySelector('[data-del]');
      if (del) del.onclick = async () => {
        close();
        const n = count[cat.id] || 0;
        const ok = await confirmDialog({ title: `¿Borrar "${cat.name}"?`, text: n ? `Los ${n} productos de esta categoría no se borran: quedan sin categoría.` : '', ok: 'Sí, borrar', danger: true });
        if (!ok) return;
        await transact(['categories', 'products'], 'readwrite', (s) => {
          s.categories.delete(cat.id);
          products.filter((p) => p.categoryId === cat.id).forEach((p) => s.products.put({ ...p, categoryId: null }));
        });
        toast('Categoría borrada');
        render();
      };
    });
  }

  function mount(el) {
    wireBack(el, '/mas');
    el.querySelector('[data-new]').addEventListener('click', () => editor(null));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editor(categories.find((c) => c.id === b.dataset.edit))));
  }
  return { html, mount };
}

/* ================= Etiquetas QR ================= */
export async function labelsScreen({ query }) {
  const { furniture, products } = await loadAll();
  const sorted = [...furniture].sort((a, b) => natCompare(a.code, b.code));
  const own = products.filter((p) => /^AIP\d+$/.test(p.barcode || '')).sort((a, b) => natCompare(a.name, b.name));
  const only = query.mueble;

  const html = `
    <div class="top no-print">${backBtn(only ? `#/mueble/${only}` : '#/mas')}<h1>Etiquetas QR</h1></div>
    <p class="muted no-print" style="font-weight:600">Imprime y pega cada etiqueta en su mueble. Al escanearla con AIP verás todo lo que hay en ese mueble.${own.length ? ' También salen los productos a los que AIP les creó un código.' : ''}</p>
    ${!sorted.length && !own.length ? `<div class="empty"><h3>No hay nada que imprimir</h3><p>Primero crea tus muebles en Lugares.</p></div>` : `
      <button type="button" class="btn btn-primary btn-block no-print" data-print>${icon('printer', 22)} Imprimir o guardar PDF</button>
      <div class="labels" data-labels><p class="hint">Preparando etiquetas…</p></div>`}
  `;

  async function mount(el) {
    wireBack(el, '/mas');
    const box = el.querySelector('[data-labels]');
    if (!box) return;
    el.querySelector('[data-print]').addEventListener('click', () => window.print());
    let ZXing;
    try { ZXing = await loadZxing(); } catch (e) { box.innerHTML = '<p class="hint bad">No se pudo preparar el generador de QR.</p>'; return; }
    const writer = new ZXing.BrowserQRCodeSvgWriter();
    const items = [];
    sorted.filter((f) => !only || f.id === only).forEach((f) => items.push({ text: 'AIP-M:' + f.id, big: f.code, sub: `${f.shelves} repisas${f.description ? ' · ' + f.description : ''}` }));
    if (!only) own.forEach((p) => items.push({ text: p.barcode, big: p.name, sub: p.barcode, small: true }));
    box.innerHTML = '';
    for (const it of items) {
      const card = document.createElement('div');
      card.className = 'label-card';
      const svg = writer.write(it.text, 280, 280);
      svg.setAttribute('viewBox', `0 0 280 280`);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Código QR');
      card.innerHTML = `<div class="lc-code" style="${it.small ? 'font-size:1.05rem' : ''}">${esc(it.big)}</div>`;
      card.appendChild(svg);
      card.insertAdjacentHTML('beforeend', `<div class="lc-sub">${esc(it.sub)}</div>`);
      box.appendChild(card);
    }
  }
  return { html, mount };
}

/* ================= Instalar ================= */
export async function installScreen() {
  const html = `
    <div class="top">${backBtn()}<h1>Instalar AIP</h1></div>
    ${isInstalled() ? `<div class="banner ok">${icon('check', 26, 2.6)}<span class="grow"><b>Ya está instalada</b>Estás usando AIP como app.</span></div>` : `
      <button type="button" class="btn btn-big btn-primary btn-block" data-install ${install.prompt ? '' : 'hidden'}>${icon('download', 24)} Instalar ahora</button>
      <div class="card help gap12">
        <div><h3>En Android (Chrome)</h3><ol><li>Toca los tres puntos ⋮ arriba a la derecha.</li><li>Elige <b>"Instalar aplicación"</b> o <b>"Agregar a pantalla principal"</b>.</li><li>Confirma. Aparecerá el ícono de AIP.</li></ol></div>
        <div><h3>En iPhone (Safari)</h3><ol><li>Toca el botón Compartir (cuadrado con flecha).</li><li>Elige <b>"Agregar a inicio"</b>.</li></ol></div>
      </div>`}
  `;
  function mount(el) {
    wireBack(el, '/mas');
    const btn = el.querySelector('[data-install]');
    if (!btn) return;
    const show = () => { btn.hidden = !install.prompt; };
    document.addEventListener('aip-install-ready', show);
    btn.addEventListener('click', async () => {
      if (!install.prompt) return;
      install.prompt.prompt();
      await install.prompt.userChoice.catch(() => {});
      install.prompt = null;
      show();
    });
  }
  return { html, mount };
}

/* ================= Ayuda ================= */
export async function helpScreen() {
  const html = `
    <div class="top">${backBtn()}<h1>Cómo usar AIP</h1></div>
    <div class="card help gap12">
      <div><h3>1. Crea tus muebles</h3><p class="muted">En <b>Lugares</b> toca "Nuevo mueble". Ponle un nombre corto (A1, A2, C1…) y cuántas repisas tiene. Si tienes muchos, usa "Crear varios".</p></div>
      <div><h3>2. Agrega productos</h3><p class="muted">Toca el botón verde del centro y apunta al código de barras. Si el producto es nuevo, AIP te pide nombre, categoría, mueble y repisa, precios y cuántos tienes.</p></div>
      <div><h3>3. Vende</h3><p class="muted">Escanea el producto y toca <b>Vender</b>. Elige cuántos y confirma. El stock se descuenta solo. Si te equivocas, toca <b>Deshacer</b>.</p></div>
      <div><h3>4. Cuando llega mercadería</h3><p class="muted">Escanea y toca <b>Sumar stock</b>.</p></div>
      <div><h3>5. Avisos</h3><p class="muted">Cada producto tiene "Avisarme si quedan". Cuando baja de ese número aparece en la campana del inicio. Desde ahí armas la lista de compras y la envías por WhatsApp.</p></div>
      <div><h3>6. Respaldo</h3><p class="muted">Tus datos están solo en este teléfono. Una vez por semana ve a <b>Más → Enviar respaldo</b> y mándate el Excel por WhatsApp o Drive. Si cambias de teléfono, usa <b>Cargar desde Excel → Recuperar respaldo</b>.</p></div>
      <div><h3>¿Dónde está un producto?</h3><p class="muted">Escanéalo, o búscalo por nombre en <b>Productos</b>: verás "Mueble A1 · Repisa 2".</p></div>
    </div>
  `;
  return { html, mount: (el) => wireBack(el, '/mas') };
}
