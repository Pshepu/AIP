// Base de datos local del teléfono (IndexedDB). Nada sale del dispositivo.
const DB_NAME = 'aip';
const DB_VERSION = 1;
export const STORES = ['products', 'categories', 'furniture', 'movements', 'settings'];

let dbPromise;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        const p = d.createObjectStore('products', { keyPath: 'id' });
        p.createIndex('barcode', 'barcode', { unique: false });
        d.createObjectStore('categories', { keyPath: 'id' });
        d.createObjectStore('furniture', { keyPath: 'id' });
        const m = d.createObjectStore('movements', { keyPath: 'id' });
        m.createIndex('productId', 'productId', { unique: false });
        d.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function reqP(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Ejecuta fn dentro de una transacción; fn recibe un objeto { store: ObjectStore }.
export async function transact(storeNames, mode, fn) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const t = d.transaction(storeNames, mode);
    const stores = {};
    for (const n of storeNames) stores[n] = t.objectStore(n);
    let result;
    Promise.resolve(fn(stores, reqP)).then((r) => { result = r; }, (e) => { try { t.abort(); } catch (_) {} reject(e); });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Operación cancelada'));
  });
}

export const db = {
  all: (store) => transact([store], 'readonly', (s) => reqP(s[store].getAll())),
  get: (store, id) => transact([store], 'readonly', (s) => reqP(s[store].get(id))),
  put: (store, obj) => transact([store], 'readwrite', (s) => reqP(s[store].put(obj))),
  del: (store, id) => transact([store], 'readwrite', (s) => reqP(s[store].delete(id))),
  clear: (store) => transact([store], 'readwrite', (s) => reqP(s[store].clear())),
  byIndex: (store, index, value) => transact([store], 'readonly', (s) => reqP(s[store].index(index).getAll(value))),
  bulkPut: (store, list) => transact([store], 'readwrite', (s) => { list.forEach((o) => s[store].put(o)); }),
  async getSetting(key, def = null) {
    const r = await db.get('settings', key);
    return r ? r.value : def;
  },
  setSetting: (key, value) => db.put('settings', { key, value }),
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Datos iniciales la primera vez que se abre la app.
export async function seedIfEmpty() {
  const done = await db.getSetting('seeded', false);
  if (done) return;
  const cats = [
    ['Abarrotes', 'orange', 'bag'],
    ['Bebidas', 'blue', 'cup'],
    ['Aseo', 'purple', 'sparkles'],
    ['Librería', 'pink', 'pencil'],
    ['Bazar', 'green', 'gift'],
    ['Dulces y snacks', 'amber', 'cookie'],
    ['Otros', 'gray', 'box'],
  ].map(([name, color, icon], i) => ({ id: uid() + i, name, color, icon, order: i }));
  await db.bulkPut('categories', cats);
  await db.setSetting('storeName', 'Mi Almacén');
  await db.setSetting('seeded', true);
}

// Movimientos de stock y ventas, siempre en una sola transacción.
export async function recordMovement(productId, type, qty, extra = {}) {
  return transact(['products', 'movements'], 'readwrite', async (s, r) => {
    const p = await r(s.products.get(productId));
    if (!p) throw new Error('Producto no encontrado');
    const before = p.stock || 0;
    let after = before;
    if (type === 'venta') after = Math.max(0, before - qty);
    else if (type === 'entrada') after = before + qty;
    else if (type === 'ajuste') after = Math.max(0, before + qty);
    p.stock = after;
    if (extra.newCost != null) p.cost = extra.newCost;
    p.updatedAt = new Date().toISOString();
    s.products.put(p);
    const mov = {
      id: uid(),
      productId,
      productName: p.name,
      barcode: p.barcode || '',
      type,
      qty,
      price: extra.price != null ? extra.price : (p.price || 0),
      cost: p.cost || 0,
      stockBefore: before,
      stockAfter: after,
      date: new Date().toISOString(),
    };
    s.movements.put(mov);
    return mov;
  });
}

// Deshace un movimiento (por ejemplo, una venta tocada por error).
export async function undoMovement(movId) {
  return transact(['products', 'movements'], 'readwrite', async (s, r) => {
    const m = await r(s.movements.get(movId));
    if (!m) return;
    const p = await r(s.products.get(m.productId));
    if (p) {
      p.stock = Math.max(0, (p.stock || 0) + (m.stockBefore - m.stockAfter));
      s.products.put(p);
    }
    s.movements.delete(movId);
  });
}
