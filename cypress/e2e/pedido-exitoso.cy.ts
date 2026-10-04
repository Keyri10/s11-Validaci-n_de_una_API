describe('Camino exitoso del pedido', () => {
  beforeEach(() => {
    cy.request('POST', '/api/test/reset', {}).its('status').should('eq', 200);
  });

  it('confirma el pedido, muestra el identificador y lo deja guardado', () => {
    cy.intercept('GET', '/api/products').as('productos');
    cy.intercept('POST', '/api/orders').as('crearOrden');

    cy.visit('/');

    cy.wait('@productos').its('response.statusCode').should('eq', 200);
    cy.get('[data-cy="product-card"]').should('have.length', 4);
    cy.get('[data-cy="cart-empty"]').should('be.visible');

    cy.contains('[data-cy="product-card"]', 'Café Americano').find('[data-cy="add-product"]').click();
    cy.contains('[data-cy="product-card"]', 'Cappuccino').find('[data-cy="add-product"]').click();
    cy.contains('[data-cy="cart-item"]', 'Cappuccino').find('[data-cy="increase-quantity"]').click();

    cy.contains('[data-cy="cart-item"]', 'Cappuccino')
      .find('[data-cy="cart-item-quantity"]')
      .should('have.text', '2');
    cy.get('[data-cy="cart-count"]').should('have.text', '3');
    cy.get('[data-cy="order-subtotal"]').should('have.text', '$125.00');
    cy.get('[data-cy="order-total"]').should('have.text', '$125.00');

    cy.get('[data-cy="confirm-order"]').click();

    cy.wait('@crearOrden').should((interception) => {
      expect(interception.request.body.items).to.deep.equal([
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 2 },
      ]);
      expect(interception.response?.statusCode).to.eq(201);
      const body = interception.response?.body;
      expect(body.code).to.match(/^ORD-\d+$/);
      expect(body.id).to.be.a('number');
      expect(body.totalCents).to.eq(12500);
      expect(body.status).to.eq('confirmed');
      expect(body.items).to.have.length(2);
    });

    cy.get('@crearOrden')
      .its('response.body')
      .then((orden) => {
        cy.get('[data-cy="order-success"]').should('be.visible');
        cy.get('[data-cy="order-id"]').should('have.text', orden.code);
        cy.get('[data-cy="order-total-confirmed"]').should('have.text', '$125.00');
        cy.get('[data-cy="order-status"]').should('have.text', 'Confirmado');
        cy.get('[data-cy="error-message"]').should('not.be.visible');

        cy.request(`/api/orders/${orden.id}`).then((respuesta) => {
          expect(respuesta.status).to.eq(200);
          expect(respuesta.body.code).to.eq(orden.code);
          expect(respuesta.body.totalCents).to.eq(12500);
          expect(respuesta.body.items).to.have.length(2);
        });

        cy.request('/api/products').then((respuesta) => {
          const americano = respuesta.body.find(
            (producto: { name: string; stock: number }) => producto.name === 'Café Americano'
          );
          const cappuccino = respuesta.body.find(
            (producto: { name: string; stock: number }) => producto.name === 'Cappuccino'
          );
          expect(americano.stock).to.eq(19);
          expect(cappuccino.stock).to.eq(13);
        });
      });
  });
});
