'use strict';

const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String, required: true, trim: true,
    },
    subject: {
      type: String,
      enum: ['matematica', 'portugues', 'historia', 'geografia', 'ciencias', 'ingles', 'artes', 'educacao_fis', ''],
      default: '',
    },
    turma: {
      type: String,
      enum: ['1ano', '2ano', '3ano', ''],
      default: '',
    },
    description: { type: String, default: '' },
    content:     { type: String, default: '' },

    // Recursos de acessibilidade
    simplified_text: { type: String, default: '' }, // def. intelectual
    transcript:      { type: String, default: '' }, // def. auditiva
    audio_desc:      { type: String, default: '' }, // def. visual
    video_url:       { type: String, default: '' },
    libras_url:      { type: String, default: '' },

    // Quiz: array de objetos { question, options:[{text}], correct }
    // Armazenado como JSON string para compatibilidade com o front-end
    quiz: { type: String, default: '[]' },

    // Autor
    author_id:   { type: String, default: '' },
    author_name: { type: String, default: '' },

    published: { type: Boolean, default: true },
    tags:      { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Índices ──────────────────────────────────────────────────────────────────
MaterialSchema.index({ subject: 1 });
MaterialSchema.index({ turma:   1 });
MaterialSchema.index({ published: 1 });
MaterialSchema.index({ title: 'text', description: 'text' }); // busca textual

// ─── Transformação JSON (renomear _id → id) ───────────────────────────────────
MaterialSchema.set('toJSON', {
  virtuals: false,
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Material', MaterialSchema);
