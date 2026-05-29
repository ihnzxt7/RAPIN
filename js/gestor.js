/**
 * RAPIN — Controlador do Painel do Gestor
 * Módulos: Auth, Nav, Pages, UI
 */
'use strict';

// ─── Constantes ────────────────────────────────────────────────────────────
const TURMAS_G = {
  '':     'Sem turma',
  '1ano': '1º Ano — Ensino Médio',
  '2ano': '2º Ano — Ensino Médio',
  '3ano': '3º Ano — Ensino Médio',
};
const SPECIAL_NEEDS_G = {
  none:       { label: 'Nenhuma',              icon: '👤' },
  visual:     { label: 'Def. Visual',          icon: '👁️' },
  auditiva:   { label: 'Def. Auditiva',        icon: '👂' },
  motora:     { label: 'Def. Motora',          icon: '🦾' },
  dislexia:   { label: 'Dislexia',             icon: '📝' },
  tdah:       { label: 'TDAH',                 icon: '⚡' },
  autismo:    { label: 'Autismo',              icon: '🧩' },
  intelectual:{ label: 'Def. Intelectual',     icon: '🌱' },
};
const SUBJECTS_G = {
  matematica:   'Matemática',
  portugues:    'Português',
  historia:     'História',
  geografia:    'Geografia',
  ciencias:     'Ciências',
  ingles:       'Inglês',
  artes:        'Artes',
  educacao_fis: 'Educação Física',
};

// ─── UI Helpers ────────────────────────────────────────────────────────────
const GUI = {
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
    if (!ov) { ov = document.createElement('div'); ov.id = 'modal-overlay'; ov.className = 'modal-overlay'; document.body.appendChild(ov); }
    ov.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${title}</h2>
          <button class="modal-close" onclick="GUI.closeModal()" aria-label="Fechar"><i class="fas fa-times"></i></button>
        </div>
        <div id="modal-body">${html}</div>
      </div>`;
    ov.classList.remove('hidden');
    ov.addEventListener('click', e => { if (e.target === ov) GUI.closeModal(); }, { once: true });
  },
  closeModal() { document.getElementById('modal-overlay')?.classList.add('hidden'); },
  confirm(msg, cb, danger = false) {
    this.modal(`
      <p style="color:var(--text2);margin-bottom:1.25rem;">${msg}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="GUI.closeModal()">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">Confirmar</button>
      </div>`, 'Confirmar');
    document.getElementById('confirm-ok')?.addEventListener('click', () => { GUI.closeModal(); cb(); });
  },
  setContent(html) {
    const el = document.getElementById('gestor-page-content');
    if (el) { el.innerHTML = html; el.scrollTop = 0; }
  },
  setHeader(title, sub = '') {
    const h = document.getElementById('gestor-page-title');
    const s = document.getElementById('gestor-page-sub');
    if (h) h.textContent = title;
    if (s) s.textContent = sub;
  },
};
window.GUI = GUI;

// ─── Auth ──────────────────────────────────────────────────────────────────
const GAuth = {
  async login(email, password) {
    GUI.spinner(true);
    try {
      const { user } = await API.login(email, password);
      if (user.role !== 'gestor') {
        API.clearToken();
        GUI.spinner(false);
        GUI.toast('Acesso negado. Esta área é exclusiva para gestores.', 'error');
        return;
      }
      GUI.spinner(false);
      GApp.onLogin(user);
    } catch (err) {
      GUI.spinner(false);
      GUI.toast(err.message, 'error');
    }
  },
  logout() {
    API.clearToken();
    GApp.showLogin();
  }
};

// ─── Navegação ─────────────────────────────────────────────────────────────
const GNav = {
  current: 'dashboard',
  go(page, params = {}) {
    this.current = page;
    document.querySelectorAll('.gestor-sidebar .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
      el.setAttribute('aria-current', el.dataset.page === page ? 'page' : 'false');
    });
    // Fechar sidebar mobile ao navegar (overlay + scroll)
    const sidebar = document.getElementById('gestor-sidebar-el');
    const overlay = document.getElementById('gestor-sidebar-overlay');
    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('visible');
    document.body.style.overflow = '';
    GPages.render(page, params);
  }
};

// ─── Páginas ───────────────────────────────────────────────────────────────
const GPages = {
  async render(page, params = {}) {
    switch (page) {
      case 'dashboard': await this.renderDashboard(); break;
      case 'students':  await this.renderStudents(params); break;
      case 'teachers':  await this.renderTeachers(params); break;
      case 'materials': await this.renderMaterials(params); break;
      case 'progress':  await this.renderProgress(params); break;
      case 'settings':  await this.renderSettings(); break;
      default:          await this.renderDashboard();
    }
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async renderDashboard() {
    GUI.setHeader('Dashboard', 'Visão geral da plataforma');
    GUI.spinner(true);
    try {
      const [stats, materialsRes, progressList] = await Promise.all([
        API.getUserStats(),
        API.listMaterials({ limit: 100 }),
        API.getAllProgress()
      ]);
      GUI.spinner(false);

      const materials = materialsRes.data || [];
      const completedQuizzes = progressList.filter(p => p.completed).length;

      // Distribuição de necessidades especiais
      const needsDist = stats.needs;

      GUI.setContent(`
        <!-- Métricas principais -->
        <div class="metrics-grid" role="region" aria-label="Métricas da plataforma">
          ${this._metricCard('Alunos', stats.alunos, 'fas fa-user-graduate', 'purple')}
          ${this._metricCard('Professores', stats.professores, 'fas fa-chalkboard-teacher', 'teal')}
          ${this._metricCard('Materiais', materials.length, 'fas fa-book', 'gold')}
          ${this._metricCard('Quizzes Feitos', completedQuizzes, 'fas fa-check-circle', 'green')}
        </div>

        <div class="grid-2" style="gap:1.25rem;">
          <!-- Necessidades especiais -->
          <div class="card">
            <div class="card-title"><i class="fas fa-universal-access"></i> Perfis de Acessibilidade</div>
            <div class="needs-overview" role="list">
              ${Object.entries(needsDist).map(([k, count]) => `
                <div class="needs-stat" role="listitem" aria-label="${SPECIAL_NEEDS_G[k]?.label || k}: ${count} alunos">
                  <span class="needs-stat-icon">${SPECIAL_NEEDS_G[k]?.icon || '?'}</span>
                  <div>
                    <div class="needs-stat-count">${count}</div>
                    <div class="needs-stat-label">${SPECIAL_NEEDS_G[k]?.label || k}</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <!-- Materiais por disciplina -->
          <div class="card">
            <div class="card-title"><i class="fas fa-chart-pie"></i> Materiais por Disciplina</div>
            <div style="height:220px;position:relative;">
              <canvas id="subjects-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Ações rápidas -->
        <div class="card mt-md">
          <div class="card-title"><i class="fas fa-bolt"></i> Ações Rápidas</div>
          <div style="display:flex;flex-wrap:wrap;gap:.75rem;">
            <button class="btn btn-primary" onclick="GNav.go('students')" aria-label="Gerenciar alunos">
              <i class="fas fa-user-graduate"></i> Alunos
            </button>
            <button class="btn btn-secondary" onclick="GNav.go('teachers')" aria-label="Gerenciar professores">
              <i class="fas fa-chalkboard-teacher"></i> Professores
            </button>
            <button class="btn btn-secondary" onclick="GNav.go('materials')" aria-label="Gerenciar materiais">
              <i class="fas fa-book"></i> Materiais
            </button>
            <button class="btn btn-outline" onclick="GNav.go('progress')" aria-label="Ver relatório de progresso">
              <i class="fas fa-chart-bar"></i> Relatório
            </button>
            <button class="btn btn-gold" onclick="GPages.openCreateUser('aluno')" aria-label="Novo aluno">
              <i class="fas fa-plus"></i> Novo Aluno
            </button>
            <button class="btn btn-outline" onclick="GPages.openCreateUser('professor')" aria-label="Novo professor">
              <i class="fas fa-plus"></i> Novo Professor
            </button>
          </div>
        </div>
      `);

      // Gráfico de disciplinas
      this._renderSubjectsChart(materials);
    } catch (err) {
      GUI.spinner(false);
      GUI.toast('Erro ao carregar dashboard.', 'error');
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

  _renderSubjectsChart(materials) {
    const canvas = document.getElementById('subjects-chart');
    if (!canvas || !window.Chart) return;

    const counts = {};
    materials.forEach(m => { counts[m.subject] = (counts[m.subject] || 0) + 1; });
    const labels = Object.keys(counts).map(k => SUBJECTS_G[k] || k);
    const data   = Object.values(counts);

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#6C63FF','#4ECDC4','#FFD166','#10B981','#F59E0B','#EF4444','#9D97FF','#68B09F'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94A3B8', font: { size: 11 }, padding: 8, boxWidth: 12 } }
        }
      }
    });
  },

  // ── Alunos ─────────────────────────────────────────────────────────────────
  async renderStudents(params = {}) {
    GUI.setHeader('Alunos', 'Gestão de alunos');
    GUI.spinner(true);
    try {
      const res = await API.listUsers({ limit: 100 });
      const users = (res.data || []).filter(u => u.role === 'aluno');
      GUI.spinner(false);

      GUI.setContent(`
        <div class="gestor-table-header">
          <div>
            <div class="gestor-table-title">Lista de Alunos</div>
            <div class="gestor-table-subtitle">${users.length} aluno(s) cadastrado(s)</div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <div class="search-bar" style="width:220px;">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input type="search" id="student-search" placeholder="Buscar…" aria-label="Buscar alunos">
            </div>
            <select class="form-select" id="student-filter-needs" aria-label="Filtrar por necessidade" style="width:auto;">
              <option value="">Todas necessidades</option>
              ${Object.entries(SPECIAL_NEEDS_G).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
            </select>
            <select class="form-select" id="student-filter-turma" aria-label="Filtrar por turma" style="width:auto;">
              <option value="">Todas turmas</option>
              ${Object.entries(TURMAS_G).filter(([k]) => k).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="GPages.openCreateUser('aluno')" aria-label="Adicionar novo aluno">
              <i class="fas fa-plus" aria-hidden="true"></i> Novo Aluno
            </button>
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
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody id="students-tbody">
                ${this._renderStudentRows(users)}
              </tbody>
            </table>
          </div>
        </div>
      `);

      const doFilter = () => {
        const s = document.getElementById('student-search')?.value.toLowerCase() || '';
        const n = document.getElementById('student-filter-needs')?.value || '';
        const t = document.getElementById('student-filter-turma')?.value || '';
        const filtered = users.filter(u =>
          (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)) &&
          (!n || u.special_needs === n) &&
          (!t || u.turma === t)
        );
        const tbody = document.getElementById('students-tbody');
        if (tbody) tbody.innerHTML = this._renderStudentRows(filtered);
      };
      document.getElementById('student-search')?.addEventListener('input', doFilter);
      document.getElementById('student-filter-needs')?.addEventListener('change', doFilter);
      document.getElementById('student-filter-turma')?.addEventListener('change', doFilter);
    } catch (err) {
      GUI.spinner(false);
      GUI.toast('Erro ao carregar alunos.', 'error');
    }
  },

  _renderStudentRows(users) {
    if (!users.length) return `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><h3>Nenhum aluno encontrado</h3></div></td></tr>`;
    return users.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:.6rem;">
            <div class="sidebar-avatar" style="width:30px;height:30px;font-size:.78rem;flex-shrink:0;" aria-hidden="true">
              ${u.name.charAt(0)}
            </div>
            <div>
              <div style="font-weight:600;color:var(--text);">${u.name}</div>
              <div class="text-sm text-muted">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${TURMAS_G[u.turma] || u.turma || '—'}</td>
        <td>
          <span class="sn-tag sn-${u.special_needs || 'none'}">
            ${SPECIAL_NEEDS_G[u.special_needs]?.icon || ''} ${SPECIAL_NEEDS_G[u.special_needs]?.label || 'Nenhuma'}
          </span>
        </td>
        <td><span class="tag tag-gold">${u.points || 0} XP</span></td>
        <td>
          <span class="tag ${u.active !== false ? 'tag-green' : 'tag-red'}">
            <span class="status-dot ${u.active !== false ? 'active' : 'inactive'}"></span>
            ${u.active !== false ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="GPages.openEditUser('${u.id}')" aria-label="Editar aluno ${u.name}">
              <i class="fas fa-edit" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="GNav.go('progress', {userId:'${u.id}'})" aria-label="Ver progresso de ${u.name}">
              <i class="fas fa-chart-bar" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="GPages.confirmDeleteUser('${u.id}', '${u.name}')" aria-label="Desativar aluno ${u.name}">
              <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  },

  // ── Professores ────────────────────────────────────────────────────────────
  async renderTeachers(params = {}) {
    GUI.setHeader('Professores', 'Gestão de professores');
    GUI.spinner(true);
    try {
      const res = await API.listUsers({ limit: 100 });
      const teachers = (res.data || []).filter(u => u.role === 'professor');
      GUI.spinner(false);

      GUI.setContent(`
        <div class="gestor-table-header">
          <div>
            <div class="gestor-table-title">Lista de Professores</div>
            <div class="gestor-table-subtitle">${teachers.length} professor(es)</div>
          </div>
          <div style="display:flex;gap:.5rem;">
            <div class="search-bar" style="width:220px;">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input type="search" id="teacher-search" placeholder="Buscar…" aria-label="Buscar professores">
            </div>
            <button class="btn btn-primary" onclick="GPages.openCreateUser('professor')" aria-label="Adicionar novo professor">
              <i class="fas fa-plus"></i> Novo Professor
            </button>
          </div>
        </div>
        <div class="card">
          <div class="table-wrapper">
            <table aria-label="Tabela de professores">
              <thead>
                <tr>
                  <th scope="col">Professor</th>
                  <th scope="col">Turma</th>
                  <th scope="col">Disciplinas</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody id="teachers-tbody">
                ${this._renderTeacherRows(teachers)}
              </tbody>
            </table>
          </div>
        </div>
      `);

      document.getElementById('teacher-search')?.addEventListener('input', (e) => {
        const s = e.target.value.toLowerCase();
        const filtered = teachers.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
        const tbody = document.getElementById('teachers-tbody');
        if (tbody) tbody.innerHTML = this._renderTeacherRows(filtered);
      });
    } catch (err) {
      GUI.spinner(false);
      GUI.toast('Erro ao carregar professores.', 'error');
    }
  },

  _renderTeacherRows(users) {
    if (!users.length) return `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-chalkboard-teacher"></i><h3>Nenhum professor encontrado</h3></div></td></tr>`;
    return users.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:.6rem;">
            <div class="sidebar-avatar" style="width:30px;height:30px;font-size:.78rem;flex-shrink:0;background:var(--accent3);" aria-hidden="true">${u.name.charAt(0)}</div>
            <div>
              <div style="font-weight:600;color:var(--text);">${u.name}</div>
              <div class="text-sm text-muted">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${TURMAS_G[u.turma] || '—'}</td>
        <td>${(Array.isArray(u.subjects) ? u.subjects : []).map(s => `<span class="tag tag-purple text-sm">${SUBJECTS_G[s] || s}</span>`).join(' ') || '—'}</td>
        <td><span class="tag ${u.active !== false ? 'tag-green' : 'tag-red'}">${u.active !== false ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="GPages.openEditUser('${u.id}')" aria-label="Editar professor ${u.name}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="GPages.confirmDeleteUser('${u.id}', '${u.name}')" aria-label="Desativar professor ${u.name}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');
  },

  // ── Materiais ──────────────────────────────────────────────────────────────
  async renderMaterials(params = {}) {
    GUI.setHeader('Materiais', 'Gestão de materiais didáticos');
    GUI.spinner(true);
    try {
      const res = await API.listMaterials({ limit: 100 });
      const materials = res.data || [];
      GUI.spinner(false);

      GUI.setContent(`
        <div class="gestor-table-header">
          <div>
            <div class="gestor-table-title">Materiais Didáticos</div>
            <div class="gestor-table-subtitle">${materials.length} material(is)</div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <div class="search-bar" style="width:200px;">
              <i class="fas fa-search"></i>
              <input type="search" id="mat-search" placeholder="Buscar…" aria-label="Buscar materiais">
            </div>
            <select class="form-select" id="mat-filter-subj" aria-label="Filtrar disciplina" style="width:auto;">
              <option value="">Todas disciplinas</option>
              ${Object.entries(SUBJECTS_G).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="GPages.openCreateMaterial()" aria-label="Criar novo material">
              <i class="fas fa-plus"></i> Novo Material
            </button>
          </div>
        </div>
        <div class="card">
          <div class="table-wrapper">
            <table aria-label="Tabela de materiais">
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Disciplina</th>
                  <th scope="col">Turma</th>
                  <th scope="col">Professor</th>
                  <th scope="col">A11y</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody id="materials-tbody">
                ${this._renderMaterialRows(materials)}
              </tbody>
            </table>
          </div>
        </div>
      `);

      const doFilter = () => {
        const s = document.getElementById('mat-search')?.value.toLowerCase() || '';
        const subj = document.getElementById('mat-filter-subj')?.value || '';
        const filtered = materials.filter(m =>
          (!s || m.title.toLowerCase().includes(s)) &&
          (!subj || m.subject === subj)
        );
        const tbody = document.getElementById('materials-tbody');
        if (tbody) tbody.innerHTML = this._renderMaterialRows(filtered);
      };
      document.getElementById('mat-search')?.addEventListener('input', doFilter);
      document.getElementById('mat-filter-subj')?.addEventListener('change', doFilter);
    } catch (err) {
      GUI.spinner(false);
      GUI.toast('Erro ao carregar materiais.', 'error');
    }
  },

  _renderMaterialRows(materials) {
    if (!materials.length) return `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-book"></i><h3>Nenhum material encontrado</h3></div></td></tr>`;
    return materials.map(m => {
      const quiz = m.quiz ? JSON.parse(m.quiz) : [];
      const hasA11y = [m.audio_desc, m.libras_url, m.transcript, m.simplified_text].filter(Boolean).length;
      return `
        <tr>
          <td style="font-weight:600;color:var(--text);max-width:200px;">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.title}</div>
          </td>
          <td><span class="tag tag-purple">${SUBJECTS_G[m.subject] || m.subject}</span></td>
          <td>${TURMAS_G[m.turma] || m.turma || '—'}</td>
          <td class="text-sm text-muted">${m.author_name || '—'}</td>
          <td>
            ${m.audio_desc ? '<span class="tag tag-purple" title="Audiodescrição">🔊</span> ' : ''}
            ${m.libras_url  ? '<span class="tag tag-teal" title="Libras">🤟</span> ' : ''}
            ${m.transcript  ? '<span class="tag tag-teal" title="Transcrição">📝</span> ' : ''}
            ${m.simplified_text ? '<span class="tag tag-green" title="Texto simplificado">✏️</span> ' : ''}
            ${quiz.length ? `<span class="tag tag-gold" title="${quiz.length} questões">❓${quiz.length}</span>` : ''}
            ${hasA11y === 0 && !quiz.length ? '<span class="text-muted text-sm">—</span>' : ''}
          </td>
          <td><span class="tag ${m.published ? 'tag-green' : 'tag-gray'}">${m.published ? 'Publicado' : 'Rascunho'}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-secondary" onclick="GPages.openEditMaterial('${m.id}')" aria-label="Editar material ${m.title}"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="GPages.confirmDeleteMaterial('${m.id}', '${m.title.replace(/'/g, '')}')" aria-label="Excluir material ${m.title}"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  // ── Progresso ──────────────────────────────────────────────────────────────
  async renderProgress(params = {}) {
    GUI.setHeader('Relatório de Progresso', 'Acompanhamento por aluno');
    GUI.spinner(true);
    try {
      const [usersRes, materialsRes, progressList] = await Promise.all([
        API.listUsers({ limit: 100 }),
        API.listMaterials({ limit: 100 }),
        API.getAllProgress()
      ]);

      const students  = (usersRes.data || []).filter(u => u.role === 'aluno');
      const materials = materialsRes.data || [];

      // Se há userId nos params, focar naquele aluno
      const targetUser = params.userId
        ? students.find(s => s.id === params.userId)
        : null;

      GUI.spinner(false);

      GUI.setContent(`
        <div class="filter-bar">
          <div class="search-bar" style="width:220px;">
            <i class="fas fa-search"></i>
            <input type="search" id="prog-search" placeholder="Buscar aluno…" aria-label="Buscar aluno" value="${targetUser ? targetUser.name : ''}">
          </div>
          <select class="form-select" id="prog-turma" style="width:auto;" aria-label="Filtrar turma">
            <option value="">Todas turmas</option>
            ${Object.entries(TURMAS_G).filter(([k]) => k).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>

        <div id="progress-content">
          ${this._renderProgressList(
            targetUser ? [targetUser] : students,
            materials, progressList
          )}
        </div>
      `);

      const doFilter = () => {
        const s = document.getElementById('prog-search')?.value.toLowerCase() || '';
        const t = document.getElementById('prog-turma')?.value || '';
        const filtered = students.filter(u =>
          (!s || u.name.toLowerCase().includes(s)) && (!t || u.turma === t)
        );
        const el = document.getElementById('progress-content');
        if (el) el.innerHTML = this._renderProgressList(filtered, materials, progressList);
      };
      document.getElementById('prog-search')?.addEventListener('input', doFilter);
      document.getElementById('prog-turma')?.addEventListener('change', doFilter);
    } catch (err) {
      GUI.spinner(false);
      GUI.toast('Erro ao carregar progresso.', 'error');
    }
  },

  _renderProgressList(students, materials, progressList) {
    if (!students.length) return `<div class="empty-state"><i class="fas fa-chart-bar"></i><h3>Nenhum aluno encontrado</h3></div>`;

    return students.map(student => {
      const studentProgress = progressList.filter(p => p.user_id === student.id);
      const completed = studentProgress.filter(p => p.completed).length;
      const total = materials.length;
      const pct = total ? Math.round((completed / total) * 100) : 0;
      const avgScore = studentProgress.length
        ? Math.round(studentProgress.reduce((acc, p) => acc + ((p.score / Math.max(p.max_score, 1)) * 100), 0) / studentProgress.length)
        : 0;

      return `
        <div class="card mb-md">
          <div class="report-header">
            <div class="report-avatar" aria-hidden="true">${student.name.charAt(0)}</div>
            <div>
              <div class="report-title">${student.name}</div>
              <div class="report-sub">
                ${TURMAS_G[student.turma] || '—'} &middot;
                ${SPECIAL_NEEDS_G[student.special_needs]?.icon || ''} ${SPECIAL_NEEDS_G[student.special_needs]?.label || ''}
                &middot; ${student.points || 0} XP
              </div>
              <div style="display:flex;gap:.75rem;margin-top:.5rem;">
                <span class="tag tag-green">${completed}/${total} materiais</span>
                <span class="tag tag-purple">${pct}% concluído</span>
                <span class="tag tag-gold">${avgScore}% média quiz</span>
              </div>
            </div>
          </div>

          <div class="material-progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso: ${pct}%">
            <div class="material-progress-fill" style="width:${pct}%"></div>
          </div>

          <div style="margin-top:.85rem;">
            ${materials.slice(0, 6).map(m => {
              const prog = studentProgress.find(p => p.material_id === m.id);
              const done = prog?.completed;
              const score = prog ? Math.round((prog.score / Math.max(prog.max_score, 1)) * 100) : null;
              return `
                <div class="material-progress-item">
                  <i class="status-icon fas fa-${done ? 'check-circle done' : 'circle pending'}" aria-label="${done ? 'Concluído' : 'Pendente'}"></i>
                  <span class="title">${m.title}</span>
                  ${score !== null ? `<span class="score">${score}%</span>` : '<span class="score" style="color:var(--text3)">—</span>'}
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');
  },

  // ── Configurações ──────────────────────────────────────────────────────────
  renderSettings() {
    GUI.setHeader('Configurações', 'Ajustes da plataforma');
    const prefs = A11y.getPrefs();

    GUI.setContent(`
      <div class="grid-2" style="gap:1.25rem;align-items:start;">
        <div class="card">
          <div class="card-title"><i class="fas fa-universal-access"></i> Acessibilidade do Painel</div>
          <div class="a11y-switch-row">
            <span>Alto Contraste</span>
            <label class="a11y-switch" aria-label="Alto contraste">
              <input type="checkbox" ${prefs.highContrast ? 'checked' : ''} onchange="A11y.toggle('highContrast')">
              <span class="a11y-switch-slider"></span>
            </label>
          </div>
          <div class="a11y-switch-row">
            <span>Reduzir Animações</span>
            <label class="a11y-switch" aria-label="Reduzir animações">
              <input type="checkbox" ${prefs.reduceMotion ? 'checked' : ''} onchange="A11y.toggle('reduceMotion')">
              <span class="a11y-switch-slider"></span>
            </label>
          </div>
          <div style="margin-top:.75rem;">
            <label class="form-label">Tamanho da Fonte</label>
            <div style="display:flex;gap:.4rem;">
              <button class="btn btn-sm ${prefs.fontSize === 'normal' ? 'btn-primary' : 'btn-secondary'}" onclick="A11y.setFontSize('normal')">Normal</button>
              <button class="btn btn-sm ${prefs.fontSize === 'large' ? 'btn-primary' : 'btn-secondary'}" onclick="A11y.setFontSize('large')">Grande</button>
              <button class="btn btn-sm ${prefs.fontSize === 'xlarge' ? 'btn-primary' : 'btn-secondary'}" onclick="A11y.setFontSize('xlarge')">Extra</button>
            </div>
          </div>
          <button class="btn btn-outline btn-full mt-md" onclick="A11y.openPanel()">
            <i class="fas fa-sliders-h"></i> Painel Avançado
          </button>
        </div>

        <div class="card">
          <div class="card-title"><i class="fas fa-info-circle"></i> Sobre a Plataforma</div>
          <p class="text-sm text-muted mb-md">RAPIN v2.0 — Rede de Apoio Pedagógico e Inclusão Neuroeducacional</p>
          <div style="color:var(--text2);font-size:.82rem;line-height:1.7;">
            <p><strong>Perfis de acessibilidade:</strong></p>
            <ul style="padding-left:1rem;margin-top:.5rem;">
              ${Object.entries(SPECIAL_NEEDS_G).filter(([k]) => k !== 'none').map(([k, v]) => `<li>${v.icon} <strong>${v.label}</strong></li>`).join('')}
            </ul>
          </div>
          <div class="danger-zone mt-md">
            <h5><i class="fas fa-exclamation-triangle"></i> Zona de Perigo</h5>
            <p>Ao sair, sua sessão será encerrada.</p>
            <button class="btn btn-danger btn-sm" onclick="GAuth.logout()">
              <i class="fas fa-sign-out-alt"></i> Encerrar Sessão
            </button>
          </div>
        </div>
      </div>
    `);
  },

  // ── Modais CRUD Usuário ───────────────────────────────────────────────────
  openCreateUser(role = 'aluno') {
    GUI.modal(`
      <form id="user-form">
        <div class="form-group">
          <label class="form-label" for="uf-name">Nome *</label>
          <input class="form-input" type="text" id="uf-name" required aria-required="true">
        </div>
        <div class="form-group">
          <label class="form-label" for="uf-email">E-mail *</label>
          <input class="form-input" type="email" id="uf-email" required aria-required="true">
        </div>
        <div class="form-group">
          <label class="form-label" for="uf-password">Senha *</label>
          <input class="form-input" type="password" id="uf-password" placeholder="mínimo 6 caracteres" required aria-required="true">
        </div>
        <div class="form-group">
          <label class="form-label" for="uf-turma">Turma</label>
          <select class="form-select" id="uf-turma" aria-label="Selecionar turma">
            ${Object.entries(TURMAS_G).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        ${role === 'aluno' ? `
          <div class="form-group">
            <label class="form-label" for="uf-needs">Necessidades Especiais</label>
            <select class="form-select" id="uf-needs" aria-label="Selecionar necessidade especial">
              ${Object.entries(SPECIAL_NEEDS_G).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>` : `
          <div class="form-group">
            <label class="form-label">Disciplinas</label>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem;" id="uf-subjects">
              ${Object.entries(SUBJECTS_G).map(([k, v]) => `
                <label style="display:flex;align-items:center;gap:.3rem;font-size:.8rem;cursor:pointer;">
                  <input type="checkbox" value="${k}" style="cursor:pointer;"> ${v}
                </label>`).join('')}
            </div>
          </div>`}
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="GUI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Criar ${role === 'aluno' ? 'Aluno' : 'Professor'}
          </button>
        </div>
      </form>
    `, `Novo ${role === 'aluno' ? 'Aluno' : 'Professor'}`);

    document.getElementById('user-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name     = document.getElementById('uf-name')?.value.trim();
      const email    = document.getElementById('uf-email')?.value.trim();
      const password = document.getElementById('uf-password')?.value;
      const turma    = document.getElementById('uf-turma')?.value;

      if (!name || !email || !password || password.length < 6) {
        GUI.toast('Preencha todos os campos. Senha mínimo 6 caracteres.', 'error'); return;
      }

      const data = { name, email, password, role, turma, active: true };
      if (role === 'aluno') {
        data.special_needs = document.getElementById('uf-needs')?.value || 'none';
        data.points = 0; data.level = 1;
      } else {
        data.subjects = Array.from(document.querySelectorAll('#uf-subjects input:checked')).map(i => i.value);
      }

      GUI.spinner(true);
      try {
        await API.createUser(data);
        GUI.spinner(false);
        GUI.closeModal();
        GUI.toast(`${role === 'aluno' ? 'Aluno' : 'Professor'} criado com sucesso!`, 'success');
        GNav.go(role === 'aluno' ? 'students' : 'teachers');
      } catch (err) { GUI.spinner(false); GUI.toast(err.message, 'error'); }
    });
  },

  async openEditUser(id) {
    GUI.spinner(true);
    let user;
    try { user = await API.fetchUser(id); GUI.spinner(false); } catch { GUI.spinner(false); return; }

    const isAluno = user.role === 'aluno';
    GUI.modal(`
      <form id="edit-user-form">
        <div class="form-group">
          <label class="form-label" for="eu-name">Nome</label>
          <input class="form-input" type="text" id="eu-name" value="${user.name}" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="eu-email">E-mail</label>
          <input class="form-input" type="email" id="eu-email" value="${user.email}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label" for="eu-turma">Turma</label>
          <select class="form-select" id="eu-turma">
            ${Object.entries(TURMAS_G).map(([k, v]) => `<option value="${k}" ${user.turma === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        ${isAluno ? `
          <div class="form-group">
            <label class="form-label" for="eu-needs">Necessidade Especial</label>
            <select class="form-select" id="eu-needs">
              ${Object.entries(SPECIAL_NEEDS_G).map(([k, v]) => `<option value="${k}" ${user.special_needs === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>` : ''}
        <div class="form-group">
          <label class="form-label" for="eu-active">Status</label>
          <select class="form-select" id="eu-active">
            <option value="true" ${user.active !== false ? 'selected' : ''}>Ativo</option>
            <option value="false" ${user.active === false ? 'selected' : ''}>Inativo</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="GUI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar</button>
        </div>
      </form>
    `, `Editar: ${user.name}`);

    document.getElementById('edit-user-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name:   document.getElementById('eu-name')?.value.trim(),
        turma:  document.getElementById('eu-turma')?.value,
        active: document.getElementById('eu-active')?.value === 'true',
      };
      if (isAluno) data.special_needs = document.getElementById('eu-needs')?.value;

      GUI.spinner(true);
      try {
        await API.updateUser(id, data);
        GUI.spinner(false);
        GUI.closeModal();
        GUI.toast('Usuário atualizado!', 'success');
        GNav.go(isAluno ? 'students' : 'teachers');
      } catch (err) { GUI.spinner(false); GUI.toast(err.message, 'error'); }
    });
  },

  confirmDeleteUser(id, name) {
    GUI.confirm(`Desativar o usuário <strong>${name}</strong>?`, async () => {
      GUI.spinner(true);
      try {
        await API.deleteUser(id);
        GUI.spinner(false);
        GUI.toast('Usuário desativado.', 'success');
        GNav.go(GNav.current);
      } catch (err) { GUI.spinner(false); GUI.toast(err.message, 'error'); }
    }, true);
  },

  // ── Modal CRUD Material ───────────────────────────────────────────────────
  openCreateMaterial() {
    this._openMaterialForm(null);
  },

  async openEditMaterial(id) {
    GUI.spinner(true);
    let mat;
    try { mat = await API.getMaterial(id); GUI.spinner(false); } catch { GUI.spinner(false); return; }
    this._openMaterialForm(mat);
  },

  _openMaterialForm(mat) {
    const isEdit = !!mat;
    const quiz = mat?.quiz ? JSON.parse(mat.quiz) : [];

    GUI.modal(`
      <div class="material-sections-nav" role="tablist">
        <button class="material-section-tab active" role="tab" data-tab="basic">Básico</button>
        <button class="material-section-tab" role="tab" data-tab="content">Conteúdo</button>
        <button class="material-section-tab" role="tab" data-tab="a11y">Acessibilidade</button>
        <button class="material-section-tab" role="tab" data-tab="quiz">Quiz</button>
      </div>

      <form id="material-form">
        <!-- Tab: Básico -->
        <div id="tab-basic">
          <div class="form-group">
            <label class="form-label" for="mf-title">Título *</label>
            <input class="form-input" type="text" id="mf-title" value="${mat?.title || ''}" required aria-required="true">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="mf-subject">Disciplina</label>
              <select class="form-select" id="mf-subject">
                ${Object.entries(SUBJECTS_G).map(([k, v]) => `<option value="${k}" ${mat?.subject === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="mf-turma">Turma</label>
              <select class="form-select" id="mf-turma">
                ${Object.entries(TURMAS_G).map(([k, v]) => `<option value="${k}" ${mat?.turma === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="mf-desc">Descrição</label>
            <input class="form-input" type="text" id="mf-desc" value="${mat?.description || ''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="mf-video">URL do Vídeo (YouTube embed)</label>
            <input class="form-input" type="text" id="mf-video" placeholder="https://www.youtube.com/embed/..." value="${mat?.video_url || ''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="mf-published">Status</label>
            <select class="form-select" id="mf-published">
              <option value="true" ${mat?.published !== false ? 'selected' : ''}>Publicado</option>
              <option value="false" ${mat?.published === false ? 'selected' : ''}>Rascunho</option>
            </select>
          </div>
        </div>

        <!-- Tab: Conteúdo -->
        <div id="tab-content" class="hidden">
          <div class="form-group">
            <label class="form-label" for="mf-content">Conteúdo Principal *</label>
            <textarea class="form-textarea" id="mf-content" rows="8"
              placeholder="Escreva o conteúdo da aula aqui...">${mat?.content || ''}</textarea>
          </div>
        </div>

        <!-- Tab: Acessibilidade -->
        <div id="tab-a11y" class="hidden">
          <div class="material-a11y-panel">
            <h5><i class="fas fa-universal-access"></i> Recursos de Acessibilidade</h5>
            <div class="form-group">
              <label class="form-label" for="mf-audio">Audiodescrição (URL do áudio)</label>
              <input class="form-input" type="text" id="mf-audio" value="${mat?.audio_desc || ''}" placeholder="https://...">
              <p class="form-hint">Arquivo de áudio com descrição do conteúdo para deficientes visuais.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="mf-libras">URL Vídeo Libras</label>
              <input class="form-input" type="text" id="mf-libras" value="${mat?.libras_url || ''}" placeholder="https://...">
              <p class="form-hint">Vídeo com interpretação em Libras para deficientes auditivos.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="mf-transcript">Transcrição do Conteúdo</label>
              <textarea class="form-textarea" id="mf-transcript" rows="4"
                placeholder="Transcrição em texto do vídeo/áudio...">${mat?.transcript || ''}</textarea>
              <p class="form-hint">Texto completo para deficientes auditivos e uso de leitores de tela.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="mf-simplified">Versão Simplificada</label>
              <textarea class="form-textarea" id="mf-simplified" rows="4"
                placeholder="Versão simplificada do conteúdo para deficiência intelectual...">${mat?.simplified_text || ''}</textarea>
              <p class="form-hint">Texto com linguagem simples e direta para deficiência intelectual/autismo.</p>
            </div>
          </div>
        </div>

        <!-- Tab: Quiz -->
        <div id="tab-quiz" class="hidden">
          <div class="quiz-builder">
            <div class="quiz-builder-header">
              <span class="quiz-builder-title">Questões do Quiz</span>
              <button type="button" class="btn btn-sm btn-outline" id="add-question-btn">
                <i class="fas fa-plus"></i> Adicionar Questão
              </button>
            </div>
            <div id="quiz-questions-container">
              ${quiz.map((q, qi) => this._renderQuizQuestionInput(qi, q)).join('')}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="GUI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> ${isEdit ? 'Salvar' : 'Criar'} Material
          </button>
        </div>
      </form>
    `, isEdit ? `Editar: ${mat.title}` : 'Novo Material');

    // Tabs
    document.querySelectorAll('.material-section-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.material-section-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        ['basic','content','a11y','quiz'].forEach(id => {
          document.getElementById(`tab-${id}`)?.classList.toggle('hidden', id !== tab.dataset.tab);
        });
      });
    });

    // Adicionar questão
    let qCount = quiz.length;
    document.getElementById('add-question-btn')?.addEventListener('click', () => {
      const container = document.getElementById('quiz-questions-container');
      const div = document.createElement('div');
      div.innerHTML = this._renderQuizQuestionInput(qCount, null);
      container?.appendChild(div.firstElementChild);
      qCount++;
    });

    // Submit
    document.getElementById('material-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title   = document.getElementById('mf-title')?.value.trim();
      const content = document.getElementById('mf-content')?.value.trim();
      if (!title || !content) { GUI.toast('Título e conteúdo são obrigatórios.', 'error'); return; }

      // Coletar quiz
      const quizData = [];
      document.querySelectorAll('.quiz-question-block').forEach(block => {
        const qText = block.querySelector('.qb-question')?.value.trim();
        if (!qText) return;
        const options = Array.from(block.querySelectorAll('.qb-option')).map(o => o.value.trim()).filter(Boolean);
        const correctRadio = block.querySelector('.qb-correct:checked');
        const correct = correctRadio ? parseInt(correctRadio.value) : 0;
        quizData.push({ question: qText, options: options.map(t => ({ text: t, isCorrect: false })), correct });
      });

      const data = {
        title,
        subject:          document.getElementById('mf-subject')?.value,
        turma:            document.getElementById('mf-turma')?.value,
        description:      document.getElementById('mf-desc')?.value,
        video_url:        document.getElementById('mf-video')?.value,
        content,
        audio_desc:       document.getElementById('mf-audio')?.value,
        libras_url:       document.getElementById('mf-libras')?.value,
        transcript:       document.getElementById('mf-transcript')?.value,
        simplified_text:  document.getElementById('mf-simplified')?.value,
        quiz:             JSON.stringify(quizData),
        published:        document.getElementById('mf-published')?.value === 'true',
        tags:             [],
      };

      GUI.spinner(true);
      try {
        if (isEdit) {
          await API.updateMaterial(mat.id, data);
          GUI.toast('Material atualizado!', 'success');
        } else {
          await API.createMaterial(data);
          GUI.toast('Material criado!', 'success');
        }
        GUI.spinner(false);
        GUI.closeModal();
        GNav.go('materials');
      } catch (err) { GUI.spinner(false); GUI.toast(err.message, 'error'); }
    });
  },

  _renderQuizQuestionInput(idx, q) {
    const opts = q?.options || [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
    return `
      <div class="quiz-question-block" data-idx="${idx}">
        <div class="quiz-question-num-label">Questão ${idx + 1}</div>
        <div class="form-group">
          <input class="form-input qb-question" type="text" placeholder="Texto da questão…" value="${q?.question || ''}">
        </div>
        <div class="quiz-options-builder">
          ${opts.map((o, oi) => `
            <div class="quiz-option-input-row">
              <input type="radio" name="correct_${idx}" class="qb-correct" value="${oi}" ${q?.correct === oi ? 'checked' : ''} title="Resposta correta">
              <input class="form-input qb-option" type="text" placeholder="Opção ${String.fromCharCode(65 + oi)}" value="${o.text || o || ''}">
            </div>`).join('')}
        </div>
        <div class="quiz-correct-label">☝️ Marque o radio da resposta correta</div>
      </div>`;
  },

  confirmDeleteMaterial(id, title) {
    GUI.confirm(`Excluir o material <strong>${title}</strong>? Esta ação não pode ser desfeita.`, async () => {
      GUI.spinner(true);
      try {
        await API.deleteMaterial(id);
        GUI.spinner(false);
        GUI.toast('Material excluído.', 'success');
        GNav.go('materials');
      } catch (err) { GUI.spinner(false); GUI.toast(err.message, 'error'); }
    }, true);
  },
};
window.GPages = GPages;

// ─── App Principal ────────────────────────────────────────────────────────
const GApp = {
  init() {
    this._buildLogin();
    this._setupSidebar();
    A11y.init();

    if (API.isAuthenticated() && API.getRole() === 'gestor') {
      API.getMe().then(user => this.onLogin(user)).catch(() => this.showLogin());
    } else {
      this.showLogin();
    }
  },

  onLogin(user) {
    document.getElementById('gestor-login')?.classList.add('hidden');
    document.getElementById('gestor-app')?.classList.remove('hidden');
    this._updateSidebarUser(user);
    GNav.go('dashboard');
  },

  showLogin() {
    document.getElementById('gestor-app')?.classList.add('hidden');
    document.getElementById('gestor-login')?.classList.remove('hidden');
  },

  _buildLogin() {
    const screen = document.getElementById('gestor-login');
    if (!screen) return;
    screen.innerHTML = `
      <div class="gestor-login-box">
        <div class="gestor-logo">
          <i class="fas fa-shield-alt" aria-hidden="true"></i>
          <h1>Painel do Gestor</h1>
          <p>RAPIN — Gestão Escolar</p>
        </div>
        <form id="gestor-login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="gestor-email">E-mail</label>
            <input class="form-input" type="email" id="gestor-email" placeholder="gestor@escola.edu.br"
              required autocomplete="email" aria-required="true">
          </div>
          <div class="form-group">
            <label class="form-label" for="gestor-password">Senha</label>
            <input class="form-input" type="password" id="gestor-password" placeholder="••••••••"
              required autocomplete="current-password" aria-required="true">
          </div>
          <button type="submit" class="btn btn-gold btn-full btn-lg">
            <i class="fas fa-sign-in-alt" aria-hidden="true"></i> Entrar como Gestor
          </button>
        </form>
        <div class="login-footer" style="margin-top:1rem;">
          <p>Acesso exclusivo para gestores escolares.</p>
          <p><strong>nome@gestor.edu.pi.gov.br</strong> / gestor123</p>
          <p><a href="index.html">← Área do Aluno/Professor</a></p>
        </div>
      </div>`;

    document.getElementById('gestor-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('gestor-email')?.value.trim();
      const password = document.getElementById('gestor-password')?.value;
      if (!email || !password) { GUI.toast('Preencha e-mail e senha.', 'error'); return; }
      await GAuth.login(email, password);
    });
  },

  _setupSidebar() {
    const sidebar    = document.getElementById('gestor-sidebar-el');
    const overlay    = document.getElementById('gestor-sidebar-overlay');
    const openBtn    = document.getElementById('gestor-mobile-open');

    /** Abre a sidebar mobile */
    const openMobile = () => {
      sidebar?.classList.add('mobile-open');
      overlay?.classList.add('visible');
      overlay?.removeAttribute('aria-hidden');
      openBtn?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    /** Fecha a sidebar mobile */
    const closeMobile = () => {
      sidebar?.classList.remove('mobile-open');
      overlay?.classList.remove('visible');
      overlay?.setAttribute('aria-hidden', 'true');
      openBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    // Botão hambúrguer (header da topbar)
    openBtn?.addEventListener('click', () => {
      sidebar?.classList.contains('mobile-open') ? closeMobile() : openMobile();
    });

    // Botão dentro da sidebar (já existente no HTML, serve de toggle também)
    document.getElementById('gestor-mobile-toggle')?.addEventListener('click', () => {
      sidebar?.classList.contains('mobile-open') ? closeMobile() : openMobile();
    });

    // Clicar no overlay fecha
    overlay?.addEventListener('click', closeMobile);

    // ESC fecha
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sidebar?.classList.contains('mobile-open')) closeMobile();
    });

    // Navegar fecha sidebar no mobile
    document.querySelectorAll('.gestor-sidebar .nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        GNav.go(item.dataset.page);
        if (window.innerWidth <= 960) closeMobile();
      });
    });

    document.getElementById('gestor-logout-btn')?.addEventListener('click', () => {
      GUI.confirm('Deseja sair?', () => GAuth.logout());
    });
  },

  _updateSidebarUser(user) {
    const av = document.getElementById('gestor-avatar');
    const nm = document.getElementById('gestor-user-name');
    const rl = document.getElementById('gestor-user-role');
    if (av) av.textContent = user.name.charAt(0).toUpperCase();
    if (nm) nm.textContent = user.name;
    if (rl) rl.textContent = 'Gestor Escolar';
  }
};

document.addEventListener('DOMContentLoaded', () => { GApp.init(); });
