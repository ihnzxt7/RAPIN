const express = require('express');
const app = express();

require('dotenv').config();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Suporte a JSON no body

app.get('/', (req, res) => {
  res.json({ message: 'Olá, mundo!' });
});

app.post('/dados', (req, res) => {
  const { nome } = req.body;
  res.json({ resposta: `Recebido: ${nome}` });
});

app.listen(PORT, () => {
  console.log('Servidor Express rodando em http://localhost:3000');
});