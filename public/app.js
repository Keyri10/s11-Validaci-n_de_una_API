const state = {
  products: [],
  cart: [],
  submitting: false,
};

const productList = document.querySelector('[data-cy="product-list"]');
const cartItems = document.querySelector('[data-cy="cart-items"]');
const cartEmpty = document.querySelector('[data-cy="cart-empty"]');
const cartCount = document.querySelector('[data-cy="cart-count"]');
const orderSubtotal = document.querySelector('[data-cy="order-subtotal"]');
const orderTotal = document.querySelector('[data-cy="order-total"]');
const confirmButton = document.querySelector('[data-cy="confirm-order"]');
const errorMessage = document.querySelector('[data-cy="error-message"]');
const orderSuccess = document.querySelector('[data-cy="order-success"]');
const orderId = document.querySelector('[data-cy="order-id"]');
const orderTotalConfirmed = document.querySelector('[data-cy="order-total-confirmed"]');
const orderStatus = document.querySelector('[data-cy="order-status"]');
const navCount = document.querySelector('.nav-count');

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findProduct(productId) {
  return state.products.find((product) => product.id === productId);
}

function cartUnits() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotalCents() {
  return state.cart.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return sum + (product ? product.priceCents * item.quantity : 0);
  }, 0);
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('is-hidden');
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('is-hidden');
  orderSuccess.classList.add('is-hidden');
}

function hideSuccess() {
  orderId.textContent = '';
  orderTotalConfirmed.textContent = '';
  orderStatus.textContent = '';
  orderSuccess.classList.add('is-hidden');
}

function showSuccess(order) {
  orderId.textContent = order.code;
  orderTotalConfirmed.textContent = formatMoney(order.totalCents);
  orderStatus.textContent = 'Confirmado';
  orderSuccess.classList.remove('is-hidden');
  hideError();
}

function clearFeedback() {
  hideError();
  hideSuccess();
}

async function loadProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('No se pudieron cargar los productos.');
  }
  state.products = await response.json();
  renderProducts();
  renderCart();
}

function productArt(id) {
  if (id === 4) {
    return `
      <svg viewBox="0 0 120 84" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="38" ry="8" fill="#f6e4d2"></ellipse>
        <path d="M26 46h68v16a10 10 0 0 1-10 10H36a10 10 0 0 1-10-10V46Z" fill="#6b3a28"></path>
        <path d="M26 40c10 8 18 8 28 0s18-8 28 0 16 8 26 0v10H26V40Z" fill="#f3d3b4"></path>
        <circle cx="60" cy="34" r="5" fill="#c4534a"></circle>
      </svg>
    `;
  }

  const foam = id === 1 ? '#6f4632' : '#fff8f2';
  const heart = id === 2
    ? '<path d="M60 46c4-4 8-2 8 2 0 4-8 8-8 8s-8-4-8-8c0-4 4-6 8-2Z" fill="#e7b89a"></path>'
    : '';
  return `
    <svg viewBox="0 0 120 84" aria-hidden="true">
      <path d="M34 28h44l-4 38a10 10 0 0 1-10 8H48a10 10 0 0 1-10-8L34 28Z" fill="#f7ecdf"></path>
      <path d="M40 28h32c0 12-5 18-16 18S40 40 40 28Z" fill="${foam}"></path>
      ${heart}
      <path d="M78 38h10a8 8 0 0 1 0 16H76" fill="none" stroke="#f7ecdf" stroke-width="5" stroke-linecap="round"></path>
    </svg>
  `;
}

function renderProducts() {
  productList.innerHTML = state.products
    .map(
      (product) => `
        <article class="card" data-cy="product-card" data-product-id="${product.id}">
          <div class="card-art art-${product.id}">${productArt(product.id)}</div>
          <div class="card-copy">
            <h3 data-cy="product-name">${escapeHtml(product.name)}</h3>
            <p class="stock" data-cy="product-stock">Disponibles: ${product.stock}</p>
          </div>
          <div class="card-foot">
            <p class="price" data-cy="product-price">${formatMoney(product.priceCents)}</p>
            <button type="button" data-cy="add-product">Agregar al pedido</button>
          </div>
        </article>
      `
    )
    .join('');
}

function renderCart() {
  const totalCents = cartTotalCents();
  const units = cartUnits();
  cartCount.textContent = String(units);
  if (navCount) {
    navCount.textContent = String(units);
    navCount.classList.toggle('is-hidden', units === 0);
  }
  orderSubtotal.textContent = formatMoney(totalCents);
  orderTotal.textContent = formatMoney(totalCents);

  if (state.cart.length === 0) {
    cartItems.innerHTML = '';
    cartEmpty.classList.remove('is-hidden');
    return;
  }

  cartEmpty.classList.add('is-hidden');
  cartItems.innerHTML = state.cart
    .map((item) => {
      const product = findProduct(item.productId);
      const name = product ? product.name : 'Producto';
      const unit = product ? product.priceCents : 0;
      return `
        <li class="cart-item" data-cy="cart-item" data-product-id="${item.productId}">
          <div class="thumb art-${item.productId}" aria-hidden="true"></div>
          <div>
            <p class="cart-item-name" data-cy="cart-item-name">${escapeHtml(name)}</p>
            <p class="cart-item-unit">${formatMoney(unit)} c/u</p>
          </div>
          <p class="line-subtotal" data-cy="cart-item-subtotal">${formatMoney(unit * item.quantity)}</p>
          <div class="qty">
            <button type="button" data-cy="decrease-quantity" aria-label="Disminuir cantidad de ${escapeHtml(name)}">−</button>
            <span data-cy="cart-item-quantity">${item.quantity}</span>
            <button type="button" data-cy="increase-quantity" aria-label="Aumentar cantidad de ${escapeHtml(name)}">+</button>
          </div>
          <button type="button" class="linkish" data-cy="remove-item">Eliminar</button>
        </li>
      `;
    })
    .join('');
}

function productIdFrom(target) {
  const holder = target.closest('[data-product-id]');
  return holder ? Number(holder.dataset.productId) : null;
}

function addProduct(productId) {
  if (!findProduct(productId)) return;

  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) {
    if (existing.quantity >= 99) return;
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }

  clearFeedback();
  renderCart();
}

function changeQuantity(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  if (!item) return;

  const next = item.quantity + delta;
  if (next < 1) {
    removeProduct(productId);
    return;
  }
  if (next > 99) return;

  item.quantity = next;
  clearFeedback();
  renderCart();
}

function removeProduct(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  clearFeedback();
  renderCart();
}

async function submitOrder() {
  state.submitting = true;
  confirmButton.disabled = true;

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: state.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'No se pudo confirmar el pedido.');
      return;
    }

    showSuccess(data);
    state.cart = [];
    renderCart();

    try {
      await loadProducts();
    } catch (refreshError) {
      renderCart();
    }
  } catch (error) {
    showError('No se pudo contactar al servidor. Intenta de nuevo.');
  } finally {
    state.submitting = false;
    confirmButton.disabled = false;
  }
}

function confirmOrder() {
  if (state.submitting) return;

  if (state.cart.length === 0) {
    showError('Agrega al menos un producto antes de confirmar el pedido.');
    return;
  }

  hideError();
  hideSuccess();
  void submitOrder();
}

document.body.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.matches('[data-cy="add-product"]')) {
    addProduct(productIdFrom(button));
    return;
  }
  if (button.matches('[data-cy="increase-quantity"]')) {
    changeQuantity(productIdFrom(button), 1);
    return;
  }
  if (button.matches('[data-cy="decrease-quantity"]')) {
    changeQuantity(productIdFrom(button), -1);
    return;
  }
  if (button.matches('[data-cy="remove-item"]')) {
    removeProduct(productIdFrom(button));
    return;
  }
  if (button.matches('[data-cy="confirm-order"]')) {
    confirmOrder();
  }
});

loadProducts().catch(() => {
  productList.innerHTML = '';
  showError('No se pudieron cargar los productos. Recarga la página.');
});
