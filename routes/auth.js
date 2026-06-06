'use strict';

/**
 * POST /api/auth/login  — autenticação, retorna { token, user }
 * GET  /api/auth/me     — retorna o usuário autenticado pelo token
 */

const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET  = process.env.JWT_SECRET  || 'rapin_secret_dev_2024';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), active: true });
    if (!user) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    // Payload inclui id e role — usados pelo middleware authorize()
    const payload = { id: user._id.toString(), role: user.role };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Rota protegida: usa o middleware authenticate para validar o token
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Usuário inativo ou não encontrado.' });
    }
    return res.json(user.toJSON());
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
});

module.exports = router;