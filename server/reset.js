const db = require('./db');

db.initDatabase();
const result = db.resetDatabase();

console.log('Datos de prueba reiniciados.');
console.log(`Productos: ${result.products.length}. Órdenes: ${result.orders}.`);
for (const product of result.products) {
  const price = (product.priceCents / 100).toFixed(2);
  console.log(`- ${product.name}: $${price}, stock ${product.stock}`);
}
