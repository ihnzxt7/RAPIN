/**
 * RAPIN — Controlador Principal (SPA — Alunos e Professores)
 * Módulos: Auth, Nav, Pages, UI, Gamification
 */
'use strict';

// ─── Constantes ───────────────────────────────────────────────────────────
const TURMAS = {
  '1ano': '1º Ano — Ensino Médio',
  '2ano': '2º Ano — Ensino Médio',
  '3ano': '3º Ano — Ensino Médio',
};

const SUBJECTS = {
  matematica:   { label: 'Matemática',       icon: '📐', color: 'purple' },
  portugues:    { label: 'Português',         icon: '📖', color: 'teal' },
  historia:     { label: 'História',          icon: '🏛️', color: 'gold' },
  geografia:    { label: 'Geografia',         icon: '🌎', color: 'green' },
  ciencias:     { label: 'Ciências',          icon: '🔬', color: 'teal' },
  ingles:       { label: 'Inglês',            icon: '🌐', color: 'purple' },
  artes:        { label: 'Artes',             icon: '🎨', color: 'orange' },
  educacao_fis: { label: 'Educação Física',   icon: '⚽', color: 'green' },
};

const SPECIAL_NEEDS = {
  none:        { label: 'Nenhuma',              icon: '👤' },
  visual:      { label: 'Deficiência Visual',   icon: '👁️' },
  auditiva:    { label: 'Deficiência Auditiva', icon: '👂' },
  motora:      { label: 'Deficiência Motora',   icon: '🦾' },
  dislexia:    { label: 'Dislexia',             icon: '📝' },
  tdah:        { label: 'TDAH',                 icon: '⚡' },
  autismo:     { label: 'Autismo',              icon: '🧩' },
  intelectual: { label: 'Def. Intelectual',     icon: '🌱' },
};

// ─── UI Helpers ───────────────────────────────────────────────────────────
const UI = {
  toast(msg, type = 'info', duration = 3500) {
    const icons = { info: 'info-circle', success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}" aria-hidden="true"></i> ${msg}`;
    document.getElementById('toast-container')?.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  spinner(show) {
    const el = document.getElementById('global-spinner');
    if (el) el.classList.toggle('hidden', !show);
  },

  modal(html, title = '') {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${title}</h2>
          <button class="modal-close" onclick="UI.closeModal()" aria-label="Fechar modal">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div id="modal-body">${html}</div>
      </div>`;
    overlay.classList.remove('hidden');
    overlay.addEventListener('click', e => { if (e.target === overlay) UI.closeModal(); }, { once: true });
    overlay.querySelector('.modal')?.focus();
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  confirm(msg, onConfirm, danger = false) {
    this.modal(`
      <p style="color:var(--text2);margin-bottom:1.25rem;">${msg}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">Confirmar</button>
      </div>`, 'Confirmar Ação');
    document.getElementById('confirm-ok')?.addEventListener('click', () => {
      UI.closeModal(); onConfirm();
    });
  },

  setContent(html) {
    const el = document.getElementById('page-content');
    if (el) { el.innerHTML = html; el.scrollTop = 0; }
  },

  setHeader(title, subtitle = '') {
    const h = document.getElementById('page-title');
    const s = document.getElementById('page-subtitle');
    if (h) h.textContent = title;
    if (s) s.textContent = subtitle;
  }
};
window.UI = UI;

// ─── Auth ─────────────────────────────────────────────────────────────────
const Auth = {
  async login(email, password) {
    UI.spinner(true);
    try {
      const { user } = await API.login(email, password);
      UI.spinner(false);
      App.onLogin(user);
    } catch (err) {
      UI.spinner(false);
      UI.toast(err.message, 'error');
    }
  },

  logout() {
    API.clearToken();
    A11y.stopNarration();
    App.showLogin();
  }
};

// ─── Navegação ────────────────────────────────────────────────────────────
const Nav = {
  current: 'home',

  go(page, params = {}) {
    this.current = page;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
      el.setAttribute('aria-current', el.dataset.page === page ? 'page' : 'false');
    });

    // Fechar sidebar mobile + overlay
    const _sidebar = document.getElementById('main-sidebar');
    const _overlay = document.getElementById('sidebar-overlay');
    _sidebar?.classList.remove('mobile-open');
    _overlay?.classList.remove('visible');
    document.body.style.overflow = '';

    Pages.render(page, params);
    window.scrollTo(0, 0);

    // Anunciar mudança de página para leitores de tela
    const names = {
      home: 'Início', materials: 'Materiais', material_view: 'Leitura',
      quiz: 'Quiz', profile: 'Perfil', ranking: 'Ranking', missions: 'Missões'
    };
    A11y.speak(names[page] ? `Página: ${names[page]}` : '');
  },
};

// ─── Páginas ──────────────────────────────────────────────────────────────
const Pages = {
  currentMaterial: null,
  myProgress: [],

  async render(page, params = {}) {
    switch (page) {
      case 'home':      await this.renderHome(); break;
      case 'materials': await this.renderMaterials(params); break;
      case 'material_view': await this.renderMaterialView(params.id); break;
      case 'quiz':      await this.renderQuiz(params); break;
      case 'profile':   await this.renderProfile(); break;
      case 'ranking':   await this.renderRanking(); break;
      case 'missions':  await this.renderMissions(); break;
      default:          await this.renderHome();
    }
  },

  // ── Dashboard / Home ─────────────────────────────────────────────────────
  async renderHome() {
    const user = API.getUser();
    if (!user) return;

    UI.setHeader('Início', `Bem-vindo(a), ${user.name.split(' ')[0]}!`);
    UI.spinner(true);

    try {
      const [materialsRes, progressList, ranking] = await Promise.all([
        API.listMaterials({ limit: 4, page: 1 }),
        API.getProgress(user.id),
        API.getRanking(5)
      ]);
      this.myProgress = progressList;
      UI.spinner(false);

      const materials = materialsRes.data || [];
      const completedCount = progressList.filter(p => p.completed).length;
      const totalPoints = user.points || 0;
      const level = user.level || 1;
      const levelProgress = ((totalPoints % 200) / 200 * 100).toFixed(0);

      // Painel de acessibilidade contextual
      const a11yWidget = this._renderA11yContextWidget(user);
      // Pomodoro se TDAH
      const pomodoroSection = A11y.hasFeature('pomodoro') || user.special_needs === 'tdah'
        ? this._renderPomodoroCard() : '';
      // Missões
      const missionsSection = this._renderMissionsWidget();

      UI.setContent(`
        <!-- XP Bar -->
        <div class="xp-bar-container" role="complementary" aria-label="Progresso de nível">
          <div class="xp-info">
            <span class="xp-level"><i class="fas fa-star" aria-hidden="true"></i> Nível ${level}</span>
            <span class="xp-points">${totalPoints} XP</span>
          </div>
          <div class="xp-bar" role="progressbar" aria-valuenow="${levelProgress}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso para próximo nível">
            <div class="xp-fill" style="width:${levelProgress}%"></div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid" role="region" aria-label="Resumo de atividades">
          <div class="stat-card">
            <div class="stat-icon purple" aria-hidden="true"><i class="fas fa-book-open"></i></div>
            <div>
              <div class="stat-value">${materials.length}</div>
              <div class="stat-label">Materiais disponíveis</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green" aria-hidden="true"><i class="fas fa-check-circle"></i></div>
            <div>
              <div class="stat-value">${completedCount}</div>
              <div class="stat-label">Concluídos</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon gold" aria-hidden="true"><i class="fas fa-trophy"></i></div>
            <div>
              <div class="stat-value">${totalPoints}</div>
              <div class="stat-label">Pontos XP</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon teal" aria-hidden="true"><i class="fas fa-bolt"></i></div>
            <div>
              <div class="stat-value">${level}</div>
              <div class="stat-label">Nível atual</div>
            </div>
          </div>
        </div>

        <!-- Grid principal -->
        <div class="grid-2" style="gap:1.25rem;">
          <div>
            ${a11yWidget}
            ${pomodoroSection}
          </div>
          <div>
            ${missionsSection}
          </div>
        </div>

        <!-- Materiais recentes -->
        <section class="mt-lg" aria-labelledby="recentes-heading">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem;">
            <h2 id="recentes-heading" style="font-size:.95rem;font-weight:700;color:var(--text);">
              <i class="fas fa-clock" aria-hidden="true" style="color:var(--accent);margin-right:.4rem;"></i>
              Materiais Recentes
            </h2>
            <button class="btn btn-sm btn-outline" onclick="Nav.go('materials')" aria-label="Ver todos os materiais">
              Ver todos
            </button>
          </div>
          <div class="materials-grid" id="recent-materials">
            ${materials.slice(0, 4).map(m => this._materialCard(m, progressList)).join('') || '<p class="text-muted text-sm">Nenhum material disponível.</p>'}
          </div>
        </section>

        <!-- Ranking rápido -->
        <section class="mt-lg" aria-labelledby="ranking-heading">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem;">
            <h2 id="ranking-heading" style="font-size:.95rem;font-weight:700;color:var(--text);">
              <i class="fas fa-trophy" aria-hidden="true" style="color:var(--gold);margin-right:.4rem;"></i>
              Ranking
            </h2>
            <button class="btn btn-sm btn-outline" onclick="Nav.go('ranking')">Ver completo</button>
          </div>
          <div class="ranking-list" role="list">
            ${ranking.map((u, i) => `
              <div class="ranking-item ${u.id === user.id ? 'me' : ''}" role="listitem">
                <span class="ranking-pos ${i === 0 ? 'gold-pos' : i === 1 ? 'silver-pos' : i === 2 ? 'bronze-pos' : ''}"
                  aria-label="Posição ${i + 1}">
                  ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span class="ranking-name">${u.name}${u.id === user.id ? ' (você)' : ''}</span>
                <span class="ranking-pts">${u.points || 0} XP</span>
              </div>`).join('') || '<p class="text-muted text-sm">Sem dados de ranking.</p>'}
          </div>
        </section>
      `);

      // Iniciar Pomodoro se necessário
      if ((A11y.hasFeature('pomodoro') || user.special_needs === 'tdah') && !document.getElementById('pomodoro-widget')) {
        A11y.startPomodoro();
      }
    } catch (err) {
      UI.spinner(false);
      UI.toast('Erro ao carregar dados.', 'error');
    }
  },

  _renderA11yContextWidget(user) {
    const need = user.special_needs;
    if (!need || need === 'none') return '';

    // colors: apenas vars existentes em :root (--gold, --orange, --green, --accent, --accent3, --red)
    const info = {
      dislexia:    { icon: '📝', title: 'Modo Dislexia Ativo',     desc: 'Fonte especial, espaçamento ampliado e leitura guiada ativados.', color: 'gold' },
      tdah:        { icon: '⚡', title: 'Modo TDAH Ativo',          desc: 'Estudo em blocos de 25 min com pausas orientadas. Missões ativadas.', color: 'orange' },
      visual:      { icon: '👁️', title: 'Modo Visual Ativo',       desc: 'Alto contraste, narração e comandos por voz disponíveis.', color: 'accent' },
      auditiva:    { icon: '👂', title: 'Modo Auditivo Ativo',      desc: 'Transcrições e intérprete de Libras disponíveis nos materiais.', color: 'accent3' },
      autismo:     { icon: '🧩', title: 'Modo Autismo Ativo',       desc: 'Interface estável com baixa estimulação e rotina visual.', color: 'green' },
      intelectual: { icon: '🌱', title: 'Modo Simplificado Ativo',  desc: 'Conteúdo passo a passo com textos simplificados.', color: 'accent3' },
    };

    const i = info[need];
    if (!i) return '';
    return `
      <div class="card mb-md a11y-context-card a11y-context-${need}" style="border-left:3px solid var(--${i.color});">
        <div class="card-title">
          <span style="font-size:1.2rem;" aria-hidden="true">${i.icon}</span>
          ${i.title}
        </div>
        <p class="text-sm text-muted">${i.desc}</p>
        <button class="btn btn-sm btn-secondary mt-sm" onclick="A11y.openPanel()" aria-label="Abrir painel de acessibilidade">
          <i class="fas fa-sliders-h" aria-hidden="true"></i> Ajustar configurações
        </button>
      </div>`;
  },

  _renderPomodoroCard() {
    return `
      <div class="card">
        <div class="card-title"><i class="fas fa-clock"></i> Timer de Estudo</div>
        <p class="text-sm text-muted mb-sm">Técnica Pomodoro: 25 min de foco + 5 min de pausa.</p>
        <button class="btn btn-sm btn-primary" onclick="A11y.startPomodoro()" aria-label="Iniciar timer Pomodoro">
          <i class="fas fa-play" aria-hidden="true"></i> Iniciar Pomodoro
        </button>
      </div>`;
  },

  _renderMissionsWidget() {
    const user = API.getUser();
    const isTdah = user?.special_needs === 'tdah' || A11y.hasFeature('tdahFocus');

    const defaultMissions = [
      { id: 1, name: 'Estudar 1 material hoje',    xp: 50,  done: false },
      { id: 2, name: 'Completar 1 quiz',            xp: 80,  done: false },
      { id: 3, name: 'Atingir 70% no quiz',         xp: 100, done: false },
      { id: 4, name: 'Entrar na plataforma',        xp: 10,  done: true  },
    ];

    return `
      <div class="mission-board" role="region" aria-label="Missões do dia">
        <div class="mission-header">
          <i class="fas fa-tasks" aria-hidden="true"></i>
          <h3>${isTdah ? '⚡ Missões de Hoje' : '🎯 Objetivos do Dia'}</h3>
        </div>
        <div class="mission-list" role="list">
          ${defaultMissions.map(m => `
            <div class="mission-item ${m.done ? 'done' : ''}" role="listitem"
              aria-label="${m.name} — ${m.xp} XP${m.done ? ' — Concluída' : ''}">
              <div class="mission-check" aria-hidden="true">
                ${m.done ? '<i class="fas fa-check" style="font-size:.65rem;color:#fff"></i>' : ''}
              </div>
              <span class="mission-name">${m.name}</span>
              <span class="mission-xp">+${m.xp} XP</span>
            </div>`).join('')}
        </div>
        <div style="padding:.5rem .75rem;">
          <button class="btn btn-sm btn-outline btn-full" onclick="Nav.go('missions')">
            Ver todas as missões
          </button>
        </div>
      </div>`;
  },

  // ── Materiais ─────────────────────────────────────────────────────────────
  async renderMaterials(params = {}) {
    UI.setHeader('Materiais', 'Explore o conteúdo disponível');
    UI.spinner(true);

    try {
      const user = API.getUser();
      const [matRes, progressList] = await Promise.all([
        API.listMaterials({ limit: 50 }),
        API.getProgress(user.id)
      ]);
      this.myProgress = progressList;
      UI.spinner(false);

      const materials = matRes.data || [];
      const subjectKeys = [...new Set(materials.map(m => m.subject))];

      UI.setContent(`
        <div class="filter-bar" role="search" aria-label="Filtros de materiais">
          <div class="search-bar" style="flex:1;min-width:180px;">
            <i class="fas fa-search" aria-hidden="true"></i>
            <input type="search" id="mat-search" placeholder="Buscar materiais…"
              aria-label="Buscar materiais" value="${params.search || ''}">
          </div>
          <select class="form-select" id="mat-filter-turma" aria-label="Filtrar por turma" style="width:auto;">
            <option value="">Todas as turmas</option>
            ${Object.entries(TURMAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <select class="form-select" id="mat-filter-subject" aria-label="Filtrar por disciplina" style="width:auto;">
            <option value="">Todas as disciplinas</option>
            ${subjectKeys.map(k => `<option value="${k}">${SUBJECTS[k]?.label || k}</option>`).join('')}
          </select>
        </div>

        <div id="materials-container">
          ${this._renderMaterialsGrid(materials, progressList)}
        </div>
      `);

      // Eventos de filtro
      const doFilter = () => {
        const search  = document.getElementById('mat-search')?.value.toLowerCase() || '';
        const turma   = document.getElementById('mat-filter-turma')?.value || '';
        const subject = document.getElementById('mat-filter-subject')?.value || '';
        const filtered = materials.filter(m =>
          (!search  || m.title.toLowerCase().includes(search) || (m.description || '').toLowerCase().includes(search)) &&
          (!turma   || m.turma === turma) &&
          (!subject || m.subject === subject)
        );
        const container = document.getElementById('materials-container');
        if (container) container.innerHTML = this._renderMaterialsGrid(filtered, progressList);
        this._bindMaterialCards();
      };

      document.getElementById('mat-search')?.addEventListener('input', doFilter);
      document.getElementById('mat-filter-turma')?.addEventListener('change', doFilter);
      document.getElementById('mat-filter-subject')?.addEventListener('change', doFilter);
      this._bindMaterialCards();
    } catch (err) {
      UI.spinner(false);
      UI.toast('Erro ao carregar materiais.', 'error');
    }
  },

  _renderMaterialsGrid(materials, progressList) {
    if (!materials.length) return `
      <div class="empty-state">
        <i class="fas fa-book-open" aria-hidden="true"></i>
        <h3>Nenhum material encontrado</h3>
        <p>Tente ajustar os filtros de busca.</p>
      </div>`;
    return `<div class="materials-grid">${materials.map(m => this._materialCard(m, progressList)).join('')}</div>`;
  },

  _materialCard(m, progressList = []) {
    const prog   = progressList.find(p => p.material_id === m.id);
    const done   = prog?.completed;
    const score  = prog ? Math.round((prog.score / Math.max(prog.max_score, 1)) * 100) : 0;
    const subj   = SUBJECTS[m.subject] || { label: m.subject, icon: '📄', color: 'gray' };
    // quiz pode ser string JSON ou já um array
    let quiz = [];
    try { quiz = m.quiz ? (typeof m.quiz === 'string' ? JSON.parse(m.quiz) : m.quiz) : []; } catch {}
    // Remover tags HTML da descrição para exibição no card
    const descText = (m.description || '').replace(/<[^>]*>/g, '').slice(0, 100);

    return `
      <article class="material-card" aria-label="Material: ${m.title}">
        <div class="material-thumb">
          <span aria-hidden="true" style="font-size:2.2rem;">${subj.icon}</span>
          ${done ? `<span class="material-badge" style="color:var(--green);" aria-label="Concluído">
            <i class="fas fa-check-circle" aria-hidden="true"></i> Feito
          </span>` : ''}
        </div>
        <div class="material-body">
          <h3 class="material-title">${m.title}</h3>
          <p class="material-desc">${descText}${descText.length >= 100 ? '…' : ''}</p>
          <div class="material-meta">
            <span class="material-tag tag-${subj.color}">${subj.label}</span>
            <span class="material-tag">${TURMAS[m.turma] || m.turma}</span>
            ${quiz.length ? `<span class="material-tag tag-purple"><i class="fas fa-question-circle" aria-hidden="true"></i> Quiz</span>` : ''}
          </div>
          ${done ? `
            <div class="material-progress-bar mt-sm" role="progressbar" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100" aria-label="Pontuação: ${score}%">
              <div class="material-progress-fill" style="width:${score}%"></div>
            </div>
            <div class="text-sm text-muted mt-sm">${score}% no quiz</div>` : ''}
        </div>
        <div class="material-footer">
          <button class="btn btn-primary btn-sm btn-full"
            data-material-id="${m.id}"
            onclick="Pages.openMaterial('${m.id}')"
            aria-label="Abrir material: ${m.title}">
            <i class="fas fa-book-open" aria-hidden="true"></i>
            ${done ? 'Revisar' : 'Estudar'}
          </button>
        </div>
      </article>`;
  },

  _bindMaterialCards() {
    document.querySelectorAll('[data-material-id]').forEach(btn => {
      btn.addEventListener('click', () => Pages.openMaterial(btn.dataset.materialId));
    });
  },

  async openMaterial(id) {
    Nav.go('material_view', { id });
  },

  // ── Leitor de Material ───────────────────────────────────────────────────
  async renderMaterialView(id) {
    UI.spinner(true);
    try {
      const material = await API.getMaterial(id);
      this.currentMaterial = material;
      await API.markMaterialViewed(id);
      UI.spinner(false);

      const user = API.getUser();
      const prefs = A11y.getPrefs();
      let quiz = [];
      try { quiz = material.quiz ? (typeof material.quiz === 'string' ? JSON.parse(material.quiz) : material.quiz) : []; } catch {}
      const subj = SUBJECTS[material.subject] || { label: material.subject, icon: '📄' };

      // Seções especiais de acessibilidade
      const transcriptSection = (prefs.transcripts || user.special_needs === 'auditiva') && material.transcript
        ? `<div class="transcript-box" role="note" aria-label="Transcrição do conteúdo">
            <div class="transcript-label"><i class="fas fa-closed-captioning" aria-hidden="true"></i> Transcrição</div>
            <p>${material.transcript}</p>
          </div>` : '';

      const simplifiedSection = (prefs.simplifiedText || user.special_needs === 'intelectual') && material.simplified_text
        ? `<div class="simplified-box" role="note" aria-label="Versão simplificada">
            <div class="simplified-label"><i class="fas fa-feather-alt" aria-hidden="true"></i> Versão Simplificada</div>
            <p>${material.simplified_text}</p>
          </div>` : '';

      const librasSection = (prefs.libras || user.special_needs === 'auditiva')
        ? `<div class="libras-widget" role="complementary" aria-label="Intérprete de Libras">
            <div class="libras-avatar" aria-hidden="true">🤟</div>
            <div class="libras-label">Intérprete de Libras</div>
            <p class="text-sm text-muted mt-sm">Conectando com intérprete virtual…</p>
            <button class="btn btn-sm btn-outline libras-btn" onclick="UI.toast('Recurso Libras em breve!','info')">
              <i class="fas fa-play" aria-hidden="true"></i> Iniciar Interpretação
            </button>
          </div>` : '';

      const videoSection = material.video_url
        ? `<div class="video-embed" role="region" aria-label="Vídeo da aula">
            <iframe src="${material.video_url}" allowfullscreen
              title="Vídeo: ${material.title}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
            </iframe>
          </div>` : '';

      // Rotina visual para autismo
      const routineSection = (prefs.routineVisual || user.special_needs === 'autismo')
        ? `<div class="card mb-md" id="routine-container" role="region" aria-label="Rotina da aula">
            <div class="card-title"><i class="fas fa-list-check"></i> Roteiro da Aula</div>
          </div>` : '';

      // Passos para def. intelectual
      const stepsSection = (prefs.stepByStep || user.special_needs === 'intelectual')
        ? `<div class="card mb-md" id="steps-container" role="region" aria-label="Passo a passo">
            <div class="card-title"><i class="fas fa-shoe-prints"></i> Passo a Passo</div>
          </div>` : '';

      UI.setHeader(material.title, `${subj.icon} ${subj.label} — ${TURMAS[material.turma] || material.turma}`);
      UI.setContent(`
        <div class="material-reader">
          <div class="reader-header">
            <button class="reader-back" onclick="Nav.go('materials')"
              aria-label="Voltar para lista de materiais">
              <i class="fas fa-arrow-left" aria-hidden="true"></i>
            </button>
            <div>
              <h2 class="reader-title">${material.title}</h2>
              <div class="reader-meta">${subj.icon} ${subj.label} · ${TURMAS[material.turma] || ''} · por ${material.author_name || 'Professor'}</div>
            </div>
          </div>

          <!-- Ferramentas de acessibilidade do leitor -->
          <div class="reader-a11y-tools" role="toolbar" aria-label="Ferramentas de leitura">
            <button class="reader-a11y-btn ${prefs.narration ? 'active' : ''}"
              onclick="A11y.toggle('narration'); Pages._onNarrationToggle()" id="reader-narrate-btn"
              aria-pressed="${prefs.narration}" aria-label="Narrar texto">
              <i class="fas fa-volume-up" aria-hidden="true"></i> Narrar
            </button>
            <button class="reader-a11y-btn ${prefs.guidedReading ? 'active' : ''}"
              onclick="A11y.toggle('guidedReading'); Pages._onGuidedToggle()" id="reader-guided-btn"
              aria-pressed="${prefs.guidedReading}" aria-label="Leitura guiada">
              <i class="fas fa-book-reader" aria-hidden="true"></i> Guiada
            </button>
            ${prefs.guidedReading ? `
              <button class="reader-a11y-btn guided-nav-btn" onclick="A11y.prevGuidedParagraph()" aria-label="Parágrafo anterior">
                <i class="fas fa-chevron-left" aria-hidden="true"></i>
              </button>
              <button class="reader-a11y-btn guided-nav-btn" onclick="A11y.nextGuidedParagraph()" aria-label="Próximo parágrafo">
                <i class="fas fa-chevron-right" aria-hidden="true"></i>
              </button>` : ''}
            <button class="reader-a11y-btn ${prefs.dyslexiaFont ? 'active' : ''}"
              onclick="A11y.toggle('dyslexiaFont')" aria-pressed="${prefs.dyslexiaFont}" aria-label="Fonte dislexia">
              <i class="fas fa-spell-check" aria-hidden="true"></i> Dislexia
            </button>
            <button class="reader-a11y-btn ${prefs.lineHighlight ? 'active' : ''}"
              onclick="A11y.toggle('lineHighlight')" aria-pressed="${prefs.lineHighlight}" aria-label="Realce de linhas">
              <i class="fas fa-highlighter" aria-hidden="true"></i> Realce
            </button>
            ${material.audio_desc ? `
              <button class="reader-a11y-btn" onclick="A11y.speak('${material.audio_desc}')" aria-label="Audiodescrição">
                <i class="fas fa-headphones" aria-hidden="true"></i> Áudio
              </button>` : ''}
          </div>

          <div class="reader-body">
            ${routineSection}
            ${stepsSection}
            ${videoSection}

            <article class="reader-content" id="reader-content"
              aria-label="Conteúdo do material" tabindex="0">
              ${material.content || '<p>Conteúdo não disponível.</p>'}
            </article>

            ${transcriptSection}
            ${simplifiedSection}
            ${librasSection}

            ${quiz.length ? `
              <div class="mt-lg">
                <button class="btn btn-primary btn-lg btn-full"
                  onclick="Pages.startQuiz('${material.id}', ${JSON.stringify(quiz).replace(/"/g, '&quot;')})"
                  aria-label="Iniciar quiz sobre este material">
                  <i class="fas fa-question-circle" aria-hidden="true"></i>
                  Fazer Quiz (${quiz.length} questões)
                </button>
              </div>` : ''}
          </div>
        </div>
      `);

      // Iniciar leitura guiada automática se ativada
      // Duplo rAF garante que o DOM foi completamente renderizado antes de buscar <p>
      if (prefs.guidedReading || user.special_needs === 'dislexia') {
        requestAnimationFrame(() => requestAnimationFrame(() => A11y.startGuidedReading()));
      }

      // Rotina visual - Autismo
      if (prefs.routineVisual || user.special_needs === 'autismo') {
        const routineContainer = document.getElementById('routine-container');
        if (routineContainer) {
          const steps = [
            { name: 'Leia o título e descrição', icon: '📖' },
            { name: material.video_url ? 'Assista ao vídeo' : 'Leia o conteúdo', icon: '▶️' },
            { name: 'Releia partes importantes', icon: '🔍' },
            quiz.length ? { name: 'Responda o quiz', icon: '✏️' } : null,
            { name: 'Anote o que aprendeu', icon: '📝' },
          ].filter(Boolean);
          const stepsDiv = document.createElement('div');
          routineContainer.appendChild(stepsDiv);
          A11y.renderRoutineSteps(stepsDiv, steps);
        }
      }

      // Passos - Def. Intelectual
      if (prefs.stepByStep || user.special_needs === 'intelectual') {
        const stepsContainer = document.getElementById('steps-container');
        if (stepsContainer) {
          const sentences = (material.simplified_text || material.content || '')
            .split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 4);
          const steps = sentences.map((s, i) => ({
            title: `Passo ${i + 1}`,
            desc: s.trim() + '.',
            visual: ['📖', '🤔', '💡', '✅'][i] || '📌'
          }));
          A11y.renderStepByStep(stepsContainer, steps);
        }
      }

      // Narração automática para def. visual
      // Usa duplo rAF para garantir DOM pronto; narração só se não estiver em leitura guiada
      if ((prefs.narration || user.special_needs === 'visual') && !prefs.guidedReading) {
        requestAnimationFrame(() => requestAnimationFrame(() => A11y.readPage()));
      }
    } catch (err) {
      UI.spinner(false);
      UI.toast('Erro ao carregar material.', 'error');
      console.error(err);
    }
  },

  _onNarrationToggle() {
    const btn = document.getElementById('reader-narrate-btn');
    if (btn) {
      const active = A11y.hasFeature('narration');
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
      if (active) A11y.readPage();
    }
  },

  _onGuidedToggle() {
    const btn = document.getElementById('reader-guided-btn');
    if (!btn) return;
    const active = A11y.hasFeature('guidedReading');
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);

    // Mostrar/ocultar botões de navegação prev/next na toolbar
    const toolbar = btn.closest('.reader-a11y-tools');
    if (toolbar) {
      // Remove botões anteriores de navegação guiada
      toolbar.querySelectorAll('.guided-nav-btn').forEach(b => b.remove());
      if (active) {
        // Adiciona botões prev/next após o botão "Guiada"
        const prevBtn = document.createElement('button');
        prevBtn.className = 'reader-a11y-btn guided-nav-btn';
        prevBtn.setAttribute('aria-label', 'Parágrafo anterior');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left" aria-hidden="true"></i>';
        prevBtn.onclick = () => A11y.prevGuidedParagraph();

        const nextBtn = document.createElement('button');
        nextBtn.className = 'reader-a11y-btn guided-nav-btn';
        nextBtn.setAttribute('aria-label', 'Próximo parágrafo');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';
        nextBtn.onclick = () => A11y.nextGuidedParagraph();

        btn.insertAdjacentElement('afterend', nextBtn);
        btn.insertAdjacentElement('afterend', prevBtn);
        // startGuidedReading já foi chamado pelo toggle() interno
      }
    }
  },

  // ── Quiz ──────────────────────────────────────────────────────────────────
  startQuiz(materialId, questions) {
    Nav.go('quiz', { materialId, questions });
  },

  renderQuiz({ materialId, questions }) {
    if (!questions || !questions.length) {
      UI.toast('Quiz não disponível.', 'warning'); return;
    }

    const user = API.getUser();
    const prefs = A11y.getPrefs();
    const isIntelectual = prefs.stepByStep || user.special_needs === 'intelectual';

    let currentQ = 0;
    let answers = [];
    let answered = false;

    UI.setHeader('Quiz', `${questions.length} questões`);

    const renderQuestion = () => {
      const raw = questions[currentQ];
      // Normalizar formato: suporta {q, options, correct} e {question, options, correct}
      const q = {
        question: raw.question || raw.q || '',
        options:  raw.options  || [],
        correct:  raw.correct  !== undefined ? raw.correct : 0,
      };
      const progress = ((currentQ / questions.length) * 100).toFixed(0);
      answered = false;

      // Instrução por narração
      if (prefs.narration || user.special_needs === 'visual') {
        A11y.speak(`Questão ${currentQ + 1} de ${questions.length}. ${q.question}`);
      }

      UI.setContent(`
        <div class="quiz-section">
          <div class="quiz-header">
            <h2>Quiz</h2>
            <p>${currentQ + 1} de ${questions.length} questões</p>
          </div>

          <div class="quiz-progress-bar" role="progressbar"
            aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"
            aria-label="Progresso do quiz: ${progress}%">
            <div class="quiz-progress-fill" style="width:${progress}%"></div>
          </div>

          ${isIntelectual ? `
            <div class="simplified-box mb-md" role="note">
              <div class="simplified-label"><i class="fas fa-lightbulb"></i> Dica</div>
              <p>Leia a pergunta com atenção. Escolha apenas uma resposta.</p>
            </div>` : ''}

          <div class="quiz-question-num" aria-hidden="true">Questão ${currentQ + 1}</div>
          <div class="quiz-question" id="quiz-question-text"
            role="heading" aria-level="3">
            ${q.question}
          </div>

          <div class="quiz-options" role="group" aria-label="Opções de resposta" id="quiz-options">
            ${q.options.map((opt, i) => `
              <button class="quiz-option" data-index="${i}"
                aria-pressed="false"
                aria-label="Opção ${String.fromCharCode(65 + i)}: ${opt.text || opt}">
                <span class="quiz-option-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
                <span>${opt.text || opt}</span>
              </button>`).join('')}
          </div>

          <div id="quiz-feedback" class="hidden" role="alert" aria-live="polite"></div>

          <div class="quiz-actions">
            <button class="btn btn-secondary" onclick="Nav.go('material_view', {id: '${materialId}'})"
              aria-label="Voltar ao material">
              <i class="fas fa-arrow-left" aria-hidden="true"></i> Voltar
            </button>
            <button class="btn btn-primary hidden" id="quiz-next-btn"
              aria-label="Próxima questão">
              ${currentQ < questions.length - 1 ? 'Próxima <i class="fas fa-arrow-right"></i>' : 'Ver Resultado <i class="fas fa-check"></i>'}
            </button>
          </div>
        </div>
      `);

      // Bind de opções
      document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const idx = parseInt(btn.dataset.index);
          const correct = q.correct !== undefined ? q.correct : q.options.findIndex(o => o.isCorrect);
          const isOk = idx === correct;

          // Visual feedback
          document.querySelectorAll('.quiz-option').forEach((b, i) => {
            b.disabled = true;
            if (i === correct) b.classList.add('correct');
            else if (i === idx && !isOk) b.classList.add('wrong');
          });

          answers.push({ questionIndex: currentQ, selectedIndex: idx, correct: isOk });

          // Feedback narrado
          const feedbackMsg = isOk ? 'Correto! Muito bem!' : `Incorreto. A resposta certa era: ${q.options[correct]?.text || q.options[correct]}.`;
          if (prefs.narration || user.special_needs === 'visual') A11y.speak(feedbackMsg);

          const feedback = document.getElementById('quiz-feedback');
          if (feedback) {
            feedback.className = `quiz-feedback ${isOk ? 'correct' : 'wrong'}`;
            feedback.innerHTML = `<i class="fas fa-${isOk ? 'check-circle' : 'times-circle'}"></i> ${feedbackMsg}`;
          }

          document.getElementById('quiz-next-btn')?.classList.remove('hidden');
        });
      });

      document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
        if (currentQ < questions.length - 1) {
          currentQ++;
          renderQuestion();
        } else {
          Pages.renderQuizResult(materialId, questions, answers);
        }
      });
    };

    renderQuestion();
  },

  async renderQuizResult(materialId, questions, answers) {
    const correct = answers.filter(a => a.correct).length;
    const total   = questions.length;
    const pct     = Math.round((correct / total) * 100);
    const stars   = pct >= 80 ? '⭐⭐⭐' : pct >= 50 ? '⭐⭐' : '⭐';

    UI.spinner(true);
    let earnedPoints = 0;
    try {
      const result = await API.saveQuizResult(materialId, correct, total, answers);
      earnedPoints = result?.earnedPoints || 0;
      UI.spinner(false);
    } catch { UI.spinner(false); }

    const msg = pct >= 80 ? 'Excelente! Continue assim! 🎉'
              : pct >= 50 ? 'Bom trabalho! Você pode melhorar ainda mais! 💪'
              : 'Continue estudando, você vai conseguir! 📚';

    if (A11y.hasFeature('narration') || API.getUser()?.special_needs === 'visual') {
      A11y.speak(`Resultado: ${pct} porcento. ${msg}`);
    }

    UI.setContent(`
      <div class="quiz-section">
        <div class="quiz-result animate-pop" role="main" aria-label="Resultado do quiz">
          <div class="result-stars" aria-label="${stars} estrelas" role="img">${stars}</div>
          <div class="result-score" aria-label="${pct} porcento">${pct}%</div>
          <div class="result-label">${correct} de ${total} respostas corretas</div>
          <p style="color:var(--text2);margin-bottom:1.25rem;">${msg}</p>
          ${earnedPoints ? `
            <div class="result-points" aria-label="${earnedPoints} pontos ganhos">
              <i class="fas fa-star" aria-hidden="true"></i> +${earnedPoints} XP ganhos!
            </div>` : ''}
          <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.25rem;">
            <button class="btn btn-outline" onclick="Nav.go('material_view', {id: '${materialId}'})"
              aria-label="Revisar o material">
              <i class="fas fa-book-open" aria-hidden="true"></i> Revisar Material
            </button>
            <button class="btn btn-primary" onclick="Pages.startQuiz('${materialId}', ${JSON.stringify(questions).replace(/"/g, '&quot;')})"
              aria-label="Tentar o quiz novamente">
              <i class="fas fa-redo" aria-hidden="true"></i> Tentar Novamente
            </button>
            <button class="btn btn-secondary" onclick="Nav.go('materials')"
              aria-label="Ver todos os materiais">
              <i class="fas fa-th" aria-hidden="true"></i> Ver Materiais
            </button>
          </div>
        </div>
      </div>
    `);
  },

  // ── Perfil ────────────────────────────────────────────────────────────────
  async renderProfile() {
    UI.setHeader('Meu Perfil', 'Dados e preferências de acessibilidade');
    const user = API.getUser();
    if (!user) return;

    const prefs = A11y.getPrefs();

    UI.setContent(`
      <div class="grid-2" style="gap:1.25rem;align-items:start;">
        <div>
          <div class="card mb-md">
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">
              <div class="profile-avatar-lg" aria-label="Avatar" aria-hidden="true">
                ${user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size:1.1rem;font-weight:700;">${user.name}</div>
                <div class="text-sm text-muted">${user.email}</div>
                <span class="role-tag role-${user.role} mt-sm">${user.role}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="profile-name">Nome</label>
              <input id="profile-name" class="form-input" type="text" value="${user.name}">
            </div>

            <div class="form-group">
              <label class="form-label" for="profile-email">E-mail</label>
              <input id="profile-email" class="form-input" type="email" value="${user.email}" readonly>
            </div>

            <button class="btn btn-primary btn-full" onclick="Pages._saveProfile()" aria-label="Salvar perfil">
              <i class="fas fa-save" aria-hidden="true"></i> Salvar Perfil
            </button>
          </div>

          <!-- Estatísticas -->
          <div class="card">
            <div class="card-title"><i class="fas fa-chart-bar"></i> Estatísticas</div>
            <div class="stats-grid" style="grid-template-columns:1fr 1fr;gap:.75rem;">
              <div class="stat-card">
                <div class="stat-icon gold"><i class="fas fa-trophy"></i></div>
                <div><div class="stat-value">${user.points || 0}</div><div class="stat-label">XP Total</div></div>
              </div>
              <div class="stat-card">
                <div class="stat-icon purple"><i class="fas fa-layer-group"></i></div>
                <div><div class="stat-value">${user.level || 1}</div><div class="stat-label">Nível</div></div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <!-- Acessibilidade -->
          <div class="card mb-md">
            <div class="card-title"><i class="fas fa-universal-access"></i> Necessidades Especiais</div>
            <p class="text-sm text-muted mb-md">Selecione seu perfil para ativar as adaptações automaticamente.</p>
            <div class="profile-needs-grid" id="needs-grid" role="radiogroup" aria-label="Perfil de necessidades especiais">
              ${Object.entries(SPECIAL_NEEDS).map(([k, v]) => `
                <button class="profile-need-card ${user.special_needs === k ? 'selected' : ''}"
                  data-need="${k}" role="radio" aria-checked="${user.special_needs === k}"
                  aria-label="${v.label}">
                  <div class="need-icon" aria-hidden="true">${v.icon}</div>
                  <div class="need-name">${v.label}</div>
                </button>`).join('')}
            </div>
            <button class="btn btn-primary btn-full mt-md" onclick="Pages._saveNeeds()" aria-label="Aplicar perfil de acessibilidade">
              <i class="fas fa-check" aria-hidden="true"></i> Aplicar Perfil
            </button>
          </div>

          <!-- Preferências visuais -->
          <div class="card">
            <div class="card-title"><i class="fas fa-sliders-h"></i> Ajustes Rápidos</div>
            <div class="a11y-switch-row">
              <span>Alto Contraste</span>
              <label class="a11y-switch" aria-label="Alto contraste">
                <input type="checkbox" id="pref-contrast" ${prefs.highContrast ? 'checked' : ''} onchange="A11y.toggle('highContrast')">
                <span class="a11y-switch-slider"></span>
              </label>
            </div>
            <div class="a11y-switch-row">
              <span>Fonte Dislexia</span>
              <label class="a11y-switch" aria-label="Fonte dislexia">
                <input type="checkbox" id="pref-dyslexia" ${prefs.dyslexiaFont ? 'checked' : ''} onchange="A11y.toggle('dyslexiaFont')">
                <span class="a11y-switch-slider"></span>
              </label>
            </div>
            <div class="a11y-switch-row">
              <span>Reduzir Animações</span>
              <label class="a11y-switch" aria-label="Reduzir animações">
                <input type="checkbox" id="pref-motion" ${prefs.reduceMotion ? 'checked' : ''} onchange="A11y.toggle('reduceMotion')">
                <span class="a11y-switch-slider"></span>
              </label>
            </div>
            <div class="a11y-switch-row">
              <span>Narração de Texto</span>
              <label class="a11y-switch" aria-label="Narração de texto">
                <input type="checkbox" id="pref-narration" ${prefs.narration ? 'checked' : ''} onchange="A11y.toggle('narration')">
                <span class="a11y-switch-slider"></span>
              </label>
            </div>
            <div style="margin-top:.75rem;">
              <span class="text-sm text-muted">Tamanho da Fonte</span>
              <div style="display:flex;gap:.4rem;margin-top:.4rem;">
                <button class="btn btn-sm ${prefs.fontSize === 'normal' ? 'btn-primary' : 'btn-secondary'}" onclick="A11y.setFontSize('normal')">Normal</button>
                <button class="btn btn-sm ${prefs.fontSize === 'large' ? 'btn-primary' : 'btn-secondary'}" onclick="A11y.setFontSize('large')">Grande</button>
                <button class="btn btn-sm ${prefs.fontSize === 'xlarge' ? 'btn-primary' : 'btn-secondary'}" onclick="A11y.setFontSize('xlarge')">Extra</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    // Selecionar necessidade
    let selectedNeed = user.special_needs || 'none';
    document.querySelectorAll('.profile-need-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedNeed = card.dataset.need;
        document.querySelectorAll('.profile-need-card').forEach(c => {
          c.classList.toggle('selected', c.dataset.need === selectedNeed);
          c.setAttribute('aria-checked', c.dataset.need === selectedNeed);
        });
      });
    });

    this._selectedNeed = user.special_needs;
    document.querySelectorAll('.profile-need-card').forEach(card => {
      card.addEventListener('click', () => { this._selectedNeed = card.dataset.need; });
    });
  },

  async _saveProfile() {
    const name = document.getElementById('profile-name')?.value.trim();
    if (!name) { UI.toast('Nome inválido.', 'error'); return; }
    const user = API.getUser();
    UI.spinner(true);
    try {
      await API.updateUser(user.id, { name });
      API.setUser({ ...user, name });
      UI.spinner(false);
      UI.toast('Perfil atualizado!', 'success');
    } catch (err) { UI.spinner(false); UI.toast(err.message, 'error'); }
  },

  async _saveNeeds() {
    const need = this._selectedNeed || 'none';
    const user = API.getUser();
    UI.spinner(true);
    try {
      await API.updateUser(user.id, { special_needs: need });
      API.setUser({ ...user, special_needs: need });
      A11y.autoApplyProfile(need);
      UI.spinner(false);
      UI.toast('Perfil de acessibilidade aplicado!', 'success');
    } catch (err) { UI.spinner(false); UI.toast(err.message, 'error'); }
  },

  // ── Ranking ───────────────────────────────────────────────────────────────
  async renderRanking() {
    UI.setHeader('Ranking', 'Top alunos da plataforma');
    UI.spinner(true);
    try {
      const user = API.getUser();
      const ranking = await API.getRanking(20);
      UI.spinner(false);
      const myPos = ranking.findIndex(u => u.id === user.id) + 1;

      UI.setContent(`
        <div class="card" role="region" aria-label="Ranking de alunos">
          <div class="card-title"><i class="fas fa-trophy"></i> Ranking Geral</div>
          ${myPos > 0 ? `<p class="text-sm text-muted mb-md" aria-live="polite">Você está na posição <strong>#${myPos}</strong></p>` : ''}
          <div class="ranking-list" role="list">
            ${ranking.map((u, i) => `
              <div class="ranking-item ${u.id === user.id ? 'me' : ''}" role="listitem">
                <span class="ranking-pos ${i === 0 ? 'gold-pos' : i === 1 ? 'silver-pos' : i === 2 ? 'bronze-pos' : ''}"
                  aria-label="Posição ${i + 1}">
                  ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div class="sidebar-avatar" style="width:28px;height:28px;font-size:.75rem;flex-shrink:0" aria-hidden="true">
                  ${u.name.charAt(0)}
                </div>
                <span class="ranking-name">${u.name}${u.id === user.id ? ' (você)' : ''}</span>
                <span class="ranking-pts">${u.points || 0} XP</span>
              </div>`).join('') || '<p class="text-muted text-sm">Nenhum aluno encontrado.</p>'}
          </div>
        </div>
      `);
    } catch (err) {
      UI.spinner(false);
      UI.toast('Erro ao carregar ranking.', 'error');
    }
  },

  // ── Missões ───────────────────────────────────────────────────────────────
  async renderMissions() {
    UI.setHeader('Missões', 'Desafios para ganhar XP');
    const user = API.getUser();
    const isTdah = user?.special_needs === 'tdah' || A11y.hasFeature('tdahFocus');

    const allMissions = [
      { id: 1,  name: 'Entrar na plataforma hoje',     xp: 10,  icon: '🚀', done: true },
      { id: 2,  name: 'Estudar 1 material',            xp: 50,  icon: '📖', done: false },
      { id: 3,  name: 'Estudar 3 materiais',           xp: 120, icon: '📚', done: false },
      { id: 4,  name: 'Completar 1 quiz',              xp: 80,  icon: '✏️',  done: false },
      { id: 5,  name: 'Acertar 70% ou mais num quiz',  xp: 100, icon: '🎯', done: false },
      { id: 6,  name: 'Acertar 100% num quiz',         xp: 200, icon: '🏆', done: false },
      { id: 7,  name: 'Completar 5 quizzes',           xp: 300, icon: '⭐', done: false },
      { id: 8,  name: 'Estudar todas as disciplinas',  xp: 500, icon: '🌟', done: false },
      ...(isTdah ? [
        { id: 9,  name: 'Completar 1 Pomodoro',        xp: 30,  icon: '⏰', done: false },
        { id: 10, name: 'Completar 4 Pomodoros',       xp: 100, icon: '🔥', done: false },
      ] : []),
    ];

    UI.setContent(`
      <div class="mission-board" role="main" aria-label="Lista de missões">
        <div class="mission-header">
          <i class="fas fa-tasks" aria-hidden="true"></i>
          <h2 style="font-size:.95rem">${isTdah ? '⚡ Missões (Modo TDAH)' : '🎯 Missões'}</h2>
        </div>
        ${isTdah ? `
          <div class="simplified-box" style="margin:.75rem;border-radius:var(--radius);" role="note">
            <p class="text-sm">Complete uma missão de cada vez. Após cada missão, faça uma pausa! ☕</p>
          </div>` : ''}
        <div class="mission-list" role="list">
          ${allMissions.map(m => `
            <div class="mission-item ${m.done ? 'done' : ''}" role="listitem"
              aria-label="${m.name}, ${m.xp} XP${m.done ? ', concluída' : ''}">
              <div class="mission-check" aria-hidden="true">
                ${m.done ? '<i class="fas fa-check" style="font-size:.65rem;color:#fff"></i>' : ''}
              </div>
              <span style="font-size:1.1rem;margin-right:.25rem;" aria-hidden="true">${m.icon}</span>
              <span class="mission-name">${m.name}</span>
              <span class="mission-xp">+${m.xp} XP</span>
            </div>`).join('')}
        </div>
      </div>
    `);
  }
};

// ─── App Principal ────────────────────────────────────────────────────────
const App = {
  init() {
    this._buildLogin();
    this._setupSidebar();

    if (API.isAuthenticated()) {
      this._loadUser();
    } else {
      this.showLogin();
    }

    // Disponibilizar navigate globalmente para comandos de voz
    window.App = this;
  },

  async _loadUser() {
    try {
      const user = await API.getMe();
      this.onLogin(user);
    } catch {
      this.showLogin();
    }
  },

  onLogin(user) {
    // Redirecionar professor para o painel dedicado
    if (user.role === 'professor') {
      window.location.href = 'professor.html';
      return;
    }

    // Gestor tem painel próprio — não deveria chegar aqui, mas garantir
    if (user.role === 'gestor') {
      window.location.href = 'gestor.html';
      return;
    }

    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');
    this._updateSidebarUser(user);

    // Aplicar preferências de acessibilidade do usuário
    A11y.init();

    Nav.go('home');
  },

  showLogin() {
    document.getElementById('app-container')?.classList.add('hidden');
    document.getElementById('login-screen')?.classList.remove('hidden');
    A11y.init(); // Ainda aplicar a11y na tela de login
  },

  logout() {
    Auth.logout();
  },

  navigate(page) { Nav.go(page); },

  _buildLogin() {
    const screen = document.getElementById('login-screen');
    if (!screen) return;
    screen.innerHTML = `
      <div class="login-box" role="main">
        <div class="login-logo">
          <i class="fas fa-graduation-cap" aria-hidden="true"></i>
          <h1>RAPIN</h1>
          <p>Rede de Apoio Pedagógico e Inclusão Neuroeducacional</p>
        </div>

        <div class="login-tabs" role="tablist" aria-label="Tipo de acesso">
          <button class="login-tab active" role="tab" aria-selected="true" id="tab-login">Entrar</button>
          <button class="login-tab" role="tab" aria-selected="false" id="tab-about">Sobre</button>
        </div>

        <div id="login-form-area">
          <form id="login-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-email">E-mail</label>
              <input class="form-input" type="email" id="login-email"
                placeholder="seu@email.com" required autocomplete="email"
                aria-required="true">
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Senha</label>
              <input class="form-input" type="password" id="login-password"
                placeholder="••••••••" required autocomplete="current-password"
                aria-required="true">
            </div>
            <div class="form-group">
              <label class="form-label" for="login-needs">Perfil de acessibilidade</label>
              <select class="form-select" id="login-needs" aria-label="Selecione seu perfil de necessidades especiais">
                <option value="none">Sem necessidade específica</option>
                <option value="dislexia">📝 Dislexia</option>
                <option value="tdah">⚡ TDAH</option>
                <option value="visual">👁️ Deficiência Visual</option>
                <option value="auditiva">👂 Deficiência Auditiva</option>
                <option value="autismo">🧩 Autismo</option>
                <option value="intelectual">🌱 Deficiência Intelectual</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full btn-lg" aria-label="Entrar na plataforma">
              <i class="fas fa-sign-in-alt" aria-hidden="true"></i> Entrar
            </button>
          </form>
          <div class="login-demo-box">
            <div style="font-weight:600;color:var(--text);margin-bottom:.35rem;font-size:.72rem;">
              <i class="fas fa-key" aria-hidden="true" style="color:var(--accent);margin-right:.3rem;"></i>
              Credenciais de demonstração
            </div>
            <div><strong>nome@aluno.edu.pi.gov.br</strong> / aluno123 — Dislexia</div>
          </div>
          <div class="login-footer">
            <a href="professor.html" style="margin-right:.75rem;">
              <i class="fas fa-chalkboard-teacher" aria-hidden="true"></i> Painel do Professor
            </a>
            <a href="gestor.html">
              <i class="fas fa-shield-alt" aria-hidden="true"></i> Painel do Gestor
            </a>
          </div>
        </div>

        <div id="about-area" class="hidden">
          <div style="color:var(--text2);font-size:.84rem;line-height:1.7;">
            <p style="margin-bottom:.75rem;"><strong>RAPIN</strong> é uma rede que adapta o conteúdo pedagógico às necessidades de cada estudante.</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.75rem;">
              ${Object.entries(SPECIAL_NEEDS).filter(([k]) => k !== 'none').map(([k, v]) => `
                <div style="padding:.5rem;background:var(--bg3);border-radius:var(--radius);font-size:.78rem;">
                  <span>${v.icon}</span> <strong>${v.label}</strong>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Tabs
    document.getElementById('tab-login')?.addEventListener('click', () => {
      document.getElementById('login-form-area')?.classList.remove('hidden');
      document.getElementById('about-area')?.classList.add('hidden');
      document.getElementById('tab-login')?.classList.add('active');
      document.getElementById('tab-about')?.classList.remove('active');
    });
    document.getElementById('tab-about')?.addEventListener('click', () => {
      document.getElementById('about-area')?.classList.remove('hidden');
      document.getElementById('login-form-area')?.classList.add('hidden');
      document.getElementById('tab-about')?.classList.add('active');
      document.getElementById('tab-login')?.classList.remove('active');
    });

    // Login form
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('login-email')?.value.trim();
      const password = document.getElementById('login-password')?.value;
      const needs    = document.getElementById('login-needs')?.value || 'none';

      if (!email || !password) { UI.toast('Preencha e-mail e senha.', 'error'); return; }

      // Aplicar perfil de acessibilidade antes do login
      if (needs !== 'none') A11y.autoApplyProfile(needs);

      await Auth.login(email, password);
    });
  },

  _setupSidebar() {
    const sidebar  = document.getElementById('main-sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const toggle   = document.getElementById('sidebar-mobile-toggle');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');

    /** Abre a sidebar mobile */
    const openMobile = () => {
      sidebar?.classList.add('mobile-open');
      overlay?.classList.add('visible');
      overlay?.removeAttribute('aria-hidden');
      toggle?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden'; // impede scroll do fundo
    };

    /** Fecha a sidebar mobile */
    const closeMobile = () => {
      sidebar?.classList.remove('mobile-open');
      overlay?.classList.remove('visible');
      overlay?.setAttribute('aria-hidden', 'true');
      toggle?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    // Botão hambúrguer
    toggle?.addEventListener('click', () => {
      sidebar?.classList.contains('mobile-open') ? closeMobile() : openMobile();
    });

    // Clicar no overlay fecha a sidebar
    overlay?.addEventListener('click', closeMobile);

    // ESC fecha a sidebar
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sidebar?.classList.contains('mobile-open')) closeMobile();
    });

    // Toggle collapse (desktop)
    collapseBtn?.addEventListener('click', () => {
      sidebar?.classList.toggle('collapsed');
      const isCollapsed = sidebar?.classList.contains('collapsed');
      collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expandir menu' : 'Recolher menu');
      const icon = collapseBtn.querySelector('i');
      if (icon) {
        icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
      }
    });

    // Fechar sidebar ao navegar (mobile)
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        Nav.go(item.dataset.page);
        if (window.innerWidth <= 960) closeMobile();
      });
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      UI.confirm('Deseja sair da plataforma?', () => Auth.logout());
    });
  },

  _updateSidebarUser(user) {
    const avatar = document.getElementById('sidebar-avatar');
    const name   = document.getElementById('sidebar-user-name');
    const role   = document.getElementById('sidebar-user-role');
    const points = document.getElementById('sidebar-user-points');
    const levelFill = document.getElementById('sidebar-level-fill');

    if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
    if (name)   name.textContent   = user.name;
    if (role)   role.textContent   = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    if (points) points.textContent = `${user.points || 0} XP · Nível ${user.level || 1}`;

    const lvlPct = ((user.points || 0) % 200) / 200 * 100;
    if (levelFill) levelFill.style.width = `${lvlPct}%`;

    // Mostrar/ocultar itens do menu por role
    if (user.role === 'gestor') {
      document.querySelectorAll('[data-roles]').forEach(el => {
        const roles = el.dataset.roles?.split(',') || [];
        el.style.display = roles.includes(user.role) ? '' : 'none';
      });
    }
  }
};

// ─── Inicialização ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});