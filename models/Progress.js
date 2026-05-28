'use strict';

const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema(
  {
    user_id:     { type: String, required: true },
    material_id: { type: String, required: true },
    completed:   { type: Boolean, default: false },
    score:       { type: Number, default: 0, min: 0 },
    max_score:   { type: Number, default: 0, min: 0 },
    attempts:    { type: Number, default: 0, min: 0 },
    last_attempt:{ type: Date, default: Date.now },
    // JSON serializado das respostas individuais
    answers:     { type: String, default: '[]' },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Índices ──────────────────────────────────────────────────────────────────
ProgressSchema.index({ user_id: 1 });
ProgressSchema.index({ material_id: 1 });
// Índice composto: um registro por user+material
ProgressSchema.index({ user_id: 1, material_id: 1 }, { unique: true });

// ─── Transformação JSON (renomear _id → id) ───────────────────────────────────
ProgressSchema.set('toJSON', {
  virtuals: false,
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Progress', ProgressSchema);
