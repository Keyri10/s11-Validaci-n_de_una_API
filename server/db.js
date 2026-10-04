const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'cafeteria.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const SEED_PRODUCTS = [
  { id: 1, name: 'Café Americano', priceCents: 3500, stock: 20 },
  { id: 2, name: 'Cappuccino', priceCents: 4500, stock: 15 },
  { id: 3, name: 'Latte', priceCents: 4800, stock: 10 },
  { id: 4, name: 'Pastel de chocolate', priceCents: 5500, stock: 2 },
];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      stock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      owner TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    );
  `);
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    stock: row.stock,
  };
}

function mapOrder(order, items) {
  return {
    id: order.id,
    code: `ORD-${order.id}`,
    totalCents: order.total_cents,
    total: (order.total_cents / 100).toFixed(2),
    status: order.status,
    owner: order.owner,
    createdAt: order.created_at,
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      subtotalCents: item.unit_price_cents * item.quantity,
    })),
  };
}

function listProducts() {
  return db
    .prepare('SELECT id, name, price_cents, stock FROM products ORDER BY id')
    .all()
    .map(mapProduct);
}

function getOrderById(id) {
  const order = db
    .prepare('SELECT id, total_cents, created_at, status, owner FROM orders WHERE id = ?')
    .get(id);
  if (!order) return null;

  const items = db
    .prepare(
      `SELECT product_id, product_name, quantity, unit_price_cents
       FROM order_items
       WHERE order_id = ?
       ORDER BY id`
    )
    .all(id);

  return mapOrder(order, items);
}

function listOrders() {
  return db
    .prepare('SELECT id FROM orders ORDER BY id')
    .all()
    .map((row) => getOrderById(row.id));
}

function seedProducts() {
  const insert = db.prepare(
    'INSERT INTO products (id, name, price_cents, stock) VALUES (@id, @name, @priceCents, @stock)'
  );
  for (const product of SEED_PRODUCTS) {
    insert.run(product);
  }
}

function resetAutoincrement() {
  const sequence = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'")
    .get();
  if (!sequence) return;
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('orders', 'order_items')").run();
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function initDatabase() {
  createSchema();
  ensureColumn('orders', 'status', "TEXT NOT NULL DEFAULT 'confirmed'");
  ensureColumn('orders', 'owner', 'TEXT');
  const count = db.prepare('SELECT COUNT(*) AS total FROM products').get().total;
  if (count === 0) seedProducts();
}

function resetDatabase() {
  const reset = db.transaction(() => {
    db.exec('DELETE FROM order_items');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM products');
    resetAutoincrement();
    seedProducts();
  });

  reset();

  return {
    ok: true,
    orders: 0,
    products: listProducts(),
  };
}

function normalizeItems(payload) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new HttpError(400, 'El pedido no puede estar vacío.');
  }

  const merged = new Map();

  for (const item of payload.items) {
    const productId = Number(item && item.productId);
    const quantity = Number(item && item.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new HttpError(400, 'El producto del pedido no es válido.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, 'La cantidad debe ser un entero mayor que cero.');
    }

    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}

function createOrder(payload, owner = null) {
  const items = normalizeItems(payload);

  const insertOrder = db.transaction((lines) => {
    const resolved = [];
    let totalCents = 0;

    for (const line of lines) {
      const product = db
        .prepare('SELECT id, name, price_cents, stock FROM products WHERE id = ?')
        .get(line.productId);

      if (!product) {
        throw new HttpError(400, 'Uno de los productos no existe.');
      }
      if (line.quantity > product.stock) {
        throw new HttpError(
          409,
          `No hay suficientes existencias de ${product.name}. Disponibles: ${product.stock}.`
        );
      }

      totalCents += product.price_cents * line.quantity;
      resolved.push({ product, quantity: line.quantity });
    }

    const info = db
      .prepare('INSERT INTO orders (total_cents, created_at, status, owner) VALUES (?, ?, ?, ?)')
      .run(totalCents, new Date().toISOString(), 'confirmed', owner);
    const orderId = Number(info.lastInsertRowid);

    const insertItem = db.prepare(
      `INSERT INTO order_items
        (order_id, product_id, product_name, quantity, unit_price_cents)
       VALUES (?, ?, ?, ?, ?)`
    );
    const updateStock = db.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?'
    );

    for (const line of resolved) {
      const updated = updateStock.run(line.quantity, line.product.id, line.quantity);
      if (updated.changes !== 1) {
        throw new HttpError(
          409,
          `No hay suficientes existencias de ${line.product.name}. Disponibles: ${line.product.stock}.`
        );
      }
      insertItem.run(
        orderId,
        line.product.id,
        line.product.name,
        line.quantity,
        line.product.price_cents
      );
    }

    return getOrderById(orderId);
  });

  return insertOrder(items);
}

const ORDER_STATUSES = ['confirmed', 'preparando', 'listo'];

function listProductsPage(page, limit) {
  const total = db.prepare('SELECT COUNT(*) AS total FROM products').get().total;
  const data = db
    .prepare(
      'SELECT id, name, price_cents, stock FROM products ORDER BY id LIMIT ? OFFSET ?'
    )
    .all(limit, (page - 1) * limit)
    .map(mapProduct);

  return {
    data,
    page,
    limit,
    total,
    count: data.length,
  };
}

function updateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new HttpError(400, 'El estado no es válido. Usa confirmed, preparando o listo.');
  }

  const current = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
  if (!current) {
    throw new HttpError(404, 'No se encontró el pedido.');
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  return getOrderById(id);
}

module.exports = {
  SEED_PRODUCTS,
  ORDER_STATUSES,
  initDatabase,
  resetDatabase,
  listProducts,
  listProductsPage,
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
};
