/**
 * RAPIN — Camada de API (Front-end)
 * Conectada ao servidor Node.js + Express + MongoDB. (RAPIN)
 *
 * Todos os endpoints são relativos à raiz do servidor (ex.: /api/users).
 * Autenticação via JWT — token armazenado no localStorage.
 */
'use strict';

const API = {

  BASE: '/api',

  // ─── Auth — token e usuário em localStorage ────────────────────────────────
  getToken()   { return localStorage.getItem('edu_token') || ''; },
  setToken(t)  { localStorage.setItem('edu_token', t); },
  clearToken() {
    localStorage.removeItem('edu_token');
    localStorage.removeItem('edu_user');
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('edu_user')) || null; }
    catch { return null; }
  },
  setUser(u) { localStorage.setItem('edu_user', JSON.stringify(u)); },

  // ─── Request base — injeta Bearer token automaticamente ───────────────────
  async _req(method, path, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const token = this.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    // Adicionar Authorization se tivermos token
    const token = this.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    if (body) opts.body = JSON.stringify(body);

    const r = await fetch(path, opts);
    if (r.status === 204) return null;

    const data = await r.json();
    if (!r.ok) throw new Error(data.message || `Erro ${r.status}`);
    return data;
  },

  // ─── Autenticação ──────────────────────────────────────────────────────────

  /**
   * Login via POST /api/auth/login
   * Retorna { token, user } do servidor.
   * O servidor valida bcrypt e assina o JWT.
   */
  async login(email, password) {
    const res = await this._req('POST', `${this.BASE}/auth/login`, { email, password });
    this.setToken(res.token);
    this.setUser(res.user);
    return res;
  },

  /**
   * Obtém o usuário autenticado via GET /api/auth/me
   * O servidor verifica o token JWT e retorna o usuário atualizado do MongoDB.
   */
  async getMe() {
    const user = await this._req('GET', `${this.BASE}/auth/me`);
    this.setUser(user);
    return user;
  },

  // ─── Usuários ──────────────────────────────────────────────────────────────
  async listUsers(params = {}) {
    const qs = new URLSearchParams({ limit: 100, ...params }).toString();
    return this._req('GET', `${this.BASE}/users?${qs}`);
  },

  async fetchUser(id) {
    return this._req('GET', `${this.BASE}/users/${id}`);
  },

  async createUser(data) {
    return this._req('POST', `${this.BASE}/users`, {
      ...data,
      points: data.points || 0,
      level:  data.level  || 1,
      active: true,
    });
  },

  async updateUser(id, data) {
    return this._req('PATCH', `${this.BASE}/users/${id}`, data);
  },

  async deleteUser(id) {
    // Soft-delete via DELETE — server sets active: false, retorna 204
    return this._req('DELETE', `${this.BASE}/users/${id}`);
  },

  async getUserStats() {
    const res = await this._req('GET', `${this.BASE}/users?limit=500`);
    const users = res.data || [];
    return {
      total:       users.length,
      gestores:    users.filter(u => u.role === 'gestor').length,
      professores: users.filter(u => u.role === 'professor').length,
      alunos:      users.filter(u => u.role === 'aluno').length,
      ativos:      users.filter(u => u.active !== false).length,
      needs: {
        dislexia:    users.filter(u => u.special_needs === 'dislexia').length,
        tdah:        users.filter(u => u.special_needs === 'tdah').length,
        visual:      users.filter(u => u.special_needs === 'visual').length,
        auditiva:    users.filter(u => u.special_needs === 'auditiva').length,
        autismo:     users.filter(u => u.special_needs === 'autismo').length,
        intelectual: users.filter(u => u.special_needs === 'intelectual').length,
        motora:      users.filter(u => u.special_needs === 'motora').length,
      }
    };
  },

  async getRanking(limit = 10) {
    const res = await this._req('GET', `${this.BASE}/users?limit=100`);
    const alunos = (res.data || [])
      .filter(u => u.role === 'aluno' && u.active !== false)
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, limit);
    return alunos;
  },

  async updateA11yPrefs(prefs) {
    const user = this.getUser();
    if (!user) throw new Error('Não autenticado.');
    const updated = await this._req('PATCH', `${this.BASE}/users/${user.id}`, {
      a11y_prefs:    JSON.stringify(prefs),
      special_needs: prefs.special_needs || user.special_needs,
    });
    this.setUser({ ...user, ...updated });
    return updated;
  },

  // ─── Materiais ─────────────────────────────────────────────────────────────
  async listMaterials(params = {}) {
    const qs = new URLSearchParams({ limit: 50, ...params }).toString();
    return this._req('GET', `${this.BASE}/materials?${qs}`);
  },

  async getMaterial(id) {
    return this._req('GET', `${this.BASE}/materials/${id}`);
  },

  async createMaterial(data) {
    const user = this.getUser();
    return this._req('POST', `${this.BASE}/materials`, {
      ...data,
      author_id:   user?.id   || '',
      author_name: user?.name || '',
      published:   data.published !== false,
    });
  },

  async updateMaterial(id, data) {
    return this._req('PATCH', `${this.BASE}/materials/${id}`, data);
  },

  async deleteMaterial(id) {
    return this._req('DELETE', `${this.BASE}/materials/${id}`);
  },

  // ─── Progresso ─────────────────────────────────────────────────────────────

  /**
   * Busca progresso com filtros server-side.
   * GET /api/progress?user_id=X&material_id=Y
   * O servidor filtra diretamente no MongoDB — sem download massivo.
   */
  async getProgress(userId, materialId = null) {
    const params = { user_id: userId, limit: 200 };
    if (materialId) params.material_id = materialId;
    const qs = new URLSearchParams(params).toString();
    const res = await this._req('GET', `${this.BASE}/progress?${qs}`);
    return res.data || [];
  },

  async saveQuizResult(materialId, score, maxScore, answers) {
    const user = this.getUser();
    if (!user) return;

    // Verificar se já existe registro para este material
    const existing = await this.getProgress(user.id, materialId);
    const prev = existing[0];

    const payload = {
      user_id:      user.id,
      material_id:  materialId,
      completed:    true,
      score,
      max_score:    maxScore,
      attempts:     (prev?.attempts || 0) + 1,
      last_attempt: new Date().toISOString(),
      answers:      JSON.stringify(answers),
    };

    // POST com upsert no servidor (cria ou atualiza pelo par user+material)
    const result = await this._req('POST', `${this.BASE}/progress`, payload);

    // Atualizar pontos do usuário
    const earnedPoints = Math.round((score / Math.max(maxScore, 1)) * 100);
    const newPoints    = (user.points || 0) + earnedPoints;
    const newLevel     = Math.floor(newPoints / 200) + 1;
    await this.updateUser(user.id, { points: newPoints, level: newLevel });
    this.setUser({ ...user, points: newPoints, level: newLevel });

    return { result, earnedPoints, newPoints, newLevel };
  },

  async markMaterialViewed(materialId) {
    const user = this.getUser();
    if (!user) return;

    const existing = await this.getProgress(user.id, materialId);
    if (existing.length > 0) return; // já registrado

    return this._req('POST', `${this.BASE}/progress`, {
      user_id:      user.id,
      material_id:  materialId,
      completed:    false,
      score:        0,
      max_score:    0,
      attempts:     0,
      last_attempt: new Date().toISOString(),
      answers:      '[]',
    });
  },

  async getAllProgress() {
    const res = await this._req('GET', `${this.BASE}/progress?limit=1000`);
    return res.data || [];
  },

  // ─── Utils ─────────────────────────────────────────────────────────────────

  /**
   * Verifica se o JWT armazenado ainda é válido.
   * O JWT do servidor é assinado (HS256) — usamos a expiração do payload.
   */
  isAuthenticated() {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return payload.exp ? payload.exp * 1000 > Date.now() : true;
  },

  getRole() {
    try {
      const token = this.getToken();
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64)).role || null;
    } catch {
      return null;
    }
  },
};

window.API = API;
