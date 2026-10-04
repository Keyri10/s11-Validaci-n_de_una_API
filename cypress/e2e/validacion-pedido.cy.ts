describe('Validación del pedido', () => {
  beforeEach(() => {
    cy.request('POST', '/api/test/reset', {}).its('status').should('eq', 200);
  });

  it('no crea una orden si el carrito está vacío', () => {
    const llamadas: string[] = [];

    cy.intercept('GET', '/api/products').as('productos');
    cy.intercept('POST', '/api/orders', (req) => {
      llamadas.push('POST /api/orders');
      req.continue();
    }).as('crearOrden');

    cy.visit('/');
    cy.wait('@productos');

    cy.get('[data-cy="cart-empty"]').should('be.visible').and('contain', 'Tu carrito está vacío');
    cy.get('[data-cy="confirm-order"]').click();

    cy.get('[data-cy="error-message"]')
      .should('be.visible')
      .and('have.text', 'Agrega al menos un producto antes de confirmar el pedido.');
    cy.get('[data-cy="order-success"]').should('not.be.visible');

    cy.then(() => {
      expect(llamadas, 'POST /api/orders no debe ejecutarse').to.deep.equal([]);
    });

    cy.request('/api/orders').its('body').should('deep.equal', []);
  });
});
