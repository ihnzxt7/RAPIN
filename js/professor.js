/**
 * RAPIN — Controlador do Painel do Professor  v2
 * Reescrito para responsividade e organização correta.
 */
'use strict';

/* ─── Constantes ─────────────────────────────────────────────── */
const TURMAS_P = {
  '':     'Sem turma',
  '1ano': '1º Ano',
  '2ano': '2º Ano',
  '3ano': '3º Ano',
};
const NEEDS_P = {
  none:        { label: 'Nenhuma',        icon: '👤' },
  visual:      { label: 'Def. Visual',    icon: '👁️' },
  auditiva:    { label: 'Def. Auditiva',  icon: '👂' },
  motora:      { label: 'Def. Motora',    icon: '🦾' },
  dislexia:    { label: 'Dislexia',       icon: '📝' },
  tdah:        { label: 'TDAH',           icon: '⚡' },
  autismo:     { label: 'Autismo',        icon: '🧩' },
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
  educacao_fis: 'Ed. Física',
};

/* ─── ProfAPI ────────────────────────────────────────────────── */
const ProfAPI = {
  async myMaterials() {
    const user = API.getUser();
    const res  = await API.listMaterials({ limit: 200 });
    return (res.data || []).filter(m => m.author_id === user.id);
  },
  async myStudents(params = {}) {
    const qs = new URLSearchParams({ limit: 200, ...params }).toString();
    return API._req('GET', `${API.BASE}/users/meus-alunos?${qs}`);
  },
  async allProgress() {
    const res = await API._req('GET', `${API.BASE}/progress?limit=1000`);
    return res.data || [];
  },
};

/* ─── PUI — helpers de interface ─────────────────────────────── */
const PUI = {
  setContent(html) {
    const el = document.getElementById('prof-main-content');
    if (el) { el.innerHTML = html; el.scrollTop = 0; }
  },
  setHeader(title, sub = '') {
    const h = document.getElementById('prof-page-title');
    const s = document.getElementById('prof-page-sub');
    if (h) h.textContent = title;
    if (s) s.textContent = sub;
  },
  spinner(show) {
    document.getElementById('global-spinner')?.classList.toggle('hidden', !show);
  },
  toast(msg, type = 'info', ms = 3500) {
    const icons = { info:'info-circle', success:'check-circle', error:'exclamation-circle', warning:'exclamation-triangle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.setAttribute('role', 'status');
    t.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i> ${msg}`;
    document.getElementById('toast-container')?.appendChild(t);
    setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 350); }, ms);
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
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title-el">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title-el">${title}</h2>
          <button class="modal-close" onclick="PUI.closeModal()" aria-label="Fechar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="modal-body">${html}</div>
      </div>`;
    ov.classList.remove('hidden');
    ov.addEventListener('click', e => { if (e.target === ov) PUI.closeModal(); }, { once: true });
    // Foco no modal para acessibilidade
    setTimeout(() => ov.querySelector('.modal')?.focus(), 50);
  },
  closeModal() {
    document.getElementById('modal-overlay')?.classList.add('hidden');
  },
  confirm(msg, cb, danger = false) {
    this.modal(`
      <p style="color:var(--text2);margin-bottom:1.25rem;">${msg}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="PUI.closeModal()">Cancelar</button>
        <button class="btn ${danger?'btn-danger':'btn-primary'}" id="confirm-ok">Confirmar</button>
      </div>`, 'Confirmar');
    document.getElementById('confirm-ok')?.addEventListener('click', () => { PUI.closeModal(); cb(); });
  },
  announce(msg) {
    const el = document.getElementById('sr-announcer');
    if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 50); }
  },
};
window.PUI = PUI;

/* ─── PNav ───────────────────────────────────────────────────── */
const PNav = {
  current: 'dashboard',
  go(page, params = {}) {
    this.current = page;
    document.querySelectorAll('#prof-sidebar-el .nav-item').forEach(el => {
      const active = el.dataset.page === page;
      el.classList.toggle('active', active);
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });
    PSidebar.close();
    PPages.render(page, params);
  },
};

/* ─── PSidebar ───────────────────────────────────────────────── */
const PSidebar = {
  open() {
    const sidebar  = document.getElementById('prof-sidebar-el');
    const overlay  = document.getElementById('prof-sidebar-overlay');
    const hamburger = document.getElementById('prof-mobile-open');
    sidebar?.classList.add('mobile-open');
    overlay?.classList.add('visible');
    overlay?.removeAttribute('aria-hidden');
    hamburger?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  },
  close() {
    const sidebar  = document.getElementById('prof-sidebar-el');
    const overlay  = document.getElementById('prof-sidebar-overlay');
    const hamburger = document.getElementById('prof-mobile-open');
    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('visible');
    overlay?.setAttribute('aria-hidden', 'true');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  },
  toggle() {
    const open = document.getElementById('prof-sidebar-el')?.classList.contains('mobile-open');
    open ? this.close() : this.open();
  },
  init() {
    document.getElementById('prof-mobile-open')?.addEventListener('click', () => this.toggle());
    document.getElementById('prof-sidebar-close')?.addEventListener('click', () => this.close());
    document.getElementById('prof-sidebar-overlay')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
    // Nav items
    document.querySelectorAll('#prof-sidebar-el .nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => PNav.go(item.dataset.page));
    });
    // Logout
    document.getElementById('prof-logout-btn')?.addEventListener('click', () => {
      PUI.confirm('Deseja sair do painel?', () => {
        API.clearToken();
        PApp.showLogin();
      });
    });
  },
};

/* ─── PPages ─────────────────────────────────────────────────── */
const PPages = {

  render(page, params = {}) {
    switch (page) {
      case 'dashboard': return this.renderDashboard();
      case 'materials': return this.renderMaterials();
      case 'students':  return this.renderStudents();
      case 'progress':  return this.renderProgress(params);
      default:          return this.renderDashboard();
    }
  },

  /* ─── DASHBOARD ─────────────────────────────────────────────── */
  async renderDashboard() {
    const user = API.getUser();
    PUI.setHeader('Início', `Olá, ${user?.name?.split(' ')[0] || 'Professor'}!`);
    PUI.announce('Carregando dashboard');
    PUI.spinner(true);
    try {
      const [materials, studentsRes, progress] = await Promise.all([
        ProfAPI.myMaterials(),
        ProfAPI.myStudents(),
        ProfAPI.allProgress(),
      ]);
      PUI.spinner(false);

      const students  = studentsRes.data || [];
      const published = materials.filter(m => m.published).length;
      const drafts    = materials.filter(m => !m.published).length;

      const studentsRanked = students.map(s => {
        const sp  = progress.filter(p => p.user_id === s.id && p.completed);
        const avg = sp.length
          ? Math.round(sp.reduce((a, p) => a + (p.score / Math.max(p.max_score, 1)) * 100, 0) / sp.length)
          : 0;
        return { ...s, completedMats: sp.length, avgScore: avg };
      }).sort((a, b) => b.avgScore - a.avgScore);

      const turmaAvg = studentsRanked.length
        ? Math.round(studentsRanked.reduce((a, s) => a + s.avgScore, 0) / studentsRanked.length)
        : 0;

      PUI.setContent(`
        <!-- Métricas -->
        <div class="metrics-grid" role="region" aria-label="Resumo do painel">
          ${this._metric('Meus Materiais', materials.length,  'fas fa-book-open',    'purple')}
          ${this._metric('Publicados',     published,          'fas fa-check-circle', 'green')}
          ${this._metric('Meus Alunos',    students.length,    'fas fa-user-graduate','teal')}
          ${this._metric('Média da Turma', turmaAvg + '%',     'fas fa-chart-bar',    'gold')}
        </div>

        <!-- Grid: materiais + ranking -->
        <div class="grid-2">
          <!-- Materiais recentes -->
          <div class="card">
            <div class="card-title"><i class="fas fa-book-open"></i> Materiais Recentes</div>
            ${materials.length === 0
              ? `<div class="empty-state" style="padding:1rem 0;">
                   <i class="fas fa-book"></i>
                   <p>Nenhum material criado ainda.</p>
                   <button class="btn btn-primary btn-sm" onclick="PPages.openCreateMaterial()">
                     <i class="fas fa-plus"></i> Criar agora
                   </button>
                 </div>`
              : `<div class="table-wrapper">
                   <table aria-label="Materiais recentes">
                     <thead><tr>
                       <th>Título</th><th>Disciplina</th><th>Status</th><th></th>
                     </tr></thead>
                     <tbody>
                       ${materials.slice(0, 5).map(m => `
                         <tr>
                           <td style="font-weight:600;max-width:150px;">
                             <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.title}</div>
                           </td>
                           <td><span class="tag tag-purple">${SUBJECTS_P[m.subject] || m.subject || '—'}</span></td>
                           <td><span class="tag ${m.published?'tag-green':'tag-gray'}">${m.published?'Publicado':'Rascunho'}</span></td>
                           <td>
                             <button class="btn btn-sm btn-secondary"
                               onclick="PPages.openEditMaterial('${m.id}')"
                               aria-label="Editar ${m.title}">
                               <i class="fas fa-edit"></i>
                             </button>
                           </td>
                         </tr>`).join('')}
                     </tbody>
                   </table>
                 </div>
                 <button class="btn btn-outline btn-full" style="margin-top:.65rem;" onclick="PNav.go('materials')">
                   Ver todos →
                 </button>`}
          </div>

          <!-- Ranking da turma -->
          <div class="card">
            <div class="card-title"><i class="fas fa-trophy"></i> Ranking da Turma</div>
            ${studentsRanked.length === 0
              ? `<p class="text-muted text-sm">Nenhum progresso registrado ainda.</p>`
              : `<div class="ranking-list" role="list">
                   ${studentsRanked.slice(0, 6).map((s, i) => `
                     <div class="ranking-item" role="listitem"
                       style="cursor:pointer;" tabindex="0"
                       onclick="PNav.go('progress',{userId:'${s.id}'})"
                       onkeypress="if(event.key==='Enter')PNav.go('progress',{userId:'${s.id}'})">
                       <span class="ranking-pos ${i===0?'gold-pos':i===1?'silver-pos':i===2?'bronze-pos':''}"
                         aria-label="Posição ${i+1}">
                         ${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}
                       </span>
                       <div class="sidebar-avatar" style="width:28px;height:28px;font-size:.73rem;flex-shrink:0;"
                         aria-hidden="true">${s.name.charAt(0)}</div>
                       <span class="ranking-name">${s.name}</span>
                       <span class="ranking-pts">${s.avgScore}%</span>
                     </div>`).join('')}
                 </div>
                 <button class="btn btn-outline btn-full" style="margin-top:.65rem;" onclick="PNav.go('progress')">
                   Relatório completo →
                 </button>`}
          </div>
        </div>

        <!-- Ações rápidas -->
        <div class="card">
          <div class="card-title"><i class="fas fa-bolt"></i> Ações Rápidas</div>
          <div class="prof-quick-actions">
            <button class="btn btn-primary"   onclick="PPages.openCreateMaterial()"><i class="fas fa-plus"></i> Novo Material</button>
            <button class="btn btn-secondary" onclick="PNav.go('materials')"><i class="fas fa-book-open"></i> Meus Materiais</button>
            <button class="btn btn-secondary" onclick="PNav.go('students')"><i class="fas fa-user-graduate"></i> Meus Alunos</button>
            <button class="btn btn-outline"   onclick="PNav.go('progress')"><i class="fas fa-chart-bar"></i> Desempenho</button>
          </div>
        </div>

        ${drafts > 0 ? `
          <div class="card prof-draft-alert">
            <div class="card-title"><i class="fas fa-exclamation-circle"></i> Rascunhos pendentes</div>
            <p class="text-sm text-muted">
              Você tem <strong>${drafts} material(is)</strong> em rascunho ainda não publicados.
            </p>
            <button class="btn btn-sm btn-outline" style="margin-top:.5rem;" onclick="PNav.go('materials')">
              Ver rascunhos
            </button>
          </div>` : ''}
      `);
      PUI.announce('Dashboard carregado');
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar dashboard.', 'error');
      console.error(err);
    }
  },

  _metric(label, value, icon, color) {
    return `
      <div class="metric-card ${color}" role="group" aria-label="${label}: ${value}">
        <div class="metric-value">${value}</div>
        <div class="metric-label">${label}</div>
        <i class="${icon} metric-icon" aria-hidden="true"></i>
      </div>`;
  },

  /* ─── MATERIAIS ─────────────────────────────────────────────── */
  async renderMaterials() {
    PUI.setHeader('Meus Materiais', 'Crie, edite e publique seus materiais');
    PUI.spinner(true);
    try {
      const materials = await ProfAPI.myMaterials();
      PUI.spinner(false);

      PUI.setContent(`
        <!-- Cabeçalho + filtros -->
        <div class="gestor-table-header">
          <div>
            <div class="gestor-table-title">Meus Materiais</div>
            <div class="gestor-table-subtitle">${materials.length} material(is) criado(s) por você</div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
            <div class="search-bar" style="min-width:180px;flex:1;">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input type="search" id="pmat-search" placeholder="Buscar título…" aria-label="Buscar materiais">
            </div>
            <select class="form-select" id="pmat-subj" aria-label="Filtrar por disciplina" style="min-width:130px;">
              <option value="">Todas disciplinas</option>
              ${Object.entries(SUBJECTS_P).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
            <select class="form-select" id="pmat-status" aria-label="Filtrar por status" style="min-width:120px;">
              <option value="">Todos</option>
              <option value="true">Publicado</option>
              <option value="false">Rascunho</option>
            </select>
            <button class="btn btn-primary" onclick="PPages.openCreateMaterial()">
              <i class="fas fa-plus"></i> <span class="prof-btn-label">Novo Material</span>
            </button>
          </div>
        </div>

        <!-- Tabela -->
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-wrapper">
            <table aria-label="Tabela de materiais">
              <thead><tr>
                <th>Título</th>
                <th>Disciplina</th>
                <th>Turma</th>
                <th>A11y / Quiz</th>
                <th>Status</th>
                <th>Ações</th>
              </tr></thead>
              <tbody id="pmat-tbody">
                ${this._matRows(materials)}
              </tbody>
            </table>
          </div>
        </div>
      `);

      const filter = () => {
        const s    = document.getElementById('pmat-search')?.value.toLowerCase() || '';
        const subj = document.getElementById('pmat-subj')?.value || '';
        const pub  = document.getElementById('pmat-status')?.value;
        const filtered = materials.filter(m =>
          (!s    || m.title.toLowerCase().includes(s)) &&
          (!subj || m.subject === subj) &&
          (pub === undefined || pub === '' || String(m.published) === pub)
        );
        const tb = document.getElementById('pmat-tbody');
        if (tb) tb.innerHTML = this._matRows(filtered);
      };
      document.getElementById('pmat-search')?.addEventListener('input', filter);
      document.getElementById('pmat-subj')?.addEventListener('change', filter);
      document.getElementById('pmat-status')?.addEventListener('change', filter);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar materiais.', 'error');
    }
  },

  _matRows(list) {
    if (!list.length) return `
      <tr><td colspan="6">
        <div class="empty-state">
          <i class="fas fa-book"></i>
          <h3>Nenhum material encontrado</h3>
          <button class="btn btn-primary btn-sm" onclick="PPages.openCreateMaterial()">
            <i class="fas fa-plus"></i> Criar material
          </button>
        </div>
      </td></tr>`;

    return list.map(m => {
      let quiz = []; try { quiz = JSON.parse(m.quiz || '[]'); } catch {}
      const a11y = [m.audio_desc, m.libras_url, m.transcript, m.simplified_text].filter(Boolean).length;
      const safeTitle = m.title.replace(/'/g, '&#39;');
      return `
        <tr>
          <td style="font-weight:600;max-width:200px;">
            <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeTitle}">${m.title}</div>
          </td>
          <td><span class="tag tag-purple">${SUBJECTS_P[m.subject] || m.subject || '—'}</span></td>
          <td><span class="text-sm text-muted">${TURMAS_P[m.turma] || m.turma || '—'}</span></td>
          <td style="white-space:nowrap;">
            ${m.audio_desc     ? '<span title="Audiodescrição">🔊</span> ' : ''}
            ${m.libras_url     ? '<span title="Libras">🤟</span> '         : ''}
            ${m.transcript     ? '<span title="Transcrição">📝</span> '    : ''}
            ${m.simplified_text? '<span title="Simplificado">✏️</span> '   : ''}
            ${quiz.length      ? `<span class="tag tag-gold" title="${quiz.length} questões">❓${quiz.length}</span>` : ''}
            ${!a11y && !quiz.length ? '<span class="text-muted">—</span>' : ''}
          </td>
          <td>
            <span class="tag ${m.published?'tag-green':'tag-gray'}">
              ${m.published ? 'Publicado' : 'Rascunho'}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-secondary" onclick="PPages.openEditMaterial('${m.id}')" aria-label="Editar ${safeTitle}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="PPages.confirmDeleteMaterial('${m.id}','${safeTitle}')" aria-label="Excluir ${safeTitle}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  /* ─── ALUNOS ─────────────────────────────────────────────────── */
  async renderStudents() {
    PUI.setHeader('Meus Alunos', 'Alunos vinculados às suas turmas');
    PUI.spinner(true);
    try {
      const res      = await ProfAPI.myStudents();
      const students = res.data || [];
      PUI.spinner(false);

      PUI.setContent(`
        <div class="gestor-table-header">
          <div>
            <div class="gestor-table-title">Meus Alunos</div>
            <div class="gestor-table-subtitle">${students.length} aluno(s) ativo(s)</div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
            <div class="search-bar" style="min-width:180px;flex:1;">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input type="search" id="pstu-search" placeholder="Buscar nome ou e-mail…" aria-label="Buscar alunos">
            </div>
            <select class="form-select" id="pstu-needs" aria-label="Filtrar por necessidade" style="min-width:140px;">
              <option value="">Todas necessidades</option>
              ${Object.entries(NEEDS_P).map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
            </select>
            <select class="form-select" id="pstu-turma" aria-label="Filtrar por turma" style="min-width:120px;">
              <option value="">Todas turmas</option>
              ${Object.entries(TURMAS_P).filter(([k]) => k).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-wrapper">
            <table aria-label="Tabela de alunos">
              <thead><tr>
                <th>Aluno</th><th>Turma</th><th>Necessidade</th><th>XP</th><th>Ações</th>
              </tr></thead>
              <tbody id="pstu-tbody">
                ${this._stuRows(students)}
              </tbody>
            </table>
          </div>
        </div>
      `);

      const filter = () => {
        const s = document.getElementById('pstu-search')?.value.toLowerCase() || '';
        const n = document.getElementById('pstu-needs')?.value || '';
        const t = document.getElementById('pstu-turma')?.value || '';
        const filtered = students.filter(u =>
          (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)) &&
          (!n || u.special_needs === n) &&
          (!t || u.turma === t)
        );
        const tb = document.getElementById('pstu-tbody');
        if (tb) tb.innerHTML = this._stuRows(filtered);
      };
      document.getElementById('pstu-search')?.addEventListener('input', filter);
      document.getElementById('pstu-needs')?.addEventListener('change', filter);
      document.getElementById('pstu-turma')?.addEventListener('change', filter);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar alunos.', 'error');
    }
  },

  _stuRows(list) {
    if (!list.length) return `
      <tr><td colspan="5">
        <div class="empty-state">
          <i class="fas fa-users"></i><h3>Nenhum aluno encontrado</h3>
        </div>
      </td></tr>`;

    return list.map(u => {
      const nd = NEEDS_P[u.special_needs] || NEEDS_P.none;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:.55rem;">
              <div class="sidebar-avatar" style="width:30px;height:30px;font-size:.76rem;flex-shrink:0;"
                aria-hidden="true">${u.name.charAt(0)}</div>
              <div>
                <div style="font-weight:600;color:var(--text);">${u.name}</div>
                <div class="text-sm text-muted">${u.email}</div>
              </div>
            </div>
          </td>
          <td>${TURMAS_P[u.turma] || u.turma || '—'}</td>
          <td>
            <span class="sn-tag sn-${u.special_needs||'none'}">
              ${nd.icon} ${nd.label}
            </span>
          </td>
          <td><span class="tag tag-gold">${u.points||0} XP</span></td>
          <td>
            <button class="btn btn-sm btn-secondary"
              onclick="PNav.go('progress',{userId:'${u.id}'})"
              aria-label="Ver desempenho de ${u.name}">
              <i class="fas fa-chart-bar"></i>
            </button>
          </td>
        </tr>`;
    }).join('');
  },

  /* ─── DESEMPENHO ─────────────────────────────────────────────── */
  async renderProgress(params = {}) {
    PUI.setHeader('Desempenho', 'Acompanhe o progresso dos seus alunos');
    PUI.spinner(true);
    try {
      const [studentsRes, progress, materials] = await Promise.all([
        ProfAPI.myStudents(),
        ProfAPI.allProgress(),
        ProfAPI.myMaterials(),
      ]);
      const students = studentsRes.data || [];
      PUI.spinner(false);

      const initialStudent = params.userId ? students.find(s => s.id === params.userId) : null;

      PUI.setContent(`
        <!-- Filtros -->
        <div class="prof-filter-bar">
          <div class="search-bar">
            <i class="fas fa-search" aria-hidden="true"></i>
            <input type="search" id="pprog-search" placeholder="Buscar aluno…"
              aria-label="Buscar aluno" value="${initialStudent ? initialStudent.name : ''}">
          </div>
          <select class="form-select" id="pprog-turma" aria-label="Filtrar por turma">
            <option value="">Todas turmas</option>
            ${Object.entries(TURMAS_P).filter(([k]) => k).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <select class="form-select" id="pprog-mat" aria-label="Filtrar por material">
            <option value="">Todos materiais</option>
            ${materials.map(m => `<option value="${m.id}">${m.title}</option>`).join('')}
          </select>
        </div>

        <!-- Lista de alunos -->
        <div id="pprog-list">
          ${this._progressList(
            initialStudent ? [initialStudent] : students,
            materials,
            progress
          )}
        </div>
      `);

      const filter = () => {
        const s   = document.getElementById('pprog-search')?.value.toLowerCase() || '';
        const t   = document.getElementById('pprog-turma')?.value || '';
        const mid = document.getElementById('pprog-mat')?.value || '';
        const filtered = students.filter(u =>
          (!s || u.name.toLowerCase().includes(s)) && (!t || u.turma === t)
        );
        const mats = mid ? materials.filter(m => m.id === mid) : materials;
        const el = document.getElementById('pprog-list');
        if (el) el.innerHTML = this._progressList(filtered, mats, progress);
      };
      document.getElementById('pprog-search')?.addEventListener('input', filter);
      document.getElementById('pprog-turma')?.addEventListener('change', filter);
      document.getElementById('pprog-mat')?.addEventListener('change', filter);
    } catch (err) {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar desempenho.', 'error');
    }
  },

  _progressList(students, materials, progress) {
    if (!students.length) return `
      <div class="empty-state">
        <i class="fas fa-chart-bar"></i><h3>Nenhum aluno encontrado</h3>
      </div>`;

    return students.map(s => {
      const sp        = progress.filter(p => p.user_id === s.id);
      const completed = sp.filter(p => p.completed).length;
      const total     = materials.length;
      const pct       = total ? Math.round((completed / total) * 100) : 0;
      const spDone    = sp.filter(p => p.completed);
      const avgScore  = spDone.length
        ? Math.round(spDone.reduce((a, p) => a + (p.score / Math.max(p.max_score, 1)) * 100, 0) / spDone.length)
        : 0;
      const nd = NEEDS_P[s.special_needs] || NEEDS_P.none;

      return `
        <div class="card prof-student-card mb-md">
          <!-- Cabeçalho do aluno -->
          <div class="prof-student-header">
            <div class="prof-student-avatar" aria-hidden="true">${s.name.charAt(0)}</div>
            <div class="prof-student-info">
              <div class="prof-student-name">${s.name}</div>
              <div class="prof-student-meta">${TURMAS_P[s.turma]||'—'} · ${nd.icon} ${nd.label} · ${s.points||0} XP</div>
              <div class="prof-student-tags">
                <span class="tag tag-green">${completed}/${total} materiais</span>
                <span class="tag tag-purple">${pct}% concluído</span>
                <span class="tag tag-gold">${avgScore}% média quiz</span>
              </div>
            </div>
            <button class="btn btn-sm btn-outline"
              onclick="PPages._toggleDetail('detail-${s.id}','chevron-${s.id}')"
              aria-expanded="false"
              aria-controls="detail-${s.id}"
              aria-label="Expandir detalhes de ${s.name}"
              id="toggle-${s.id}">
              <i class="fas fa-chevron-down" id="chevron-${s.id}" aria-hidden="true"></i>
            </button>
          </div>

          <!-- Barra de progresso -->
          <div class="prof-progress-bar" role="progressbar"
            aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
            aria-label="Progresso de ${s.name}: ${pct}%">
            <div class="prof-progress-fill" style="width:${pct}%"></div>
          </div>

          <!-- Detalhes colapsáveis -->
          <div id="detail-${s.id}" class="hidden">
            <div class="prof-detail-header">Detalhe por material</div>
            <div style="display:flex;flex-direction:column;gap:.3rem;">
              ${materials.length === 0
                ? `<p class="text-sm text-muted">Nenhum material seu disponível.</p>`
                : materials.map(m => {
                    const prog  = sp.find(p => p.material_id === m.id);
                    const done  = prog?.completed;
                    const score = prog ? Math.round((prog.score / Math.max(prog.max_score, 1)) * 100) : null;
                    const tries = prog?.attempts || 0;
                    const iconClass = done ? 'fa-check-circle' : prog ? 'fa-eye' : 'fa-circle';
                    const iconColor = done ? 'var(--green)' : prog ? 'var(--accent)' : 'var(--text3)';
                    const scoreClass = score !== null
                      ? (score >= 70 ? 'text-green' : score < 50 ? 'text-red' : '')
                      : '';
                    return `
                      <div class="prof-material-row">
                        <i class="fas ${iconClass} pmr-icon"
                          style="color:${iconColor}"
                          aria-label="${done?'Concluído':prog?'Visualizado':'Não acessado'}"
                          title="${done?'Concluído':prog?'Visualizado':'Não acessado'}"></i>
                        <span class="pmr-title">${m.title}</span>
                        <span class="tag tag-purple pmr-subj">${SUBJECTS_P[m.subject]||m.subject||''}</span>
                        ${score !== null
                          ? `<span class="pmr-score ${scoreClass}">${score}%</span>`
                          : `<span class="pmr-score text-muted">—</span>`}
                        ${tries > 0
                          ? `<span class="pmr-tries">${tries}× tent.</span>`
                          : ''}
                      </div>`;
                  }).join('')}
            </div>
          </div>
        </div>`;
    }).join('');
  },

  _toggleDetail(detailId, chevronId) {
    const el  = document.getElementById(detailId);
    const ch  = document.getElementById(chevronId);
    const btn = document.getElementById('toggle-' + detailId.replace('detail-', ''));
    if (!el) return;
    const hidden = el.classList.toggle('hidden');
    if (ch)  ch.className  = `fas fa-chevron-${hidden ? 'down' : 'up'}`;
    if (btn) btn.setAttribute('aria-expanded', String(!hidden));
  },

  /* ─── MODAL DE MATERIAL ──────────────────────────────────────── */
  openCreateMaterial() { this._materialForm(null); },

  async openEditMaterial(id) {
    PUI.spinner(true);
    try {
      const mat = await API.getMaterial(id);
      PUI.spinner(false);
      if (mat.author_id !== API.getUser().id) {
        PUI.toast('Você não pode editar este material.', 'error');
        return;
      }
      this._materialForm(mat);
    } catch {
      PUI.spinner(false);
      PUI.toast('Erro ao carregar material.', 'error');
    }
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
          this.renderMaterials();
        } catch (err) {
          PUI.spinner(false);
          PUI.toast(err.message, 'error');
        }
      }, true
    );
  },

  _materialForm(mat) {
    const edit = !!mat;
    let quiz = []; try { quiz = JSON.parse(mat?.quiz || '[]'); } catch {}

    PUI.modal(`
      <!-- Abas -->
      <div class="material-sections-nav" role="tablist" aria-label="Seções do material">
        <button class="material-section-tab active" role="tab" data-tab="basic"   aria-selected="true">Básico</button>
        <button class="material-section-tab"        role="tab" data-tab="content" aria-selected="false">Conteúdo</button>
        <button class="material-section-tab"        role="tab" data-tab="a11y"    aria-selected="false">Acessibilidade</button>
        <button class="material-section-tab"        role="tab" data-tab="quiz"    aria-selected="false">Quiz</button>
      </div>

      <form id="pmat-form" novalidate>
        <!-- ── Básico ── -->
        <div id="tab-basic">
          <div class="form-group">
            <label class="form-label" for="pmf-title">Título <span aria-hidden="true">*</span></label>
            <input class="form-input" type="text" id="pmf-title"
              value="${mat?.title||''}" required aria-required="true" autocomplete="off">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="pmf-subject">Disciplina</label>
              <select class="form-select" id="pmf-subject">
                ${Object.entries(SUBJECTS_P).map(([k,v]) =>
                  `<option value="${k}" ${mat?.subject===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-turma">Turma</label>
              <select class="form-select" id="pmf-turma">
                ${Object.entries(TURMAS_P).map(([k,v]) =>
                  `<option value="${k}" ${mat?.turma===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pmf-desc">Descrição breve</label>
            <input class="form-input" type="text" id="pmf-desc" value="${mat?.description||''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="pmf-video">URL do Vídeo (YouTube embed)</label>
            <input class="form-input" type="url" id="pmf-video"
              placeholder="https://www.youtube.com/embed/…" value="${mat?.video_url||''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="pmf-status">Status de publicação</label>
            <select class="form-select" id="pmf-status">
              <option value="true"  ${mat?.published!==false?'selected':''}>Publicado</option>
              <option value="false" ${mat?.published===false?'selected':''}>Rascunho</option>
            </select>
          </div>
        </div>

        <!-- ── Conteúdo ── -->
        <div id="tab-content" class="hidden">
          <div class="form-group">
            <label class="form-label" for="pmf-content">Conteúdo <span aria-hidden="true">*</span></label>
            <textarea class="form-textarea" id="pmf-content" rows="10"
              required aria-required="true" placeholder="Escreva o conteúdo da aula aqui…">${mat?.content||''}</textarea>
          </div>
        </div>

        <!-- ── Acessibilidade ── -->
        <div id="tab-a11y" class="hidden">
          <div class="material-a11y-panel">
            <h5><i class="fas fa-universal-access"></i> Recursos de Acessibilidade</h5>
            <div class="form-group">
              <label class="form-label" for="pmf-audio">Audiodescrição (URL do áudio)</label>
              <input class="form-input" type="url" id="pmf-audio"
                value="${mat?.audio_desc||''}" placeholder="https://…">
              <p class="form-hint">Para alunos com deficiência visual.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-libras">Vídeo em Libras (URL)</label>
              <input class="form-input" type="url" id="pmf-libras"
                value="${mat?.libras_url||''}" placeholder="https://…">
              <p class="form-hint">Para alunos com deficiência auditiva.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-transcript">Transcrição</label>
              <textarea class="form-textarea" id="pmf-transcript" rows="4"
                placeholder="Transcrição do vídeo/áudio…">${mat?.transcript||''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="pmf-simplified">Versão Simplificada</label>
              <textarea class="form-textarea" id="pmf-simplified" rows="4"
                placeholder="Linguagem simples para alunos com deficiência intelectual ou autismo…">${mat?.simplified_text||''}</textarea>
            </div>
          </div>
        </div>

        <!-- ── Quiz ── -->
        <div id="tab-quiz" class="hidden">
          <div class="quiz-builder">
            <div class="quiz-builder-header">
              <span class="quiz-builder-title">Questões do Quiz</span>
              <button type="button" class="btn btn-sm btn-outline" id="padd-q">
                <i class="fas fa-plus"></i> Adicionar
              </button>
            </div>
            <div id="pquiz-container">
              ${quiz.map((q, i) => this._quizBlock(i, q)).join('')}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="PUI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> ${edit ? 'Salvar Alterações' : 'Criar Material'}
          </button>
        </div>
      </form>
    `, edit ? `Editar: ${mat.title}` : 'Novo Material');

    // Troca de abas
    document.querySelectorAll('.material-section-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.material-section-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        ['basic','content','a11y','quiz'].forEach(id => {
          document.getElementById(`tab-${id}`)?.classList.toggle('hidden', id !== tab.dataset.tab);
        });
      });
    });

    // Adicionar questão
    let qIdx = quiz.length;
    document.getElementById('padd-q')?.addEventListener('click', () => {
      const wrap = document.getElementById('pquiz-container');
      if (!wrap) return;
      wrap.insertAdjacentHTML('beforeend', this._quizBlock(qIdx, null));
      qIdx++;
    });

    // Submit
    document.getElementById('pmat-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const title   = document.getElementById('pmf-title')?.value.trim();
      const content = document.getElementById('pmf-content')?.value.trim();
      if (!title)   { PUI.toast('O título é obrigatório.', 'error'); return; }
      if (!content) { PUI.toast('O conteúdo é obrigatório.', 'error'); return; }

      // Coletar quiz
      const quizData = [];
      document.querySelectorAll('.pqb-block').forEach(block => {
        const q = block.querySelector('.pqb-question')?.value.trim();
        if (!q) return;
        const opts = [...block.querySelectorAll('.pqb-option')].map(o => ({ text: o.value.trim() })).filter(o => o.text);
        const correct = parseInt(block.querySelector('.pqb-correct:checked')?.value ?? '0');
        quizData.push({ question: q, options: opts, correct });
      });

      const data = {
        title, content,
        subject:         document.getElementById('pmf-subject')?.value,
        turma:           document.getElementById('pmf-turma')?.value,
        description:     document.getElementById('pmf-desc')?.value,
        video_url:       document.getElementById('pmf-video')?.value,
        audio_desc:      document.getElementById('pmf-audio')?.value,
        libras_url:      document.getElementById('pmf-libras')?.value,
        transcript:      document.getElementById('pmf-transcript')?.value,
        simplified_text: document.getElementById('pmf-simplified')?.value,
        quiz:            JSON.stringify(quizData),
        published:       document.getElementById('pmf-status')?.value === 'true',
        tags:            [],
      };

      PUI.spinner(true);
      try {
        if (edit) {
          await API.updateMaterial(mat.id, data);
          PUI.toast('Material atualizado!', 'success');
        } else {
          await API.createMaterial(data);
          PUI.toast('Material criado!', 'success');
        }
        PUI.spinner(false);
        PUI.closeModal();
        this.renderMaterials();
      } catch (err) {
        PUI.spinner(false);
        PUI.toast(err.message, 'error');
      }
    });
  },

  _quizBlock(idx, q) {
    const opts = q?.options || [{text:''},{text:''},{text:''},{text:''}];
    return `
      <div class="quiz-question-block pqb-block" data-idx="${idx}">
        <div class="quiz-question-num-label">Questão ${idx + 1}</div>
        <div class="form-group">
          <input class="form-input pqb-question" type="text"
            placeholder="Enunciado da questão…" value="${q?.question||''}">
        </div>
        <div class="quiz-options-builder">
          ${opts.map((o, oi) => `
            <div class="quiz-option-input-row">
              <input type="radio" class="pqb-correct" name="correct_${idx}"
                value="${oi}" ${q?.correct===oi?'checked':''} title="Marcar como correta">
              <input class="form-input pqb-option" type="text"
                placeholder="Opção ${String.fromCharCode(65+oi)}"
                value="${o.text||o||''}">
            </div>`).join('')}
        </div>
        <div class="quiz-correct-label">☝️ Selecione o radio da resposta correta</div>
      </div>`;
  },
};
window.PPages = PPages;

/* ─── PApp ───────────────────────────────────────────────────── */
const PApp = {
  init() {
    this._buildLogin();
    PSidebar.init();
    A11y.init();

    if (API.isAuthenticated() && API.getRole() === 'professor') {
      API.getMe()
        .then(user => this.onLogin(user))
        .catch(() => this.showLogin());
    } else {
      this.showLogin();
    }
  },

  onLogin(user) {
    document.getElementById('prof-login')?.classList.add('hidden');
    document.getElementById('prof-app')?.classList.remove('hidden');
    this._updateSidebar(user);
    PNav.go('dashboard');
  },

  showLogin() {
    document.getElementById('prof-app')?.classList.add('hidden');
    document.getElementById('prof-login')?.classList.remove('hidden');
  },

  _buildLogin() {
    const el = document.getElementById('prof-login');
    if (!el) return;
    el.innerHTML = `
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
          <button type="submit" class="btn btn-full btn-lg"
            style="background:var(--accent3);color:#fff;border-color:var(--accent3);margin-top:.25rem;">
            <i class="fas fa-sign-in-alt"></i> Entrar
          </button>
        </form>
        <div class="login-footer">
          <p>Acesso exclusivo para professores.</p>
          <p style="margin-top:.35rem;">
            <a href="index.html" style="color:var(--accent3);">← Área do Aluno</a>
            &nbsp;·&nbsp;
            <a href="gestor.html" style="color:var(--text3);">Painel do Gestor</a>
          </p>
        </div>
      </div>`;

    document.getElementById('prof-login-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = document.getElementById('prof-email')?.value.trim();
      const password = document.getElementById('prof-password')?.value;
      if (!email || !password) { PUI.toast('Preencha e-mail e senha.', 'error'); return; }

      PUI.spinner(true);
      try {
        const { user } = await API.login(email, password);
        if (user.role !== 'professor') {
          API.clearToken();
          PUI.spinner(false);
          PUI.toast('Acesso negado. Área exclusiva para professores.', 'error');
          return;
        }
        PUI.spinner(false);
        this.onLogin(user);
      } catch (err) {
        PUI.spinner(false);
        PUI.toast(err.message || 'Erro ao fazer login.', 'error');
      }
    });
  },

  _updateSidebar(user) {
    const av = document.getElementById('prof-avatar');
    const nm = document.getElementById('prof-user-name');
    const rl = document.getElementById('prof-user-role');
    if (av) av.textContent = user.name.charAt(0).toUpperCase();
    if (nm) nm.textContent = user.name;
    if (rl) {
      const subs = Array.isArray(user.subjects) && user.subjects.length
        ? user.subjects.map(s => SUBJECTS_P[s] || s).join(', ')
        : 'Professor';
      rl.textContent = subs;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => PApp.init());