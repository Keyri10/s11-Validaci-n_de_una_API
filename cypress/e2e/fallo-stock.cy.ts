describe('Fallo controlado por falta de existencias', () => {
  const mensajeStock = 'No hay suficientes existencias de Pastel de chocolate. Disponibles: 2.';

  beforeEach(() => {
    cy.request('POST', '/api/test/reset', {}).its('status').should('eq', 200);
  });

  it('muestra el error de stock y permite confirmar después con una cantidad válida', () => {
    cy.intercept('GET', '/api/products').as('productos');
    cy.intercept('POST', '/api/orders').as('crearOrden');

    cy.visit('/');
    cy.wait('@productos');

    cy.contains('[data-cy="product-card"]', 'Pastel de chocolate')
      .find('[data-cy="product-stock"]')
      .should('contain', 'Disponibles: 2');

    cy.contains('[data-cy="product-card"]', 'Pastel de chocolate').find('[data-cy="add-product"]').click();
    cy.contains('[data-cy="cart-item"]', 'Pastel de chocolate').find('[data-cy="increase-quantity"]').click();
    cy.contains('[data-cy="cart-item"]', 'Pastel de chocolate').find('[data-cy="increase-quantity"]').click();
    cy.contains('[data-cy="cart-item"]', 'Pastel de chocolate')
      .find('[data-cy="cart-item-quantity"]')
      .should('have.text', '3');

    cy.get('[data-cy="confirm-order"]').click();

    cy.wait('@crearOrden').should((interception) => {
      expect(interception.response?.statusCode).to.eq(409);
      expect(interception.response?.body.error).to.eq(mensajeStock);
    });

    cy.get('[data-cy="error-message"]').should('be.visible').and('have.text', mensajeStock);
    cy.get('[data-cy="order-success"]').should('not.be.visible');
    cy.get('[data-cy="confirm-order"]').should('be.enabled');
    cy.request('/api/orders').its('body').should('deep.equal', []);

    cy.contains('[data-cy="cart-item"]', 'Pastel de chocolate').find('[data-cy="decrease-quantity"]').click();
    cy.contains('[data-cy="cart-item"]', 'Pastel de chocolate')
      .find('[data-cy="cart-item-quantity"]')
      .should('have.text', '2');

    cy.get('[data-cy="confirm-order"]').click();

    cy.wait('@crearOrden').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      const orden = interception.response?.body;
      expect(orden.totalCents).to.eq(11000);
      expect(orden.code).to.match(/^ORD-\d+$/);

      cy.get('[data-cy="error-message"]').should('not.be.visible');
      cy.get('[data-cy="order-success"]').should('be.visible');
      cy.get('[data-cy="order-id"]').should('have.text', orden.code);
      cy.get('[data-cy="order-total-confirmed"]').should('have.text', '$110.00');
      cy.contains('[data-cy="product-card"]', 'Pastel de chocolate')
        .find('[data-cy="product-stock"]')
        .should('contain', 'Disponibles: 0');

      cy.request('/api/orders').then((respuesta) => {
        expect(respuesta.body).to.have.length(1);
        expect(respuesta.body[0].code).to.eq(orden.code);
        expect(respuesta.body[0].totalCents).to.eq(11000);
      });
    });
  });
});
