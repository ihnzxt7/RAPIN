/**
 * RAPIN — Servidor Principal
 * Node.js + Express + MongoDB/Mongoose
 *
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const morgan   = require('morgan');

const usersRouter     = require('./routes/users');
const materialsRouter = require('./routes/materials');
const progressRouter  = require('./routes/progress');
const authRouter      = require('./routes/auth');

const { runSeed, fixPlainPasswords } = require('./seed');

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rapin';

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/users',     usersRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/progress',  progressRouter);

// ─── Servir arquivos estáticos do front-end ───────────────────────────────────
// Express serve tudo na raiz do projeto (index.html, gestor.html, css/, js/)
app.use(express.static(path.join(__dirname)));

// Fallback: qualquer rota não-API retorna index.html (SPA)
app.get('*', (req, res) => {
  // Rotas específicas do gestor
  if (req.path === '/gestor' || req.path === '/gestor.html') {
    return res.sendFile(path.join(__dirname, 'gestor.html'));
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Healthcheck ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

// ─── Conexão MongoDB + Seed automático ────────────────────────────────────────
async function startServer() {
  try {
    console.log(`\nConectando ao MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB conectado com sucesso!\n');

    // Executar seed se banco estiver vazio
    await runSeed();

    // Corrigir senhas em texto puro (caso o seed antigo tenha sido rodado sem bcrypt)
    await fixPlainPasswords();

    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`RAPIN rodando em http://localhost:${PORT}`);
      console.log(`Alunos:  http://localhost:${PORT}/index.html`);
      console.log(`Gestor:  http://localhost:${PORT}/gestor.html`);
      console.log(`API:     http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    console.error('Verifique se o MongoDB está rodando e a MONGO_URI está correta.');
    process.exit(1);
  }
}

// Tratar desconexões
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado. Tentando reconectar...');
});
mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconectado.');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\nServidor encerrado.');
  process.exit(0);
});

startServer();
