'use strict';

/**
 * Rotas REST para /api/progress
 *
 * GET    /api/progress           — listar (filtro por user_id e/ou material_id)
 * GET    /api/progress/:id       — buscar por ID
 * POST   /api/progress           — criar (upsert pelo índice único user_id+material_id)
 * PATCH  /api/progress/:id       — atualizar parcialmente
 * DELETE /api/progress/:id       — excluir (hard delete, retorna 204)
 */

const router   = require('express').Router();
const Progress = require('../models/Progress');
const User     = require('../models/User');

// ─── GET /api/progress ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page        = Math.max(1, parseInt(req.query.page)  || 1);
    const limit       = Math.min(1000, parseInt(req.query.limit) || 100);
    const skip        = (page - 1) * limit;

    const user_id     = req.query.user_id     || '';
    const material_id = req.query.material_id || '';

    // ─── Filtro server-side ───────────────────────────────────────────────────
    const filter = {};
    if (user_id)     filter.user_id     = user_id;
    if (material_id) filter.material_id = material_id;

    const [data, total] = await Promise.all([
      Progress.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
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
router.get('/:id', async (req, res) => {
  try {
    const prog = await Progress.findById(req.params.id);
    if (!prog) return res.status(404).json({ message: 'Registro não encontrado.' });
    return res.json(prog.toJSON());
  } catch (err) {
    return res.status(404).json({ message: 'Registro não encontrado.' });
  }
});

// ─── POST /api/progress ───────────────────────────────────────────────────────
// Usa findOneAndUpdate com upsert para garantir unicidade user_id + material_id.
// Se o registro já existir, atualiza. Caso contrário, cria.
router.post('/', async (req, res) => {
  try {
    const {
      user_id, material_id, completed, score,
      max_score, attempts, last_attempt, answers,
    } = req.body;

    if (!user_id || !material_id) {
      return res.status(400).json({ message: 'user_id e material_id são obrigatórios.' });
    }

    // upsert garante que não haja duplicata e retorna o doc atualizado/criado
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

    // 201 se recém-criado (upserted), 200 se atualizado
    const statusCode = prog.createdAt?.getTime() === prog.updatedAt?.getTime() ? 201 : 200;
    return res.status(statusCode).json(prog.toJSON());
  } catch (err) {
    console.error('[progress POST /]', err);
    if (err.code === 11000) {
      // Corrida de dados — tentar apenas atualizar
      try {
        const { user_id, material_id } = req.body;
        const prog = await Progress.findOneAndUpdate(
          { user_id, material_id },
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
router.patch('/:id', async (req, res) => {
  try {
    const prog = await Progress.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!prog) return res.status(404).json({ message: 'Registro não encontrado.' });

    // Atualizar pontos do usuário se score foi alterado
    if (req.body.score !== undefined && req.body.user_id) {
      try {
        const user = await User.findById(req.body.user_id);
        if (user) {
          const earnedPoints = Math.round((req.body.score / Math.max(prog.max_score || 1, 1)) * 100);
          await User.findByIdAndUpdate(req.body.user_id, {
            $inc: { points: earnedPoints },
          });
        }
      } catch { /* pontos são opcionais — não bloquear a resposta */ }
    }

    return res.json(prog.toJSON());
  } catch (err) {
    console.error('[progress PATCH /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar progresso.' });
  }
});

// ─── DELETE /api/progress/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
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
