/**
 * RAPIN — Controlador do Painel do Professor
 *
 * Seções:
 *  - Dashboard   : resumo dos seus materiais e desempenho geral da turma
 *  - Materiais   : listar, criar, editar e excluir apenas os próprios materiais
 *  - Alunos      : visualizar alunos das suas turmas/disciplinas
 *  - Desempenho  : acompanhar progresso e notas de quiz por aluno e material
 */
'use strict';

// ─── Constantes (espelham as do gestor) ────────────────────────────────────
const TURMAS_P = {
  '':     'Sem turma',
  '1ano': '1º Ano — Ensino Médio',
  '2ano': '2º Ano — Ensino Médio',
  '3ano': '3º Ano — Ensino Médio',
};
const SPECIAL_NEEDS_P = {
  none:        { label: 'Nenhuma',          icon: '👤' },
  visual:      { label: 'Def. Visual',      icon: '👁️' },
  auditiva:    { label: 'Def. Auditiva',    icon: '👂' },
  motora:      { label: 'Def. Motora',      icon: '🦾' },
  dislexia:    { label: 'Dislexia',         icon: '📝' },
  tdah:        { label: 'TDAH',             icon: '⚡' },
  autismo:     { label: 'Autismo',          icon: '🧩' },
  intelectual: { label: 'Def. Intelectual', icon: '🌱' },
};
const SUBJECTS_P = {
  matematica:   'Matemática',
  portugues:    'Português',
  historia:     'História',
  geografia:    'Geografia',
  ciencias:     'Ciências',
  ingles:       'Inglês',
  artes:        'Artes',
  educacao_fis: 'Educação Física',
};

// ─── API extra: buscar meus alunos e meu progresso ─────────────────────────
// Reutiliza o objeto API do api.js já carregado
const ProfAPI = {
  async listMyMaterials() {
    const user = API.getUser();
    // O servidor já filtra pelo token; aqui filtramos localmente como fallback
    const res = await API.listMaterials({ limit: 200 });
    const all = res.data || [];
    return all.filter(m => m.author_id === user.id);
  },

  async listMyStudents(params = {}) {
    const qs = new URLSearchParams({ limit: 200, ...params }).toString();
    return API._req('GET', `${API.BASE}/users/meus-alunos?${qs}`);
  },

  async getAllProgress() {
    const res = await API._req('GET', `${API.BASE}/progress?limit=1000`);
    return res.data || [];
  },
};

// ─── UI Helpers ───────────────────────────────────────────────────────────
const PUI = {
  toast(msg, type = 'info', duration = 3500) {
    const icons = { info:'info-circle', success:'check-circle', error:'exclamation-circle', warning:'exclamation-triangle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.setAttribute('role', 'status');
    t.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${msg}`;
    document.getElementById('toast-container')?.appendChild(t);
    setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 350); }, duration);
  },

  spinner(show) {
    document.getElementById('global-spinner')?.classList.toggle('hidden', !show);
  },

  modal(html, title = '') {
    let ov = document.getElementById('modal-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'modal-overlay';
      ov.className = 'modal-overlay';
      document.body.appendChild(ov);
    }
    ov.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${title}</h2>
          <button class="modal-close" onclick="PUI.closeModal()" aria-label="Fechar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="modal-body">${html}</div>
      </div>`;
    ov.classList.remove('hidden');
    ov.addEventListener('click', e => { if (e.target === ov) PUI.closeModal(); }, { once: true });
  },

  closeModal() {
    document.getElementById('modal-overlay')?.classList.add('hidden');
  },

  confirm(msg, cb, danger = false) {
    this.modal(`
      <p style="color:var(--text2);margin-bottom:1.25rem;">${msg}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="PUI.closeModal()">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">Confirmar</button>
      </div>`, 'Confirmar');
    document.getElementById('confirm-ok')?.addEventListener('click', () => { PUI.closeModal(); cb(); });
  },

  setContent(html) {
    const el = document.getElementById('prof-page-content');
    if (el) { el.innerHTML = html; el.scrollTop = 0; }
  },

  setHeader(title, sub = '') {
    const h = document.getElementById('prof-page-title');
    const s = document.getElementById('prof-page-sub');
    if (h) h.textContent = title;
    if (s) s.textContent = sub;
  },
};
window.PUI = PUI;

// ─── Auth ─────────────────────────────────────────────────────────────────
const PAuth = {
  async login(email, password) {
    PUI.spinner(true);
    try {
      const { user } = await API.login(email, password);
      if (user.role !== 'professor') {
        API.clearToken();
        PUI.spinner(false);
        PUI.toast('Acesso negado. Esta área é exclusiva para professores.', 'error');
        return;
      }
      PUI.spinner(false);
      PApp.onLogin(user);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast(err.message, 'error');
    }
  },

  logout() {
    API.clearToken();
    PApp.showLogin();
  },
};

// ─── Navegação ────────────────────────────────────────────────────────────
const PNav = {
  current: 'dashboard',

  go(page, params = {}) {
    this.current = page;
    document.querySelectorAll('.gestor-sidebar .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
      el.setAttribute('aria-current', el.dataset.page === page ? 'page' : 'false');
    });
    // Fechar sidebar mobile
    document.getElementById('prof-sidebar-el')?.classList.remove('mobile-open');
    document.getElementById('prof-sidebar-overlay')?.classList.remove('visible');
    document.body.style.overflow = '';
    PPages.render(page, params);
  },
};

// ─── Páginas ──────────────────────────────────────────────────────────────
const PPages = {

  async render(page, params = {}) {
    switch (page) {
      case 'dashboard': await this.renderDashboard(); break;
      case 'materials': await this.renderMaterials(params); break;
      case 'students':  await this.renderStudents(params); break;
      case 'progress':  await this.renderProgress(params); break;
      default:          await this.renderDashboard();
    }
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async renderDashboard() {
    const user = API.getUser();
    PUI.setHeader('Início', `Bem-vindo(a), ${user?.name?.split(' ')[0] || 'Professor'}!`);
    PUI.spinner(true);

    try {
      const [myMaterials, studentsRes, progressList] = await Promise.all([
        ProfAPI.listMyMaterials(),
        ProfAPI.listMyStudents(),
        ProfAPI.getAllProgress(),
      ]);

      const students = studentsRes.data || [];
      const completedCount = progressList.filter(p => p.completed).length;
      const publishedCount = myMaterials.filter(m => m.published).length;
      const draftCount = myMaterials.filter(m => !m.published).length;

      // Métricas de desempenho da turma
      const studentsWithProgress = students.map(s => {
        const sp = progressList.filter(p => p.user_id === s.id && p.completed);
        const avg = sp.length
          ? Math.round(sp.reduce((acc, p) => acc + ((p.score / Math.max(p.max_score, 1)) * 100), 0) / sp.length)
          : 0;
        return { ...s, completedCount: sp.length, avgScore: avg };
      });

      const avgTurma = studentsWithProgress.length
        ? Math.round(studentsWithProgress.reduce((a, s) => a + s.avgScore, 0) / studentsWithProgress.length)
        : 0;

      PUI.spinner(false);

      PUI.setContent(`
        <!-- Métricas -->
        <div class="metrics-grid" role="region" aria-label="Métricas">
          ${this._metricCard('Meus Materiais', myMaterials.length, 'fas fa-book-open', 'purple')}
          ${this._metricCard('Publicados', publishedCount, 'fas fa-check-circle', 'green')}
          ${this._metricCard('Meus Alunos', students.length, 'fas fa-user-graduate', 'teal')}
          ${this._metricCard('Média da Turma', `${avgTurma}%`, 'fas fa-chart-bar', 'gold')}
        </div>

        <div class="grid-2" style="gap:1.25rem;">
          <!-- Meus materiais recentes -->
          <div class="card">
            <div class="card-title">
              <i class="fas fa-book-open"></i> Meus Materiais Recentes
            </div>
            ${myMaterials.length === 0 ? `
              <div class="empty-state" style="padding:1.5rem 0;">
                <i class="fas fa-book"></i>
                <p>Você ainda não criou nenhum material.</p>
                <button class="btn btn-primary btn-sm" onclick="PPages.openCreateMaterial()">
                  <i class="fas fa-plus"></i> Criar primeiro material
                </button>
              </div>` : `
              <div class="table-wrapper">
                <table aria-label="Materiais recentes">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Disciplina</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${myMaterials.slice(0, 5).map(m => `
                      <tr>
                        <td style="font-weight:600;max-width:160px;">
                          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.title}</div>
                        </td>
                        <td><span class="tag tag-purple">${SUBJECTS_P[m.subject] || m.subject || '—'}</span></td>
                        <td>
                          <span class="tag ${m.published ? 'tag-green' : 'tag-gray'}">
                            ${m.published ? 'Publicado' : 'Rascunho'}
                          </span>
                        </td>
                        <td>
                          <div class="table-actions">
                            <button class="btn btn-sm btn-secondary" onclick="PPages.openEditMaterial('${m.id}')"
                              aria-label="Editar ${m.title}">
                              <i class="fas fa-edit"></i>
                            </button>
                          </div>
                        </td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>
              <button class="btn btn-outline btn-full" style="margin-top:.75rem;" onclick="PNav.go('materials')">
                Ver todos os materiais
              </button>`}
          </div>

          <!-- Top alunos por desempenho -->
          <div class="card">
            <div class="card-title">
              <i class="fas fa-trophy"></i> Desempenho da Turma
            </div>
            ${studentsWithProgress.length === 0 ? `
              <p class="text-muted text-sm">Nenhum aluno com progresso registrado.</p>` : `
              <div class="ranking-list" role="list">
                ${studentsWithProgress
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .slice(0, 6)
                  .map((s, i) => `
                    <div class="ranking-item" role="listitem" style="cursor:pointer;"
                      onclick="PNav.go('progress', {userId:'${s.id}'})">
                      <span class="ranking-pos ${i === 0 ? 'gold-pos' : i === 1 ? 'silver-pos' : i === 2 ? 'bronze-pos' : ''}"
                        aria-label="Posição ${i + 1}">
                        ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <div class="sidebar-avatar" style="width:28px;height:28px;font-size:.75rem;flex-shrink:0;"
                        aria-hidden="true">${s.name.charAt(0)}</div>
                      <span class="ranking-name">${s.name}</span>
                      <span class="ranking-pts">${s.avgScore}%</span>
                    </div>`).join('')}
              </div>
              <button class="btn btn-outline btn-full" style="margin-top:.75rem;" onclick="PNav.go('progress')">
                Ver relatório completo
              </button>`}
          </div>
        </div>

        <!-- Ações rápidas -->
        <div class="card mt-md">
          <div class="card-title"><i class="fas fa-bolt"></i> Ações Rápidas</div>
          <div style="display:flex;flex-wrap:wrap;gap:.75rem;">
            <button class="btn btn-primary" onclick="PPages.openCreateMaterial()">
              <i class="fas fa-plus"></i> Novo Material
            </button>
            <button class="btn btn-secondary" onclick="PNav.go('materials')">
              <i class="fas fa-book-open"></i> Meus Materiais
            </button>
            <button class="btn btn-secondary" onclick="PNav.go('students')">
              <i class="fas fa-user-graduate"></i> Meus Alunos
            </button>
            <button class="btn btn-outline" onclick="PNav.go('progress')">
              <i class="fas fa-chart-bar"></i> Ver Desempenho
            </button>
          </div>
        </div>

        ${draftCount > 0 ? `
          <div class="card mt-md" style="border-left:3px solid var(--gold);">
            <div class="card-title"><i class="fas fa-exclamation-circle" style="color:var(--gold);"></i> Rascunhos pendentes</div>
            <p class="text-sm text-muted">
              Você tem <strong>${draftCount} material(is) em rascunho</strong> que ainda não foram publicados para os alunos.
            </p>
            <button class="btn btn-sm btn-outline" onclick="PNav.go('materials')">Ver rascunhos</button>
          </div>` : ''}
      `);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar dashboard.', 'error');
      console.error(err);
    }
  },

  _metricCard(label, value, icon, color) {
    return `
      <div class="metric-card ${color}" role="group" aria-label="${label}: ${value}">
        <div class="metric-value">${value}</div>
        <div class="metric-label">${label}</div>
        <i class="${icon} metric-icon" aria-hidden="true"></i>
      </div>`;
  },

  // ── Materiais ─────────────────────────────────────────────────────────────
  async renderMaterials(params = {}) {
    PUI.setHeader('Meus Materiais', 'Gerencie os materiais que você criou');
    PUI.spinner(true);

    try {
      const myMaterials = await ProfAPI.listMyMaterials();
      PUI.spinner(false);

      PUI.setContent(`
        <div class="gestor-table-header">
          <div>
            <div class="gestor-table-title">Meus Materiais</div>
            <div class="gestor-table-subtitle">${myMaterials.length} material(is) criado(s) por você</div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <div class="search-bar" style="width:200px;">
              <i class="fas fa-search"></i>
              <input type="search" id="pmat-search" placeholder="Buscar…" aria-label="Buscar materiais">
            </div>
            <select class="form-select" id="pmat-filter-subj" aria-label="Filtrar disciplina" style="width:auto;">
              <option value="">Todas disciplinas</option>
              ${Object.entries(SUBJECTS_P).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
            <select class="form-select" id="pmat-filter-status" aria-label="Filtrar status" style="width:auto;">
              <option value="">Todos</option>
              <option value="true">Publicado</option>
              <option value="false">Rascunho</option>
            </select>
            <button class="btn btn-primary" onclick="PPages.openCreateMaterial()" aria-label="Criar novo material">
              <i class="fas fa-plus"></i> Novo Material
            </button>
          </div>
        </div>

        <div class="card">
          <div class="table-wrapper">
            <table aria-label="Meus materiais">
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Disciplina</th>
                  <th scope="col">Turma</th>
                  <th scope="col">A11y</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody id="pmat-tbody">
                ${this._renderMaterialRows(myMaterials)}
              </tbody>
            </table>
          </div>
        </div>
      `);

      const doFilter = () => {
        const s    = document.getElementById('pmat-search')?.value.toLowerCase() || '';
        const subj = document.getElementById('pmat-filter-subj')?.value || '';
        const pub  = document.getElementById('pmat-filter-status')?.value;
        const filtered = myMaterials.filter(m =>
          (!s    || m.title.toLowerCase().includes(s)) &&
          (!subj || m.subject === subj) &&
          (pub === undefined || pub === '' || String(m.published) === pub)
        );
        const tbody = document.getElementById('pmat-tbody');
        if (tbody) tbody.innerHTML = this._renderMaterialRows(filtered);
      };

      document.getElementById('pmat-search')?.addEventListener('input', doFilter);
      document.getElementById('pmat-filter-subj')?.addEventListener('change', doFilter);
      document.getElementById('pmat-filter-status')?.addEventListener('change', doFilter);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar materiais.', 'error');
    }
  },

  _renderMaterialRows(materials) {
    if (!materials.length) return `
      <tr><td colspan="6">
        <div class="empty-state">
          <i class="fas fa-book"></i>
          <h3>Nenhum material encontrado</h3>
          <button class="btn btn-primary btn-sm" onclick="PPages.openCreateMaterial()">
            <i class="fas fa-plus"></i> Criar material
          </button>
        </div>
      </td></tr>`;

    return materials.map(m => {
      let quiz = [];
      try { quiz = m.quiz ? JSON.parse(m.quiz) : []; } catch {}
      const a11yCount = [m.audio_desc, m.libras_url, m.transcript, m.simplified_text].filter(Boolean).length;

      return `
        <tr>
          <td style="font-weight:600;color:var(--text);max-width:200px;">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.title}</div>
          </td>
          <td><span class="tag tag-purple">${SUBJECTS_P[m.subject] || m.subject || '—'}</span></td>
          <td>${TURMAS_P[m.turma] || m.turma || '—'}</td>
          <td>
            ${m.audio_desc    ? '<span class="tag tag-purple" title="Audiodescrição">🔊</span> ' : ''}
            ${m.libras_url    ? '<span class="tag tag-teal"   title="Libras">🤟</span> '         : ''}
            ${m.transcript    ? '<span class="tag tag-teal"   title="Transcrição">📝</span> '    : ''}
            ${m.simplified_text ? '<span class="tag tag-green" title="Simplificado">✏️</span> ' : ''}
            ${quiz.length     ? `<span class="tag tag-gold"   title="${quiz.length} questões">❓${quiz.length}</span>` : ''}
            ${a11yCount === 0 && !quiz.length ? '<span class="text-muted text-sm">—</span>' : ''}
          </td>
          <td>
            <span class="tag ${m.published ? 'tag-green' : 'tag-gray'}">
              ${m.published ? 'Publicado' : 'Rascunho'}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-secondary" onclick="PPages.openEditMaterial('${m.id}')"
                aria-label="Editar ${m.title}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="PPages.confirmDeleteMaterial('${m.id}', '${m.title.replace(/'/g, '')}')"
                aria-label="Excluir ${m.title}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  // ── Alunos ────────────────────────────────────────────────────────────────
  async renderStudents(params = {}) {
    PUI.setHeader('Meus Alunos', 'Alunos das suas disciplinas');
    PUI.spinner(true);

    try {
      const res = await ProfAPI.listMyStudents();
      const students = res.data || [];
      PUI.spinner(false);

      PUI.setContent(`
        <div class="gestor-table-header">
          <div>
            <div class="gestor-table-title">Meus Alunos</div>
            <div class="gestor-table-subtitle">${students.length} aluno(s) ativo(s)</div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <div class="search-bar" style="width:220px;">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input type="search" id="pstu-search" placeholder="Buscar aluno…" aria-label="Buscar alunos">
            </div>
            <select class="form-select" id="pstu-filter-needs" aria-label="Filtrar por necessidade" style="width:auto;">
              <option value="">Todas necessidades</option>
              ${Object.entries(SPECIAL_NEEDS_P).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
            </select>
            <select class="form-select" id="pstu-filter-turma" aria-label="Filtrar por turma" style="width:auto;">
              <option value="">Todas turmas</option>
              ${Object.entries(TURMAS_P).filter(([k]) => k).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="card">
          <div class="table-wrapper">
            <table aria-label="Tabela de alunos">
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">Turma</th>
                  <th scope="col">Necessidade</th>
                  <th scope="col">XP</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody id="pstu-tbody">
                ${this._renderStudentRows(students)}
              </tbody>
            </table>
          </div>
        </div>
      `);

      const doFilter = () => {
        const s = document.getElementById('pstu-search')?.value.toLowerCase() || '';
        const n = document.getElementById('pstu-filter-needs')?.value || '';
        const t = document.getElementById('pstu-filter-turma')?.value || '';
        const filtered = students.filter(u =>
          (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)) &&
          (!n || u.special_needs === n) &&
          (!t || u.turma === t)
        );
        const tbody = document.getElementById('pstu-tbody');
        if (tbody) tbody.innerHTML = this._renderStudentRows(filtered);
      };

      document.getElementById('pstu-search')?.addEventListener('input', doFilter);
      document.getElementById('pstu-filter-needs')?.addEventListener('change', doFilter);
      document.getElementById('pstu-filter-turma')?.addEventListener('change', doFilter);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar alunos.', 'error');
    }
  },

  _renderStudentRows(students) {
    if (!students.length) return `
      <tr><td colspan="5">
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>Nenhum aluno encontrado</h3>
        </div>
      </td></tr>`;

    return students.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:.6rem;">
            <div class="sidebar-avatar" style="width:30px;height:30px;font-size:.78rem;flex-shrink:0;"
              aria-hidden="true">${u.name.charAt(0)}</div>
            <div>
              <div style="font-weight:600;color:var(--text);">${u.name}</div>
              <div class="text-sm text-muted">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${TURMAS_P[u.turma] || u.turma || '—'}</td>
        <td>
          <span class="sn-tag sn-${u.special_needs || 'none'}">
            ${SPECIAL_NEEDS_P[u.special_needs]?.icon || ''} ${SPECIAL_NEEDS_P[u.special_needs]?.label || 'Nenhuma'}
          </span>
        </td>
        <td><span class="tag tag-gold">${u.points || 0} XP</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary"
              onclick="PNav.go('progress', {userId:'${u.id}'})"
              aria-label="Ver desempenho de ${u.name}">
              <i class="fas fa-chart-bar"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  },

  // ── Desempenho ────────────────────────────────────────────────────────────
  async renderProgress(params = {}) {
    PUI.setHeader('Desempenho', 'Acompanhe o progresso dos seus alunos');
    PUI.spinner(true);

    try {
      const [studentsRes, progressList, myMaterials] = await Promise.all([
        ProfAPI.listMyStudents(),
        ProfAPI.getAllProgress(),
        ProfAPI.listMyMaterials(),
      ]);

      const students = studentsRes.data || [];
      const targetUser = params.userId
        ? students.find(s => s.id === params.userId)
        : null;

      PUI.spinner(false);

      PUI.setContent(`
        <div class="filter-bar">
          <div class="search-bar" style="width:220px;">
            <i class="fas fa-search"></i>
            <input type="search" id="pprog-search" placeholder="Buscar aluno…"
              aria-label="Buscar aluno" value="${targetUser ? targetUser.name : ''}">
          </div>
          <select class="form-select" id="pprog-turma" style="width:auto;" aria-label="Filtrar turma">
            <option value="">Todas turmas</option>
            ${Object.entries(TURMAS_P).filter(([k]) => k).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <select class="form-select" id="pprog-material" style="width:auto;" aria-label="Filtrar material">
            <option value="">Todos materiais</option>
            ${myMaterials.map(m => `<option value="${m.id}">${m.title}</option>`).join('')}
          </select>
        </div>

        <div id="pprog-content">
          ${this._renderProgressList(
            targetUser ? [targetUser] : students,
            myMaterials,
            progressList
          )}
        </div>
      `);

      const doFilter = () => {
        const s   = document.getElementById('pprog-search')?.value.toLowerCase() || '';
        const t   = document.getElementById('pprog-turma')?.value || '';
        const mid = document.getElementById('pprog-material')?.value || '';
        const filtered = students.filter(u =>
          (!s || u.name.toLowerCase().includes(s)) && (!t || u.turma === t)
        );
        const el = document.getElementById('pprog-content');
        if (el) el.innerHTML = this._renderProgressList(
          filtered,
          mid ? myMaterials.filter(m => m.id === mid) : myMaterials,
          progressList
        );
      };

      document.getElementById('pprog-search')?.addEventListener('input', doFilter);
      document.getElementById('pprog-turma')?.addEventListener('change', doFilter);
      document.getElementById('pprog-material')?.addEventListener('change', doFilter);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar desempenho.', 'error');
    }
  },

  _renderProgressList(students, materials, progressList) {
    if (!students.length) return `
      <div class="empty-state">
        <i class="fas fa-chart-bar"></i>
        <h3>Nenhum aluno encontrado</h3>
      </div>`;

    return students.map(student => {
      const sp       = progressList.filter(p => p.user_id === student.id);
      const completed = sp.filter(p => p.completed).length;
      const total     = materials.length;
      const pct       = total ? Math.round((completed / total) * 100) : 0;
      const avgScore  = sp.filter(p => p.completed).length
        ? Math.round(sp.filter(p => p.completed).reduce((a, p) => a + ((p.score / Math.max(p.max_score, 1)) * 100), 0) / sp.filter(p => p.completed).length)
        : 0;

      const needInfo = SPECIAL_NEEDS_P[student.special_needs];

      return `
        <div class="card mb-md">
          <div class="report-header">
            <div class="report-avatar" aria-hidden="true">${student.name.charAt(0)}</div>
            <div style="flex:1;">
              <div class="report-title">${student.name}</div>
              <div class="report-sub">
                ${TURMAS_P[student.turma] || '—'} ·
                ${needInfo?.icon || ''} ${needInfo?.label || 'Sem necessidade especial'}
                · ${student.points || 0} XP
              </div>
              <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.5rem;">
                <span class="tag tag-green">${completed}/${total} materiais</span>
                <span class="tag tag-purple">${pct}% concluído</span>
                <span class="tag tag-gold">${avgScore}% média quiz</span>
              </div>
            </div>
            <button class="btn btn-sm btn-outline"
              onclick="PPages._toggleStudentDetail('detail-${student.id}')"
              aria-label="Ver detalhes de ${student.name}">
              <i class="fas fa-chevron-down" id="chevron-${student.id}"></i>
            </button>
          </div>

          <div class="material-progress-bar mt-sm" role="progressbar"
            aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso: ${pct}%">
            <div class="material-progress-fill" style="width:${pct}%"></div>
          </div>

          <!-- Detalhe por material (colapsável) -->
          <div id="detail-${student.id}" class="hidden" style="margin-top:.85rem;">
            <div style="font-size:.78rem;font-weight:600;color:var(--text2);margin-bottom:.5rem;
              text-transform:uppercase;letter-spacing:.05em;">
              Detalhe por material
            </div>
            <div style="display:flex;flex-direction:column;gap:.35rem;">
              ${materials.length === 0 ? `<p class="text-muted text-sm">Nenhum material seu disponível.</p>` :
                materials.map(m => {
                  const prog  = sp.find(p => p.material_id === m.id);
                  const done  = prog?.completed;
                  const score = prog ? Math.round((prog.score / Math.max(prog.max_score, 1)) * 100) : null;
                  const attempts = prog?.attempts || 0;
                  return `
                    <div class="material-progress-item" style="gap:.5rem;">
                      <i class="status-icon fas fa-${done ? 'check-circle done' : prog ? 'eye' : 'circle pending'}"
                        aria-label="${done ? 'Concluído' : prog ? 'Visualizado' : 'Não acessado'}"
                        title="${done ? 'Quiz feito' : prog ? 'Visualizado' : 'Não acessado'}"
                        style="color:${done ? 'var(--green)' : prog ? 'var(--accent)' : 'var(--text3)'}"></i>
                      <span class="title" style="flex:1;">${m.title}</span>
                      <span class="tag ${SUBJECTS_P[m.subject] ? 'tag-purple' : ''} text-sm" style="font-size:.7rem;">
                        ${SUBJECTS_P[m.subject] || m.subject || ''}
                      </span>
                      ${score !== null
                        ? `<span class="score ${score >= 70 ? 'text-green' : score >= 50 ? '' : 'text-red'}"
                            style="font-weight:600;">${score}%</span>`
                        : `<span class="score" style="color:var(--text3)">—</span>`}
                      ${attempts > 0
                        ? `<span class="text-muted text-sm">${attempts}× tentativa${attempts > 1 ? 's' : ''}</span>`
                        : ''}
                    </div>`;
                }).join('')}
            </div>
          </div>
        </div>`;
    }).join('');
  },

  _toggleStudentDetail(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const hidden = el.classList.toggle('hidden');
    // Girar chevron
    const studentId = id.replace('detail-', '');
    const chevron = document.getElementById(`chevron-${studentId}`);
    if (chevron) {
      chevron.className = hidden ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
  },

  // ── Modais de Material ────────────────────────────────────────────────────
  openCreateMaterial() {
    this._openMaterialForm(null);
  },

  async openEditMaterial(id) {
    PUI.spinner(true);
    let mat;
    try {
      mat = await API.getMaterial(id);
      PUI.spinner(false);
    } catch {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar material.', 'error');
      return;
    }

    // Verificar autoria (segurança extra no front)
    const user = API.getUser();
    if (mat.author_id !== user.id) {
      PUI.toast('Você não tem permissão para editar este material.', 'error');
      return;
    }

    this._openMaterialForm(mat);
  },

  _openMaterialForm(mat) {
    const isEdit = !!mat;
    let quiz = [];
    try { quiz = mat?.quiz ? JSON.parse(mat.quiz) : []; } catch {}

    PUI.modal(`
      <div class="material-sections-nav" role="tablist">
        <button class="material-section-tab active" role="tab" data-tab="basic">Básico</button>
        <button class="material-section-tab" role="tab" data-tab="content">Conteúdo</button>
        <button class="material-section-tab" role="tab" data-tab="a11y">Acessibilidade</button>
        <button class="material-section-tab" role="tab" data-tab="quiz">Quiz</button>
      </div>

      <form id="pmat-form">
        <!-- Tab: Básico -->
        <div id="tab-basic">
          <div class="form-group">
            <label class="form-label" for="pmf-title">Título *</label>
            <input class="form-input" type="text" id="pmf-title"
              value="${mat?.title || ''}" required aria-required="true">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="pmf-subject">Disciplina</label>
              <select class="form-select" id="pmf-subject">
                ${Object.entries(SUBJECTS_P).map(([k, v]) =>
                  `<option value="${k}" ${mat?.subject === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-turma">Turma</label>
              <select class="form-select" id="pmf-turma">
                ${Object.entries(TURMAS_P).map(([k, v]) =>
                  `<option value="${k}" ${mat?.turma === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pmf-desc">Descrição</label>
            <input class="form-input" type="text" id="pmf-desc" value="${mat?.description || ''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="pmf-video">URL do Vídeo (YouTube embed)</label>
            <input class="form-input" type="text" id="pmf-video"
              placeholder="https://www.youtube.com/embed/…" value="${mat?.video_url || ''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="pmf-published">Status</label>
            <select class="form-select" id="pmf-published">
              <option value="true"  ${mat?.published !== false ? 'selected' : ''}>Publicado</option>
              <option value="false" ${mat?.published === false ? 'selected' : ''}>Rascunho</option>
            </select>
          </div>
        </div>

        <!-- Tab: Conteúdo -->
        <div id="tab-content" class="hidden">
          <div class="form-group">
            <label class="form-label" for="pmf-content">Conteúdo Principal *</label>
            <textarea class="form-textarea" id="pmf-content" rows="8"
              placeholder="Escreva o conteúdo da aula aqui…">${mat?.content || ''}</textarea>
          </div>
        </div>

        <!-- Tab: Acessibilidade -->
        <div id="tab-a11y" class="hidden">
          <div class="material-a11y-panel">
            <h5><i class="fas fa-universal-access"></i> Recursos de Acessibilidade</h5>
            <div class="form-group">
              <label class="form-label" for="pmf-audio">Audiodescrição (URL do áudio)</label>
              <input class="form-input" type="text" id="pmf-audio"
                value="${mat?.audio_desc || ''}" placeholder="https://…">
              <p class="form-hint">Arquivo de áudio para alunos com deficiência visual.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-libras">URL Vídeo Libras</label>
              <input class="form-input" type="text" id="pmf-libras"
                value="${mat?.libras_url || ''}" placeholder="https://…">
              <p class="form-hint">Vídeo com interpretação em Libras.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-transcript">Transcrição do Conteúdo</label>
              <textarea class="form-textarea" id="pmf-transcript" rows="4"
                placeholder="Transcrição do vídeo/áudio…">${mat?.transcript || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-simplified">Versão Simplificada</label>
              <textarea class="form-textarea" id="pmf-simplified" rows="4"
                placeholder="Versão simplificada para deficiência intelectual/autismo…">${mat?.simplified_text || ''}</textarea>
            </div>
          </div>
        </div>

        <!-- Tab: Quiz -->
        <div id="tab-quiz" class="hidden">
          <div class="quiz-builder">
            <div class="quiz-builder-header">
              <span class="quiz-builder-title">Questões do Quiz</span>
              <button type="button" class="btn btn-sm btn-outline" id="padd-question-btn">
                <i class="fas fa-plus"></i> Adicionar Questão
              </button>
            </div>
            <div id="pquiz-questions-container">
              ${quiz.map((q, qi) => this._renderQuizInput(qi, q)).join('')}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="PUI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> ${isEdit ? 'Salvar Alterações' : 'Criar Material'}
          </button>
        </div>
      </form>
    `, isEdit ? `Editar: ${mat.title}` : 'Novo Material');

    // Tabs
    document.querySelectorAll('.material-section-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.material-section-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        ['basic', 'content', 'a11y', 'quiz'].forEach(id => {
          document.getElementById(`tab-${id}`)?.classList.toggle('hidden', id !== tab.dataset.tab);
        });
      });
    });

    // Adicionar questão ao quiz
    let qCount = quiz.length;
    document.getElementById('padd-question-btn')?.addEventListener('click', () => {
      const container = document.getElementById('pquiz-questions-container');
      const div = document.createElement('div');
      div.innerHTML = this._renderQuizInput(qCount, null);
      container?.appendChild(div.firstElementChild);
      qCount++;
    });

    // Submit
    document.getElementById('pmat-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title   = document.getElementById('pmf-title')?.value.trim();
      const content = document.getElementById('pmf-content')?.value.trim();

      if (!title || !content) {
        PUI.toast('Título e conteúdo são obrigatórios.', 'error');
        return;
      }

      // Coletar questões do quiz
      const quizData = [];
      document.querySelectorAll('.quiz-question-block').forEach(block => {
        const qText = block.querySelector('.qb-question')?.value.trim();
        if (!qText) return;
        const options = Array.from(block.querySelectorAll('.qb-option'))
          .map(o => o.value.trim()).filter(Boolean);
        const correctRadio = block.querySelector('.qb-correct:checked');
        const correct = correctRadio ? parseInt(correctRadio.value) : 0;
        quizData.push({ question: qText, options: options.map(t => ({ text: t })), correct });
      });

      const data = {
        title,
        subject:         document.getElementById('pmf-subject')?.value,
        turma:           document.getElementById('pmf-turma')?.value,
        description:     document.getElementById('pmf-desc')?.value,
        video_url:       document.getElementById('pmf-video')?.value,
        content,
        audio_desc:      document.getElementById('pmf-audio')?.value,
        libras_url:      document.getElementById('pmf-libras')?.value,
        transcript:      document.getElementById('pmf-transcript')?.value,
        simplified_text: document.getElementById('pmf-simplified')?.value,
        quiz:            JSON.stringify(quizData),
        published:       document.getElementById('pmf-published')?.value === 'true',
        tags: [],
      };

      PUI.spinner(true);
      try {
        if (isEdit) {
          await API.updateMaterial(mat.id, data);
          PUI.toast('Material atualizado com sucesso!', 'success');
        } else {
          await API.createMaterial(data);
          PUI.toast('Material criado com sucesso!', 'success');
        }
        PUI.spinner(false);
        PUI.closeModal();
        PNav.go('materials');
      } catch (err) {
        PUI.spinner(false);
        PUI.toast(err.message, 'error');
      }
    });
  },

  _renderQuizInput(idx, q) {
    const opts = q?.options || [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
    return `
      <div class="quiz-question-block" data-idx="${idx}">
        <div class="quiz-question-num-label">Questão ${idx + 1}</div>
        <div class="form-group">
          <input class="form-input qb-question" type="text"
            placeholder="Texto da questão…" value="${q?.question || ''}">
        </div>
        <div class="quiz-options-builder">
          ${opts.map((o, oi) => `
            <div class="quiz-option-input-row">
              <input type="radio" name="correct_${idx}" class="qb-correct"
                value="${oi}" ${q?.correct === oi ? 'checked' : ''}
                title="Resposta correta">
              <input class="form-input qb-option" type="text"
                placeholder="Opção ${String.fromCharCode(65 + oi)}"
                value="${o.text || o || ''}">
            </div>`).join('')}
        </div>
        <div class="quiz-correct-label">☝️ Marque o radio da resposta correta</div>
      </div>`;
  },

  confirmDeleteMaterial(id, title) {
    PUI.confirm(
      `Excluir o material <strong>${title}</strong>? Esta ação não pode ser desfeita.`,
      async () => {
        PUI.spinner(true);
        try {
          await API.deleteMaterial(id);
          PUI.spinner(false);
          PUI.toast('Material excluído.', 'success');
          PNav.go('materials');
        } catch (err) {
          PUI.spinner(false);
          PUI.toast(err.message, 'error');
        }
      },
      true
    );
  },
};
window.PPages = PPages;

// ─── App Principal ────────────────────────────────────────────────────────
const PApp = {
  init() {
    this._buildLogin();
    this._setupSidebar();
    A11y.init();

    if (API.isAuthenticated() && API.getRole() === 'professor') {
      API.getMe().then(user => this.onLogin(user)).catch(() => this.showLogin());
    } else {
      this.showLogin();
    }
  },

  onLogin(user) {
    document.getElementById('prof-login')?.classList.add('hidden');
    document.getElementById('prof-app')?.classList.remove('hidden');
    this._updateSidebarUser(user);
    PNav.go('dashboard');
  },

  showLogin() {
    document.getElementById('prof-app')?.classList.add('hidden');
    document.getElementById('prof-login')?.classList.remove('hidden');
  },

  _buildLogin() {
    const screen = document.getElementById('prof-login');
    if (!screen) return;
    screen.innerHTML = `
      <div class="gestor-login-box">
        <div class="gestor-logo">
          <i class="fas fa-chalkboard-teacher" style="color:var(--accent3);"></i>
          <h1>Painel do Professor</h1>
          <p>RAPIN — Gestão Pedagógica</p>
        </div>
        <form id="prof-login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="prof-email">E-mail</label>
            <input class="form-input" type="email" id="prof-email"
              placeholder="professor@escola.edu.br"
              required autocomplete="email" aria-required="true">
          </div>
          <div class="form-group">
            <label class="form-label" for="prof-password">Senha</label>
            <input class="form-input" type="password" id="prof-password"
              placeholder="••••••••"
              required autocomplete="current-password" aria-required="true">
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg"
            style="background:var(--accent3);">
            <i class="fas fa-sign-in-alt" aria-hidden="true"></i> Entrar como Professor
          </button>
        </form>
        <div class="login-footer" style="margin-top:1rem;text-align:center;">
          <p class="text-muted text-sm">Acesso exclusivo para professores.</p>
          <p><a href="index.html" style="color:var(--accent3);">← Área do Aluno</a></p>
          <p><a href="gestor.html" style="color:var(--text2);font-size:.78rem;">Painel do Gestor</a></p>
        </div>
      </div>`;

    document.getElementById('prof-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('prof-email')?.value.trim();
      const password = document.getElementById('prof-password')?.value;
      if (!email || !password) { PUI.toast('Preencha e-mail e senha.', 'error'); return; }
      await PAuth.login(email, password);
    });
  },

  _setupSidebar() {
    const sidebar = document.getElementById('prof-sidebar-el');
    const overlay = document.getElementById('prof-sidebar-overlay');
    const openBtn = document.getElementById('prof-mobile-open');

    const openMobile = () => {
      sidebar?.classList.add('mobile-open');
      overlay?.classList.add('visible');
      overlay?.removeAttribute('aria-hidden');
      openBtn?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const closeMobile = () => {
      sidebar?.classList.remove('mobile-open');
      overlay?.classList.remove('visible');
      overlay?.setAttribute('aria-hidden', 'true');
      openBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    openBtn?.addEventListener('click', () =>
      sidebar?.classList.contains('mobile-open') ? closeMobile() : openMobile()
    );

    document.getElementById('prof-mobile-toggle')?.addEventListener('click', () =>
      sidebar?.classList.contains('mobile-open') ? closeMobile() : openMobile()
    );

    overlay?.addEventListener('click', closeMobile);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sidebar?.classList.contains('mobile-open')) closeMobile();
    });

    document.querySelectorAll('.gestor-sidebar .nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        PNav.go(item.dataset.page);
        if (window.innerWidth <= 960) closeMobile();
      });
    });

    document.getElementById('prof-logout-btn')?.addEventListener('click', () => {
      PUI.confirm('Deseja sair?', () => PAuth.logout());
    });
  },

  _updateSidebarUser(user) {
    const av = document.getElementById('prof-avatar');
    const nm = document.getElementById('prof-user-name');
    const rl = document.getElementById('prof-user-role');
    if (av) av.textContent = user.name.charAt(0).toUpperCase();
    if (nm) nm.textContent = user.name;
    if (rl) {
      const disciplinas = Array.isArray(user.subjects) && user.subjects.length
        ? user.subjects.map(s => SUBJECTS_P[s] || s).join(', ')
        : 'Professor';
      rl.textContent = disciplinas;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => { PApp.init(); });