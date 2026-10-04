// Tokens ficticios solo para el laboratorio local de S11.
// No son cuentas reales y no deben usarse fuera de esta práctica.

const LAB_USERS = {
  'lab-token-autorizado': {
    id: 'ana-laboratorio',
    name: 'Ana Laboratorio',
    role: 'cliente',
  },
  'lab-token-sin-permiso': {
    id: 'luis-laboratorio',
    name: 'Luis Laboratorio',
    role: 'invitado',
  },
};

function userFromRequest(req) {
  const header = req.get('Authorization') || '';
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);

  if (!match) {
    return { status: 401, error: 'Falta el token de autenticación.' };
  }

  const user = LAB_USERS[match[1]];
  if (!user) {
    return { status: 401, error: 'El token no es válido.' };
  }

  return { user };
}

module.exports = {
  LAB_USERS,
  userFromRequest,
};
