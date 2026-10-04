const path = require('path');
const express = require('express');
const db = require('./db');
const auth = require('./auth');

const app = express();
const port = Number(process.env.PORT) || 3000;
const MAX_PAGE_LIMIT = 20;

db.initDatabase();

app.use(express.json());

app.get('/api/products', (req, res) => {
  res.json(db.listProducts());
});

app.get('/api/productos', (req, res) => {
  const parsed = readPageLimit(req.query);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  res.json(db.listProductsPage(parsed.page, parsed.limit));
});

app.get('/api/orders', (req, res) => {
  res.json(db.listOrders());
});

app.get('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'El identificador de la orden no es válido.' });
    return;
  }

  const order = db.getOrderById(id);
  if (!order) {
    res.status(404).json({ error: 'No se encontró la orden.' });
    return;
  }

  res.json(order);
});

app.post('/api/orders', (req, res) => {
  try {
    const order = db.createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/pedidos', (req, res) => {
  const user = requireCliente(req, res);
  if (!user) return;

  try {
    const order = db.createOrder(req.body, user.id);
    res.status(201).json(order);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/pedidos/:id', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const id = readOrderId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'El identificador del pedido no es válido.' });
    return;
  }

  const order = db.getOrderById(id);
  if (!order) {
    res.status(404).json({ error: 'No se encontró el pedido.' });
    return;
  }
  if (order.owner !== user.id) {
    res.status(403).json({ error: 'No puedes consultar un pedido de otro usuario.' });
    return;
  }

  res.json(order);
});

app.put('/api/pedidos/:id/estado', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const id = readOrderId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'El identificador del pedido no es válido.' });
    return;
  }

  const order = db.getOrderById(id);
  if (!order) {
    res.status(404).json({ error: 'No se encontró el pedido.' });
    return;
  }
  if (order.owner !== user.id) {
    res.status(403).json({ error: 'No puedes modificar un pedido de otro usuario.' });
    return;
  }

  try {
    const updated = db.updateOrderStatus(id, req.body && req.body.status);
    res.json(updated);
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/test/reset', (req, res) => {
  try {
    res.json(db.resetDatabase());
  } catch (error) {
    sendError(res, error);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

function requireUser(req, res) {
  const result = auth.userFromRequest(req);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return null;
  }
  return result.user;
}

function requireCliente(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'cliente') {
    res.status(403).json({ error: 'No tienes permiso para crear pedidos.' });
    return null;
  }
  return user;
}

function readOrderId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function readPageLimit(query) {
  const page = readQueryInt(query.page, 1);
  const limit = readQueryInt(query.limit, 5);

  if (!page || page < 1) {
    return { error: 'La página debe ser un entero mayor o igual que 1.' };
  }
  if (!limit || limit < 1 || limit > MAX_PAGE_LIMIT) {
    return { error: `El límite debe ser un entero entre 1 y ${MAX_PAGE_LIMIT}.` };
  }

  return { page, limit };
}

function readQueryInt(value, fallback) {
  if (value === undefined) return fallback;
  if (Array.isArray(value)) return null;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  return Number(value);
}

function sendError(res, error) {
  if (error && error.status) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

if (require.main === module) {
  const server = app.listen(port, () => {
    console.log(`Cafetería S10 escuchando en http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${port} ya está en uso.`);
      process.exit(1);
    }
    console.error(error);
    process.exit(1);
  });
}

module.exports = app;
