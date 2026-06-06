'use strict';

/**
 * RAPIN — Middleware de Autenticação e Autorização
 *
 * authenticate : verifica o JWT e injeta req.user = { id, role }
 * authorize    : restringe o acesso a roles específicos
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rapin_secret_dev_2024';

// ─── authenticate ─────────────────────────────────────────────────────────────
// Verifica o Bearer token no header Authorization.
// Em caso de sucesso, popula req.user = { id, role } e chama next().
// Em caso de falha, retorna 401.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido. Faça login novamente.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

// ─── authorize ────────────────────────────────────────────────────────────────
// Middleware factory — permite apenas os roles listados.
// Deve ser usado APÓS authenticate.
// Exemplo: router.post('/', authenticate, authorize('professor', 'gestor'), handler)
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Acesso negado. Esta ação requer um dos seguintes perfis: ${roles.join(', ')}.`,
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };