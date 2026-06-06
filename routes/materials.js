'use strict';

/**
 * Rotas REST para /api/materials
 *
 * GET    /api/materials          — listar (todos autenticados; professor filtra por suas disciplinas)
 * GET    /api/materials/:id      — buscar por ID (todos autenticados)
 * POST   /api/materials          — criar (apenas professor e gestor)
 * PATCH  /api/materials/:id      — atualizar (apenas o autor ou gestor)
 * PUT    /api/materials/:id      — atualizar completamente (apenas o autor ou gestor)
 * DELETE /api/materials/:id      — excluir (apenas o autor ou gestor)
 *
 * Regras de acesso:
 *   gestor    → acesso total
 *   professor → cria materiais; edita/apaga apenas os seus próprios
 *   aluno     → apenas leitura (GET)
 */

const router   = require('express').Router();
const Material = require('../models/Material');
const { authenticate, authorize } = require('../middleware/auth');

// ─── Helper: verifica se o usuário logado é o autor do material ou gestor ─────
async function requireOwnerOrGestor(req, res) {
  const material = await Material.findById(req.params.id);
  if (!material) {
    res.status(404).json({ message: 'Material não encontrado.' });
    return null;
  }

  const isOwner  = material.author_id === req.user.id;
  const isGestor = req.user.role === 'gestor';

  if (!isOwner && !isGestor) {
    res.status(403).json({
      message: 'Acesso negado. Você só pode modificar os seus próprios materiais.',
    });
    return null;
  }

  return material;
}

// ─── GET /api/materials ────────────────────────────────────────────────────────
// Todos os usuários autenticados podem listar materiais.
// Professor visualiza materiais de todas as disciplinas (pode filtrar pela sua).
// Aluno visualiza apenas materiais publicados.
router.get('/', authenticate, async (req, res) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(200, parseInt(req.query.limit) || 50);
    const skip      = (page - 1) * limit;
    const search    = req.query.search    || '';
    const subject   = req.query.subject   || '';
    const turma     = req.query.turma     || '';
    const published = req.query.published;

    const filter = {};

    // Aluno só vê materiais publicados da sua própria turma
    if (req.user.role === 'aluno') {
      const User = require('../models/User');
      const aluno = await User.findById(req.user.id).select('turma');
      filter.published = true;
      if (aluno?.turma) filter.turma = aluno.turma;
    } else if (published !== undefined) {
      // Gestor e professor podem filtrar por status de publicação
      filter.published = published === 'true';
    }

    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags:        { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (subject) filter.subject = subject;
    if (turma)   filter.turma   = turma;

    const [data, total] = await Promise.all([
      Material.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Material.countDocuments(filter),
    ]);

    return res.json({
      data:  data.map(m => m.toJSON()),
      total,
      page,
      limit,
      table: 'materials',
    });
  } catch (err) {
    console.error('[materials GET /]', err);
    return res.status(500).json({ message: 'Erro ao listar materiais.' });
  }
});

// ─── GET /api/materials/:id ────────────────────────────────────────────────────
// Todos os usuários autenticados podem buscar um material por ID.
// Aluno só pode acessar materiais publicados.
router.get('/:id', authenticate, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado.' });

    // Aluno não pode acessar material não publicado nem de outra turma
    if (req.user.role === 'aluno') {
      if (!material.published) {
        return res.status(403).json({ message: 'Este material não está disponível.' });
      }
      const User = require('../models/User');
      const aluno = await User.findById(req.user.id).select('turma');
      if (aluno?.turma && material.turma && material.turma !== aluno.turma) {
        return res.status(403).json({ message: 'Este material não pertence à sua turma.' });
      }
    }

    return res.json(material.toJSON());
  } catch (err) {
    return res.status(404).json({ message: 'Material não encontrado.' });
  }
});

// ─── POST /api/materials ───────────────────────────────────────────────────────
// Apenas professor e gestor podem criar materiais.
// O author_id e author_name são sempre definidos pelo servidor (usuário logado).
router.post('/', authenticate, authorize('professor', 'gestor'), async (req, res) => {
  try {
    const {
      title, subject, turma, description, content,
      simplified_text, transcript, audio_desc,
      video_url, libras_url, quiz,
      published, tags,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'O título do material é obrigatório.' });
    }

    // author_id e author_name sempre vêm do token (não do body)
    const User = require('../models/User');
    const autor = await User.findById(req.user.id);

    const material = await Material.create({
      title,
      subject:         subject         || '',
      turma:           turma           || '',
      description:     description     || '',
      content:         content         || '',
      simplified_text: simplified_text || '',
      transcript:      transcript      || '',
      audio_desc:      audio_desc      || '',
      video_url:       video_url       || '',
      libras_url:      libras_url      || '',
      quiz:            quiz            || '[]',
      author_id:       req.user.id,                      // sempre do token
      author_name:     autor?.name || req.user.id,       // sempre do token
      published:       published !== false,
      tags:            Array.isArray(tags) ? tags : [],
    });

    return res.status(201).json(material.toJSON());
  } catch (err) {
    console.error('[materials POST /]', err);
    return res.status(500).json({ message: 'Erro ao criar material.' });
  }
});

// ─── PATCH /api/materials/:id ──────────────────────────────────────────────────
// Apenas o autor do material ou o gestor podem editar.
router.patch('/:id', authenticate, authorize('professor', 'gestor'), async (req, res) => {
  try {
    const existing = await requireOwnerOrGestor(req, res);
    if (!existing) return; // resposta já enviada pelo helper

    // Proteger author_id e author_name de sobrescrita
    delete req.body.author_id;
    delete req.body.author_name;

    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    return res.json(material.toJSON());
  } catch (err) {
    console.error('[materials PATCH /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar material.' });
  }
});

// ─── PUT /api/materials/:id ────────────────────────────────────────────────────
// Apenas o autor ou gestor podem substituir o material completamente.
router.put('/:id', authenticate, authorize('professor', 'gestor'), async (req, res) => {
  try {
    const existing = await requireOwnerOrGestor(req, res);
    if (!existing) return;

    // Preservar autor original
    delete req.body.author_id;
    delete req.body.author_name;

    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    return res.json(material.toJSON());
  } catch (err) {
    console.error('[materials PUT /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar material.' });
  }
});

// ─── DELETE /api/materials/:id ─────────────────────────────────────────────────
// Apenas o autor do material ou o gestor podem excluir.
router.delete('/:id', authenticate, authorize('professor', 'gestor'), async (req, res) => {
  try {
    const existing = await requireOwnerOrGestor(req, res);
    if (!existing) return;

    await Material.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('[materials DELETE /:id]', err);
    return res.status(500).json({ message: 'Erro ao excluir material.' });
  }
});

module.exports = router;