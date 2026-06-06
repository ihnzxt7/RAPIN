'use strict';

/**
 * Rotas REST para /api/progress
 *
 * GET    /api/progress           — listar progresso (filtrado por perfil)
 * GET    /api/progress/:id       — buscar por ID
 * POST   /api/progress           — criar / upsert (aluno registra o próprio progresso)
 * PATCH  /api/progress/:id       — atualizar parcialmente
 * DELETE /api/progress/:id       — excluir (apenas gestor)
 *
 * Regras de acesso:
 *   gestor    → acesso total
 *   professor → lê progresso de qualquer aluno (para acompanhar desempenho)
 *   aluno     → lê e grava apenas o próprio progresso
 */

const router   = require('express').Router();
const Progress = require('../models/Progress');
const User     = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// ─── GET /api/progress ────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const page        = Math.max(1, parseInt(req.query.page)  || 1);
    const limit       = Math.min(1000, parseInt(req.query.limit) || 100);
    const skip        = (page - 1) * limit;
    const material_id = req.query.material_id || '';
    let   user_id     = req.query.user_id     || '';

    const filter = {};

    // Aluno só pode ver o próprio progresso — ignorar user_id da query
    if (req.user.role === 'aluno') {
      filter.user_id = req.user.id;
    } else {
      // Gestor e professor podem filtrar por user_id específico
      if (user_id) filter.user_id = user_id;
    }

    if (material_id) filter.material_id = material_id;

    const [data, total] = await Promise.all([
      Progress.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Progress.countDocuments(filter),
    ]);

    return res.json({
      data:  data.map(p => p.toJSON()),
      total,
      page,
      limit,
      table: 'progress',
    });
  } catch (err) {
    console.error('[progress GET /]', err);
    return res.status(500).json({ message: 'Erro ao listar progresso.' });
  }
});

// ─── GET /api/progress/:id ────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const prog = await Progress.findById(req.params.id);
    if (!prog) return res.status(404).json({ message: 'Registro não encontrado.' });

    // Aluno só pode ver o próprio registro
    if (req.user.role === 'aluno' && prog.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    return res.json(prog.toJSON());
  } catch (err) {
    return res.status(404).json({ message: 'Registro não encontrado.' });
  }
});

// ─── POST /api/progress ───────────────────────────────────────────────────────
// Aluno só pode registrar o próprio progresso.
// Professor e gestor podem registrar progresso de qualquer aluno (uso administrativo).
router.post('/', authenticate, async (req, res) => {
  try {
    let {
      user_id, material_id, completed, score,
      max_score, attempts, last_attempt, answers,
    } = req.body;

    if (!material_id) {
      return res.status(400).json({ message: 'material_id é obrigatório.' });
    }

    // Aluno sempre grava o próprio progresso — ignorar user_id do body
    if (req.user.role === 'aluno') {
      user_id = req.user.id;
    }

    if (!user_id) {
      return res.status(400).json({ message: 'user_id é obrigatório.' });
    }

    // Professor não pode gravar progresso de outro professor ou gestor
    if (req.user.role === 'professor') {
      const alvo = await User.findById(user_id);
      if (alvo && alvo.role !== 'aluno') {
        return res.status(403).json({ message: 'Professor só pode registrar progresso de alunos.' });
      }
    }

    const prog = await Progress.findOneAndUpdate(
      { user_id, material_id },
      {
        $set: {
          completed:    completed    !== undefined ? completed    : false,
          score:        score        !== undefined ? score        : 0,
          max_score:    max_score    !== undefined ? max_score    : 0,
          attempts:     attempts     !== undefined ? attempts     : 1,
          last_attempt: last_attempt || new Date().toISOString(),
          answers:      answers      || '[]',
        },
        $setOnInsert: { user_id, material_id },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const statusCode = prog.createdAt?.getTime() === prog.updatedAt?.getTime() ? 201 : 200;
    return res.status(statusCode).json(prog.toJSON());
  } catch (err) {
    console.error('[progress POST /]', err);
    if (err.code === 11000) {
      try {
        const { user_id: uid, material_id: mid } = req.body;
        const userId = req.user.role === 'aluno' ? req.user.id : uid;
        const prog = await Progress.findOneAndUpdate(
          { user_id: userId, material_id: mid },
          { $set: req.body },
          { new: true }
        );
        return res.json(prog.toJSON());
      } catch (e) {
        return res.status(500).json({ message: 'Erro ao salvar progresso.' });
      }
    }
    return res.status(500).json({ message: 'Erro ao salvar progresso.' });
  }
});

// ─── PATCH /api/progress/:id ──────────────────────────────────────────────────
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const prog = await Progress.findById(req.params.id);
    if (!prog) return res.status(404).json({ message: 'Registro não encontrado.' });

    // Aluno só pode atualizar o próprio progresso
    if (req.user.role === 'aluno' && prog.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    // Impedir sobrescrita de user_id e material_id
    delete req.body.user_id;
    delete req.body.material_id;

    const updated = await Progress.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // Atualizar pontos do usuário se score foi alterado
    if (req.body.score !== undefined) {
      try {
        const user = await User.findById(prog.user_id);
        if (user) {
          const earnedPoints = Math.round((req.body.score / Math.max(updated.max_score || 1, 1)) * 100);
          await User.findByIdAndUpdate(prog.user_id, { $inc: { points: earnedPoints } });
        }
      } catch { /* pontos são opcionais — não bloquear a resposta */ }
    }

    return res.json(updated.toJSON());
  } catch (err) {
    console.error('[progress PATCH /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar progresso.' });
  }
});

// ─── DELETE /api/progress/:id ─────────────────────────────────────────────────
// Apenas gestor pode excluir registros de progresso
router.delete('/:id', authenticate, authorize('gestor'), async (req, res) => {
  try {
    const prog = await Progress.findByIdAndDelete(req.params.id);
    if (!prog) return res.status(404).json({ message: 'Registro não encontrado.' });
    return res.status(204).send();
  } catch (err) {
    console.error('[progress DELETE /:id]', err);
    return res.status(500).json({ message: 'Erro ao excluir progresso.' });
  }
});

module.exports = router;