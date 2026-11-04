// Exportar e importar el inventario como Excel (.xlsx) usando SheetJS.
import { db, uid, transact } from './db.js';
import { normalize, natCompare, todayKey } from './ui.js';

const TYPE_LABEL = { venta: 'Venta', entrada: 'Entrada', ajuste: 'Ajuste' };
const TYPE_FROM_LABEL = { venta: 'venta', entrada: 'entrada', ajuste: 'ajuste' };

function needXlsx() {
  if (!window.XLSX) throw new Error('El módulo de Excel aún no carga. Intenta de nuevo en unos segundos.');
  return window.XLSX;
}

function sheet(XLSX, rows, header, widths) {
  const ws = XLSX.utils.json_to_sheet(rows, { header });
  ws['!cols'] = widths.map((w) => ({ wch: w }));
  return ws;
}

export async function buildWorkbook() {
  const XLSX = needXlsx();
  const [products, categories, furniture, movements] = await Promise.all([
    db.all('products'), db.all('categories'), db.all('furniture'), db.all('movements'),
  ]);
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const furById = Object.fromEntries(furniture.map((f) => [f.id, f]));

  const prodRows = products
    .sort((a, b) => natCompare(a.name, b.name))
    .map((p) => ({
      'Código de barra': p.barcode || '',
      'Nombre': p.name,
      'Categoría': catById[p.categoryId]?.name || '',
      'Mueble': furById[p.furnitureId]?.code || '',
      'Repisa': p.shelf || '',
      'Costo': p.cost || 0,
      'Precio venta': p.price || 0,
      'Stock': p.stock || 0,
      'Avisar si quedan': p.minStock || 0,
      'Ganancia por unidad': (p.price || 0) - (p.cost || 0),
      'ID': p.id,
    }));
  const furRows = furniture
    .sort((a, b) => natCompare(a.code, b.code))
    .map((f) => ({ 'Código': f.code, 'Descripción': f.description || '', 'Repisas': f.shelves, 'ID': f.id }));
  const catRows = categories
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((c) => ({ 'Nombre': c.name, 'Color': c.color, 'Ícono': c.icon, 'ID': c.id }));
  const movRows = movements
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((m) => {
      const total = m.type === 'venta' ? m.qty * m.price : 0;
      return {
        'Fecha': new Date(m.date),
        'Tipo': TYPE_LABEL[m.type] || m.type,
        'Código de barra': m.barcode || '',
        'Producto': m.productName,
        'Cantidad': m.qty,
        'Precio': m.price,
        'Costo': m.cost,
        'Total venta': total,
        'Ganancia': m.type === 'venta' ? m.qty * (m.price - m.cost) : 0,
        'Stock antes': m.stockBefore,
        'Stock después': m.stockAfter,
        'ID producto': m.productId,
        'ID': m.id,
      };
    });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, prodRows,
    ['Código de barra', 'Nombre', 'Categoría', 'Mueble', 'Repisa', 'Costo', 'Precio venta', 'Stock', 'Avisar si quedan', 'Ganancia por unidad', 'ID'],
    [16, 32, 16, 9, 8, 10, 12, 8, 15, 18, 16]), 'Productos');
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, furRows, ['Código', 'Descripción', 'Repisas', 'ID'], [10, 28, 9, 16]), 'Muebles');
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, catRows, ['Nombre', 'Color', 'Ícono', 'ID'], [20, 10, 10, 16]), 'Categorías');
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, movRows,
    ['Fecha', 'Tipo', 'Código de barra', 'Producto', 'Cantidad', 'Precio', 'Costo', 'Total venta', 'Ganancia', 'Stock antes', 'Stock después', 'ID producto', 'ID'],
    [18, 9, 16, 30, 9, 10, 10, 12, 10, 11, 13, 16, 16]), 'Movimientos');
  return wb;
}

export async function backupFile() {
  const XLSX = needXlsx();
  const wb = await buildWorkbook();
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
  const name = `AIP-respaldo-${todayKey()}.xlsx`;
  const type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return { blob: new Blob([data], { type }), name, type };
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------------- Importar ---------------- */

// Busca la columna por nombre, sin importar mayúsculas ni tildes.
function pick(row, ...names) {
  const keys = Object.keys(row);
  for (const n of names) {
    const want = normalize(n);
    const k = keys.find((x) => normalize(x) === want);
    if (k !== undefined && row[k] !== '' && row[k] != null) return row[k];
  }
  return undefined;
}
const toInt = (v) => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return Math.round(v);
  const d = String(v).replace(/[^\d-]/g, '');
  return d ? parseInt(d, 10) : undefined;
};
const toStr = (v) => (v == null ? '' : String(v).trim());

function findSheet(wb, ...names) {
  const want = names.map(normalize);
  const n = wb.SheetNames.find((s) => want.includes(normalize(s)));
  return n ? wb.Sheets[n] : null;
}

export async function readExcel(file) {
  const XLSX = needXlsx();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const rowsOf = (ws) => (ws ? XLSX.utils.sheet_to_json(ws, { defval: '' }) : []);
  const prodSheet = findSheet(wb, 'Productos') || wb.Sheets[wb.SheetNames[0]];
  const data = {
    products: rowsOf(prodSheet),
    furniture: rowsOf(findSheet(wb, 'Muebles')),
    categories: rowsOf(findSheet(wb, 'Categorias', 'Categorías')),
    movements: rowsOf(findSheet(wb, 'Movimientos', 'Ventas')),
  };
  data.isFullBackup = data.furniture.length > 0 || data.categories.length > 0 || data.movements.length > 0;
  return data;
}

/**
 * mode = 'replace' : borra todo y deja exactamente lo del Excel (recuperar respaldo).
 * mode = 'merge'   : agrega productos nuevos y actualiza los que ya existen (por código o nombre).
 */
export async function importData(data, mode) {
  const now = new Date().toISOString();
  let categories = mode === 'replace' ? [] : await db.all('categories');
  let furniture = mode === 'replace' ? [] : await db.all('furniture');
  let products = mode === 'replace' ? [] : await db.all('products');
  const catByName = new Map(categories.map((c) => [normalize(c.name), c]));
  const furByCode = new Map(furniture.map((f) => [normalize(f.code), f]));
  const palette = ['blue', 'orange', 'purple', 'pink', 'green', 'amber', 'teal'];

  const ensureCat = (name, extra = {}) => {
    const key = normalize(name);
    if (!key) return null;
    let c = catByName.get(key);
    if (!c) {
      c = { id: extra.id || uid(), name: toStr(name), color: extra.color || palette[catByName.size % palette.length], icon: extra.icon || 'box', order: catByName.size };
      catByName.set(key, c);
    } else if (extra.color || extra.icon) {
      if (extra.color) c.color = extra.color;
      if (extra.icon) c.icon = extra.icon;
    }
    return c;
  };
  const ensureFur = (code, extra = {}) => {
    const key = normalize(code);
    if (!key) return null;
    let f = furByCode.get(key);
    if (!f) {
      f = { id: extra.id || uid(), code: toStr(code).toUpperCase(), description: extra.description || '', shelves: Math.max(1, extra.shelves || 1), createdAt: now };
      furByCode.set(key, f);
    } else {
      if (extra.description) f.description = extra.description;
      if (extra.shelves && extra.shelves > f.shelves) f.shelves = extra.shelves;
    }
    return f;
  };

  for (const r of data.categories) {
    ensureCat(pick(r, 'Nombre'), { id: toStr(pick(r, 'ID')) || undefined, color: toStr(pick(r, 'Color')) || undefined, icon: toStr(pick(r, 'Ícono', 'Icono')) || undefined });
  }
  for (const r of data.furniture) {
    ensureFur(pick(r, 'Código', 'Codigo', 'Mueble'), { id: toStr(pick(r, 'ID')) || undefined, description: toStr(pick(r, 'Descripción', 'Descripcion')), shelves: toInt(pick(r, 'Repisas', 'Pisos')) });
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const byCode = new Map(products.filter((p) => p.barcode).map((p) => [String(p.barcode), p]));
  const byName = new Map(products.map((p) => [normalize(p.name), p]));
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of data.products) {
    const name = toStr(pick(r, 'Nombre', 'Producto', 'Descripción'));
    const barcode = toStr(pick(r, 'Código de barra', 'Codigo de barra', 'Código', 'Codigo', 'EAN'));
    if (!name && !barcode) { skipped++; continue; }
    const id = toStr(pick(r, 'ID'));
    let p = (mode === 'replace' && id && byId.get(id)) || (barcode && byCode.get(barcode)) || (name && byName.get(normalize(name)));
    const isNew = !p;
    if (isNew) {
      p = { id: id || uid(), barcode: '', name: name || barcode, categoryId: null, furnitureId: null, shelf: null, cost: 0, price: 0, stock: 0, minStock: 0, createdAt: now };
    }
    if (name) p.name = name;
    if (barcode) p.barcode = barcode;
    const catName = pick(r, 'Categoría', 'Categoria');
    if (catName !== undefined) p.categoryId = ensureCat(catName)?.id || null;
    const shelf = toInt(pick(r, 'Repisa', 'Piso'));
    const furCode = pick(r, 'Mueble', 'Ubicación', 'Ubicacion');
    if (furCode !== undefined) {
      const f = ensureFur(furCode, { shelves: shelf });
      p.furnitureId = f?.id || null;
      p.shelf = f && shelf ? shelf : null;
    }
    const cost = toInt(pick(r, 'Costo', 'Precio costo', 'Precio compra'));
    const price = toInt(pick(r, 'Precio venta', 'Precio', 'Venta'));
    const stock = toInt(pick(r, 'Stock', 'Cantidad'));
    const min = toInt(pick(r, 'Avisar si quedan', 'Stock mínimo', 'Minimo'));
    if (cost !== undefined) p.cost = Math.max(0, cost);
    if (price !== undefined) p.price = Math.max(0, price);
    if (stock !== undefined) p.stock = Math.max(0, stock);
    if (min !== undefined) p.minStock = Math.max(0, min);
    p.updatedAt = now;
    byId.set(p.id, p);
    if (p.barcode) byCode.set(p.barcode, p);
    byName.set(normalize(p.name), p);
    isNew ? created++ : updated++;
  }

  const movements = [];
  if (mode === 'replace') {
    for (const r of data.movements) {
      const label = normalize(pick(r, 'Tipo'));
      const type = TYPE_FROM_LABEL[label];
      if (!type) continue;
      const d = pick(r, 'Fecha');
      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date)) continue;
      const pid = toStr(pick(r, 'ID producto'));
      const prod = byId.get(pid) || byCode.get(toStr(pick(r, 'Código de barra'))) || byName.get(normalize(pick(r, 'Producto')));
      movements.push({
        id: toStr(pick(r, 'ID')) || uid(),
        productId: prod ? prod.id : pid,
        productName: toStr(pick(r, 'Producto')),
        barcode: toStr(pick(r, 'Código de barra')),
        type,
        qty: toInt(pick(r, 'Cantidad')) || 0,
        price: toInt(pick(r, 'Precio')) || 0,
        cost: toInt(pick(r, 'Costo')) || 0,
        stockBefore: toInt(pick(r, 'Stock antes')) || 0,
        stockAfter: toInt(pick(r, 'Stock después', 'Stock despues')) || 0,
        date: date.toISOString(),
      });
    }
  }

  const stores = ['products', 'categories', 'furniture', 'movements'];
  await transact(stores, 'readwrite', (s) => {
    if (mode === 'replace') stores.forEach((n) => s[n].clear());
    catByName.forEach((c) => s.categories.put(c));
    furByCode.forEach((f) => s.furniture.put(f));
    byId.forEach((p) => s.products.put(p));
    movements.forEach((m) => s.movements.put(m));
  });
  return { created, updated, skipped, furniture: furByCode.size, categories: catByName.size, movements: movements.length };
}
