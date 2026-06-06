'use strict';

/**
 * Rotas REST para /api/users
 *
 * GET    /api/users              — listar usuários (com filtros por role)
 * GET    /api/users/meus-alunos  — professor: alunos das suas disciplinas/turmas
 * GET    /api/users/:id          — buscar por ID
 * POST   /api/users              — criar (apenas gestor)
 * PATCH  /api/users/:id          — atualizar parcialmente
 * PUT    /api/users/:id          — atualizar completamente
 * DELETE /api/users/:id          — soft-delete (apenas gestor)
 *
 * Regras de acesso:
 *   gestor    → acesso total
 *   professor → lê lista de alunos (filtrada); edita apenas a si mesmo
 *   aluno     → lê apenas a si mesmo; edita apenas a si mesmo
 */

const router = require('express').Router();
const User   = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(500, parseInt(req.query.limit) || 100);
    const skip   = (page - 1) * limit;
    const search = req.query.search || '';
    const role   = req.query.role   || '';
    const turma  = req.query.turma  || '';

    const filter = {};

    // ── Restrições por perfil ──────────────────────────────────────────────
    if (req.user.role === 'aluno') {
      // Aluno só vê a si mesmo
      filter._id = req.user.id;

    } else if (req.user.role === 'professor') {
      // Professor só vê alunos ativos
      filter.role   = 'aluno';
      filter.active = true;

    } else {
      // Gestor: aplica filtros livres da query string
      if (role)  filter.role  = role;
      if (turma) filter.turma = turma;
    }

    // Busca textual (nome ou e-mail)
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

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

// ─── GET /api/users/meus-alunos ───────────────────────────────────────────────
// Exclusivo para professores: retorna os alunos vinculados às suas turmas/disciplinas.
// A vinculação é feita pelo campo `subjects` do professor (array de disciplinas)
// e pelo campo `turma` dos alunos. Adapte conforme a lógica do seu negócio.
router.get('/meus-alunos', authenticate, authorize('professor', 'gestor'), async (req, res) => {
  try {
    const professor = await User.findById(req.user.id);
    if (!professor) {
      return res.status(404).json({ message: 'Professor não encontrado.' });
    }

    // Filtro base: apenas alunos ativos
    const filter = { role: 'aluno', active: true };

    // Se o professor tiver turmas cadastradas no campo `subjects`,
    // filtra alunos dessas turmas. Se `subjects` estiver vazio, retorna todos os alunos.
    // Ajuste este trecho conforme o modelo de turmas do seu projeto.
    // Exemplo: se professor.subjects = ['matematica', 'ciencias'] e você quiser
    // filtrar por turma, troque por: filter.turma = { $in: professor.turmas }

    const search = req.query.search || '';
    const turma  = req.query.turma  || '';

    if (turma)  filter.turma = turma;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const alunos = await User.find(filter).sort({ name: 1 });

    return res.json({
      data:       alunos.map(u => u.toJSON()),
      total:      alunos.length,
      professor:  professor.name,
      disciplinas: professor.subjects,
    });
  } catch (err) {
    console.error('[users GET /meus-alunos]', err);
    return res.status(500).json({ message: 'Erro ao buscar alunos.' });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Aluno só pode ver a si mesmo
    if (req.user.role === 'aluno' && req.params.id !== req.user.id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.json(user.toJSON());
  } catch (err) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
// Criação de usuários: apenas gestor
router.post('/', authenticate, authorize('gestor'), async (req, res) => {
  try {
    const { name, email, password, role, turma, subjects, special_needs,
            points, level, a11y_prefs } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
    }

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
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const isSelf   = req.params.id === req.user.id;
    const isGestor = req.user.role === 'gestor';

    // Professor e aluno só podem editar a si mesmos
    if (!isSelf && !isGestor) {
      return res.status(403).json({ message: 'Acesso negado. Você só pode editar o seu próprio perfil.' });
    }

    // Apenas gestor pode alterar o role de um usuário
    if (!isGestor) {
      delete req.body.role;
      delete req.body.active; // apenas gestor ativa/desativa contas
    }

    // Verificar e-mail duplicado
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
router.put('/:id', authenticate, async (req, res) => {
  try {
    const isSelf   = req.params.id === req.user.id;
    const isGestor = req.user.role === 'gestor';

    if (!isSelf && !isGestor) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    if (!isGestor) {
      delete req.body.role;
      delete req.body.active;
    }

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
// Soft-delete: apenas gestor
router.delete('/:id', authenticate, authorize('gestor'), async (req, res) => {
  try {
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