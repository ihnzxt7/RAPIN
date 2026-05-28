'use strict';

/**
 * Rotas REST para /api/materials
 *
 * GET    /api/materials          — listar (paginação + busca textual + filtros)
 * GET    /api/materials/:id      — buscar por ID
 * POST   /api/materials          — criar
 * PATCH  /api/materials/:id      — atualizar parcialmente
 * PUT    /api/materials/:id      — atualizar completamente
 * DELETE /api/materials/:id      — exclusão real (hard delete)
 */

const router   = require('express').Router();
const Material = require('../models/Material');

// ─── GET /api/materials ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(200, parseInt(req.query.limit) || 50);
    const skip      = (page - 1) * limit;

    const search    = req.query.search    || '';
    const subject   = req.query.subject   || '';
    const turma     = req.query.turma     || '';
    const published = req.query.published;  // 'true' | 'false' | undefined

    // ─── Filtro dinâmico ─────────────────────────────────────────────────────
    const filter = {};

    if (search) {
      // Busca textual nos campos indexados (title + description)
      // Fallback para regex caso o índice text não esteja ativo
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags:        { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (subject)   filter.subject   = subject;
    if (turma)     filter.turma     = turma;

    if (published !== undefined) {
      filter.published = published === 'true';
    }

    const [data, total] = await Promise.all([
      Material.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
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
router.get('/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado.' });
    return res.json(material.toJSON());
  } catch (err) {
    return res.status(404).json({ message: 'Material não encontrado.' });
  }
});

// ─── POST /api/materials ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      title, subject, turma, description, content,
      simplified_text, transcript, audio_desc,
      video_url, libras_url, quiz,
      author_id, author_name, published, tags,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'O título do material é obrigatório.' });
    }

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
      author_id:       author_id       || '',
      author_name:     author_name     || '',
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
router.patch('/:id', async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ message: 'Material não encontrado.' });
    return res.json(material.toJSON());
  } catch (err) {
    console.error('[materials PATCH /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar material.' });
  }
});

// ─── PUT /api/materials/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ message: 'Material não encontrado.' });
    return res.json(material.toJSON());
  } catch (err) {
    console.error('[materials PUT /:id]', err);
    return res.status(500).json({ message: 'Erro ao atualizar material.' });
  }
});

// ─── DELETE /api/materials/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado.' });
    return res.status(204).send();
  } catch (err) {
    console.error('[materials DELETE /:id]', err);
    return res.status(500).json({ message: 'Erro ao excluir material.' });
  }
});

module.exports = router;
