# 📚 RAPIN — Rede de Apoio Pedagógico e Inclusão Neuroeducacional

Plataforma educacional inclusiva com suporte completo a acessibilidade (dislexia, TDAH, deficiência visual, auditiva, motora, autismo e deficiência intelectual).

Construída com **Node.js + Express** no back-end, **MongoDB + Mongoose** para persistência de dados e HTML/CSS/JS puros no front-end.

---

## 🗂️ Estrutura do Projeto

```
rapin/
├── server.js              # Servidor Express principal
├── seed.js                # Seed de dados iniciais (usuários + materiais)
├── package.json           # Dependências e scripts NPM
├── .env.example           # Modelo de variáveis de ambiente
├── .gitignore
│
├── models/                # Schemas Mongoose
│   ├── User.js            # Usuários (bcrypt, soft-delete)
│   ├── Material.js        # Materiais didáticos
│   └── Progress.js        # Progresso dos alunos
│
├── routes/                # Rotas REST Express
│   ├── auth.js            # POST /api/auth/login, GET /api/auth/me
│   ├── users.js           # CRUD /api/users
│   ├── materials.js       # CRUD /api/materials
│   └── progress.js        # CRUD /api/progress
│
├── css/
│   └── style.css          # Estilos globais + variáveis de acessibilidade
│
├── js/
│   ├── api.js             # Camada de API do front-end (fetch + JWT)
│   ├── app.js             # Lógica principal do aluno (SPA)
│   ├── gestor.js          # Lógica do painel do gestor
│   └── a11y.js            # Motor de acessibilidade (TTS, leitura guiada)
│
├── index.html             # Interface do aluno
└── gestor.html            # Painel de gestão
```

---

## ⚙️ Pré-requisitos

| Ferramenta | Versão mínima |
|-----------|--------------|
| Node.js   | 18.x         |
| npm       | 9.x          |
| MongoDB   | 6.x (local ou Atlas) |

---

## 🚀 Como Executar

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/rapin.git
cd rapin
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
MONGO_URI=mongodb://127.0.0.1:27017/rapin
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES=7d
PORT=3000
```

> **Dica:** Para gerar um JWT_SECRET seguro:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4. Iniciar o servidor

```bash
# Modo produção
npm start

# Modo desenvolvimento (auto-restart com nodemon)
npm run dev
```

O servidor estará disponível em:
- 🌐 **Alunos:** http://localhost:3000
- 🛡️ **Gestor:** http://localhost:3000/gestor.html
- 🔌 **API:** http://localhost:3000/api
- 💚 **Health:** http://localhost:3000/api/health

### 5. Seed manual (opcional)

O seed roda **automaticamente na primeira inicialização** quando o banco está vazio. Para executar manualmente:

```bash
npm run seed
```

---

## 🔑 Credenciais de Acesso

### Conta Gestor (painel administrativo)
| Campo | Valor |
|-------|-------|
| E-mail | `gestor@edu.com` |
| Senha | `gestor123` |
| Acesso | `/gestor.html` |

### Contas Professor
| Nome | E-mail | Senha | Disciplinas |
|------|--------|-------|-------------|
| Prof. Maria Silva | `maria@edu.com` | `prof123` | Português, História |
| Prof. João Santos | `joao@edu.com` | `prof123` | Matemática, Ciências |

### Contas Aluno
| Nome | E-mail | Senha | Turma | Necessidade |
|------|--------|-------|-------|-------------|
| Ana Beatriz Costa | `ana@edu.com` | `aluno123` | 1º Ano | Dislexia |
| Carlos Eduardo Lima | `carlos@edu.com` | `aluno123` | 1º Ano | TDAH |
| Fernanda Oliveira | `fernanda@edu.com` | `aluno123` | 2º Ano | Visual |
| Gabriel Mendes | `gabriel@edu.com` | `aluno123` | 2º Ano | Auditiva |
| Isabela Rodrigues | `isabela@edu.com` | `aluno123` | 3º Ano | Autismo |
| Lucas Ferreira | `lucas@edu.com` | `aluno123` | 3º Ano | Motora |

---

## 🗄️ Estrutura de Dados (MongoDB)

### Coleção `users`

```json
{
  "_id":          "ObjectId",
  "name":         "string (obrigatório)",
  "email":        "string (único, lowercase)",
  "password":     "string (hash bcrypt — nunca retornado pela API)",
  "role":         "gestor | professor | aluno",
  "turma":        "1ano | 2ano | 3ano | ''",
  "subjects":     ["matematica", "portugues", ...],
  "special_needs":"none | visual | auditiva | motora | dislexia | tdah | autismo | intelectual",
  "points":       "number (padrão: 0)",
  "level":        "number (padrão: 1)",
  "active":       "boolean (soft-delete: false = inativo)",
  "a11y_prefs":   "string JSON com preferências de acessibilidade",
  "createdAt":    "Date",
  "updatedAt":    "Date"
}
```

### Coleção `materials`

```json
{
  "_id":            "ObjectId",
  "title":          "string (obrigatório)",
  "subject":        "matematica | portugues | historia | geografia | ciencias | ingles | artes | educacao_fis | ''",
  "turma":          "1ano | 2ano | 3ano | ''",
  "description":    "string (HTML)",
  "content":        "string (HTML rico — corpo do material)",
  "simplified_text":"string (HTML — versão simplificada para def. intelectual)",
  "transcript":     "string (texto — transcrição para def. auditiva)",
  "audio_desc":     "string (descrição de imagens para def. visual)",
  "video_url":      "string (URL de vídeo)",
  "libras_url":     "string (URL de vídeo em Libras)",
  "quiz":           "string JSON — array de questões",
  "author_id":      "string (ObjectId do autor)",
  "author_name":    "string",
  "published":      "boolean",
  "tags":           ["string"],
  "createdAt":      "Date",
  "updatedAt":      "Date"
}
```

#### Estrutura do Quiz (campo `quiz`):

```json
[
  {
    "question": "Texto da pergunta",
    "options": [
      { "text": "Opção A" },
      { "text": "Opção B" },
      { "text": "Opção C" },
      { "text": "Opção D" }
    ],
    "correct": 1
  }
]
```

> `correct` é o índice (0-based) da opção correta.

### Coleção `progress`

```json
{
  "_id":          "ObjectId",
  "user_id":      "string (ObjectId do aluno)",
  "material_id":  "string (ObjectId do material)",
  "completed":    "boolean",
  "score":        "number (acertos)",
  "max_score":    "number (total de questões)",
  "attempts":     "number (número de tentativas)",
  "last_attempt": "string (ISO 8601)",
  "answers":      "string JSON — array de índices respondidos",
  "createdAt":    "Date",
  "updatedAt":    "Date"
}
```

> Índice único composto: `{ user_id, material_id }` — um registro por aluno+material.

---

## 🔌 API Reference

### Auth

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login com e-mail e senha. Retorna `{ token, user }` |
| GET  | `/api/auth/me`    | Retorna o usuário autenticado (Bearer token) |

#### POST `/api/auth/login`
```json
// Body
{ "email": "aluno@edu.com", "password": "aluno123" }

// Resposta 200
{ "token": "eyJ...", "user": { "id": "...", "name": "...", "role": "aluno", ... } }
```

---

### Usuários — `/api/users`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/api/users` | Listar usuários (paginação + filtros) |
| GET    | `/api/users/:id` | Buscar usuário por ID |
| POST   | `/api/users` | Criar usuário |
| PATCH  | `/api/users/:id` | Atualizar parcialmente |
| PUT    | `/api/users/:id` | Atualizar completamente |
| DELETE | `/api/users/:id` | Soft-delete (`active: false`) |

**Query params GET /api/users:**
```
page=1        Página (padrão: 1)
limit=100     Itens por página (máx: 500)
search=texto  Busca por nome ou e-mail (regex)
role=aluno    Filtrar por role
turma=1ano    Filtrar por turma
```

---

### Materiais — `/api/materials`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/api/materials` | Listar materiais (paginação + filtros) |
| GET    | `/api/materials/:id` | Buscar material por ID |
| POST   | `/api/materials` | Criar material |
| PATCH  | `/api/materials/:id` | Atualizar parcialmente |
| PUT    | `/api/materials/:id` | Atualizar completamente |
| DELETE | `/api/materials/:id` | Excluir permanentemente |

**Query params GET /api/materials:**
```
page=1          Página
limit=50        Itens por página (máx: 200)
search=texto    Busca em título, descrição e tags
subject=matematica  Filtrar por disciplina
turma=1ano      Filtrar por turma
published=true  Filtrar por publicado (true/false)
```

---

### Progresso — `/api/progress`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/api/progress` | Listar progresso com filtros |
| GET    | `/api/progress/:id` | Buscar registro por ID |
| POST   | `/api/progress` | Criar ou atualizar (upsert por user+material) |
| PATCH  | `/api/progress/:id` | Atualizar parcialmente |
| DELETE | `/api/progress/:id` | Excluir registro |

**Query params GET /api/progress:**
```
user_id=xxx       Filtrar por aluno (obrigatório para uso normal)
material_id=yyy   Filtrar por material
limit=100         Máximo de registros
```

---


## 🎯 Scripts NPM

```bash
npm start       # Inicia servidor em modo produção (node server.js)
npm run dev     # Inicia com nodemon (auto-restart ao salvar)
npm run seed    # Executa seed manual (insere dados se banco vazio)
```

---

## ♿ Funcionalidades de Acessibilidade

| Recurso | Descrição |
|---------|-----------|
| **Fonte Dislexia** | Ativa fonte OpenDyslexic para usuários com dislexia |
| **Alto Contraste** | Tema de alto contraste para deficiência visual |
| **Narração TTS** | Leitura em voz alta via Web Speech API |
| **Leitura Guiada** | Destaque de parágrafo por parágrafo (teclado/clique) |
| **Espaçamento** | Aumenta espaço entre linhas e letras |
| **Zoom de fonte** | Controle de tamanho de texto (12px–32px) |
| **Texto simplificado** | Versão simplificada dos materiais |
| **Transcrição** | Texto alternativo ao áudio/vídeo para surdos |
| **Descrição de áudio** | Alt-text detalhado das imagens para cegos |
| **Vídeo em Libras** | Link para versão em Língua Brasileira de Sinais |