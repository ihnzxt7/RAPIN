'use strict';

/**
 * Rotas REST para /api/users
 *
 * GET    /api/users          — listar (paginação + busca + filtros)
 * GET    /api/users/:id      — buscar por ID
 * POST   /api/users          — criar
 * PATCH  /api/users/:id      — atualizar parcialmente
 * PUT    /api/users/:id      — atualizar completamente
 * DELETE /api/users/:id      — soft-delete (active: false)
 */

const router = require('express').Router();
const User   = require('../models/User');

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(500, parseInt(req.query.limit) || 100);
    const skip   = (page - 1) * limit;
    const search = req.query.search || '';
    const role   = req.query.role   || '';
    const turma  = req.query.turma  || '';

    // Construir filtro
    const filter = {};
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role)  filter.role  = role;
    if (turma) filter.turma = turma;

    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return res.json({
      data:  data.map(u => u.toJSON()),
      total,
      page,
      limit,
      table: 'users',
    });
  } catch (err) {
    console.error('[users GET /]', err);
    return res.status(500).json({ message: 'Erro ao listar usuários.' });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.json(user.toJSON());
  } catch (err) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, turma, subjects, special_needs,
            points, level, a11y_prefs } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
    }

    // Checar e-mail duplicado
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'E-mail já cadastrado.' });

    const user = await User.create({
      name, email, password,
      role:          role          || 'aluno',
      turma:         turma         || '',
      subjects:      subjects      || [],
      special_needs: special_needs || 'none',
      points:        points        || 0,
      level:         level         || 1,
      a11y_prefs:    a11y_prefs    || '',
      active: true,
    });

    return res.status(201).json(user.toJSON());
  } catch (err) {
    console.error('[users POST /]', err);
    if (err.code === 11000) return res.status(409).json({ message: 'E-mail já cadastrado.' });
    return res.status(500).json({ message: 'Erro ao criar usuário.' });
  }
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    // Não permitir alterar e-mail para um já existente
    if (req.body.email) {
      const dup = await User.findOne({
        email: req.body.email.toLowerCase().trim(),
        _id: { $ne: req.params.id },
      });
      if (dup) return res.status(409).json({ message: 'E-mail já em uso.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.json(user.toJSON());
  } catch (err) {
    console.error('[users PATCH /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true, overwrite: false }
    );
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.json(user.toJSON());
  } catch (err) {
    console.error('[users PUT /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    // Soft-delete: active = false
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { active: false } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.status(204).send();
  } catch (err) {
    console.error('[users DELETE /:id]', err);
    return res.status(500).json({ message: 'Erro ao remover usuário.' });
  }
});

module.exports = router;
