'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: true, trim: true,
    },
    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
    },
    // Senha armazenada com hash bcrypt
    password: {
      type: String, required: true, minlength: 4,
    },
    role: {
      type: String,
      enum: ['gestor', 'professor', 'aluno'],
      default: 'aluno',
    },
    turma: {
      type: String,
      enum: ['1ano', '2ano', '3ano', ''],
      default: '',
    },
    // Disciplinas (para professores)
    subjects: {
      type: [String],
      default: [],
    },
    special_needs: {
      type: String,
      enum: ['none', 'visual', 'auditiva', 'motora', 'dislexia', 'tdah', 'autismo', 'intelectual'],
      default: 'none',
    },
    points: { type: Number, default: 0, min: 0 },
    level:  { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true },
    // Preferências de acessibilidade — JSON serializado
    a11y_prefs: { type: String, default: '' },
  },
  {
    timestamps: true,       // createdAt, updatedAt automáticos
    versionKey: false,
  }
);

// ─── Índices ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ active: 1 });

// ─── Hash da senha antes de salvar ───────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Também hashear em findOneAndUpdate / updateOne se password for alterada
UserSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], async function (next) {
  const update = this.getUpdate();
  const pwd = update?.password || update?.$set?.password;
  if (!pwd) return next();
  const hashed = await bcrypt.hash(pwd, 10);
  if (update.password)       update.password       = hashed;
  if (update.$set?.password) update.$set.password  = hashed;
  next();
});

// ─── Método para verificar senha ─────────────────────────────────────────────
UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ─── Remover password do JSON retornado ───────────────────────────────────────
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  // Padronizar id para string (compatibilidade com front-end)
  obj.id = obj._id.toString();
  delete obj._id;
  return obj;
};

// Transformação global para remover __v e renomear _id → id
UserSchema.set('toJSON', {
  virtuals: false,
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
