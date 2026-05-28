/**
 * RAPIN — Módulo de Acessibilidade Avançada
 *
 * Perfis suportados:
 *  - Dislexia:            fontes especiais, espaçamento, realce de linhas, leitura guiada
 *  - TDAH:                blocos curtos, missões, foco por missão, pomodoro, redução de distrações
 *  - Deficiência Visual:  leitor de tela, narração inteligente, comandos por voz, alto contraste
 *  - Deficiência Auditiva:transcrição, legendas automáticas, avatar Libras
 *  - Autismo:             interface previsível, rotina visual, baixa estimulação, antecipação
 *  - Def. Intelectual:    passo a passo, simplificação textual, apoio visual, reforço gradual
 */
'use strict';

const A11y = (() => {

  // ─── Estado ───────────────────────────────────────────────────────────────
  let prefs = {
    highContrast:   false,
    fontSize:       'normal',     // normal | large | xlarge
    dyslexiaFont:   false,
    dyslexiaSpacing:false,
    lineHighlight:  false,
    guidedReading:  false,
    reduceMotion:   false,
    screenReader:   false,
    voiceCommands:  false,
    narration:      false,
    transcripts:    false,
    libras:         false,
    lowStimulation: false,
    routineVisual:  false,
    stepByStep:     false,
    simplifiedText: false,
    tdahFocus:      false,
    pomodoro:       false,
    special_needs:  'none',
  };

  let voiceRecognition = null;
  let narrationUtterance = null;
  let pomodoroInterval = null;
  let pomodoroSeconds = 25 * 60;
  let pomodoroIsBreak = false;
  let pomodoroRunning = false;
  let guidedReadingIndex = 0;
  let guidedReadingParagraphs = [];

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    _loadPrefs();
    _applyAll();
    _buildA11yBar();
    _buildVoiceBar();
    _setupKeyboardShortcuts();

    // Aplicar perfil automático baseado em necessidades do usuário
    const user = window.API?.getUser();
    if (user?.special_needs && user.special_needs !== 'none') {
      autoApplyProfile(user.special_needs);
    }
  }

  function _loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem('edu_a11y') || '{}');
      Object.assign(prefs, saved);

      // Tentar também pelas preferências do usuário logado
      const user = window.API?.getUser();
      if (user?.a11y_prefs) {
        const userPrefs = typeof user.a11y_prefs === 'string'
          ? JSON.parse(user.a11y_prefs)
          : user.a11y_prefs;
        Object.assign(prefs, userPrefs);
      }
    } catch {}
  }

  function _savePrefs() {
    localStorage.setItem('edu_a11y', JSON.stringify(prefs));
    // Persistir no perfil do usuário
    if (window.API?.isAuthenticated()) {
      window.API.updateA11yPrefs(prefs).catch(() => {});
    }
  }

  // ─── Aplicar todas as preferências ───────────────────────────────────────
  function _applyAll() {
    const body   = document.body;
    const htmlEl = document.documentElement; // <html> — rem é relativo a ele!

    // ✅ TAMANHO DE FONTE — classes no <html> para que rem cascade corretamente
    htmlEl.classList.remove('font-large', 'font-xlarge');
    if (prefs.fontSize === 'large')  htmlEl.classList.add('font-large');
    if (prefs.fontSize === 'xlarge') htmlEl.classList.add('font-xlarge');

    // Demais classes ficam no <body> (correto)

    // Alto contraste
    body.classList.toggle('high-contrast', prefs.highContrast);

    // Dislexia
    body.classList.toggle('dyslexia-font',    prefs.dyslexiaFont);
    body.classList.toggle('dyslexia-spacing', prefs.dyslexiaSpacing);
    body.classList.toggle('line-highlight',   prefs.lineHighlight);

    // Redução de movimento
    body.classList.toggle('reduce-motion', prefs.reduceMotion);

    // Baixa estimulação (autismo)
    body.classList.toggle('low-stimulation', prefs.lowStimulation);

    // Foco TDAH
    body.classList.toggle('tdah-focus-mode', prefs.tdahFocus);

    // Atualizar indicador de perfil
    _updateProfileIndicator();

    // Atualizar painel se existir
    _syncPanel();
  }

  // ─── Barra de acessibilidade ──────────────────────────────────────────────
  function _buildA11yBar() {
    const bar = document.getElementById('a11y-bar');
    if (!bar) return;

    bar.innerHTML = `
      <span class="a11y-bar-label" aria-label="Ferramentas de Acessibilidade">
        <i class="fas fa-universal-access" aria-hidden="true"></i>
      </span>

      <button class="a11y-btn ${prefs.highContrast ? 'active' : ''}" id="btn-contrast"
        aria-pressed="${prefs.highContrast}" title="Alto Contraste (Alt+C)">
        <i class="fas fa-adjust" aria-hidden="true"></i>
        <span>Contraste</span>
      </button>

      <button class="a11y-btn" id="btn-font-down" aria-label="Diminuir fonte" title="Diminuir fonte">
        <i class="fas fa-font" aria-hidden="true" style="font-size:.7em"></i>
      </button>
      <button class="a11y-btn" id="btn-font-up" aria-label="Aumentar fonte" title="Aumentar fonte (Alt+F)">
        <i class="fas fa-font" aria-hidden="true"></i>
      </button>

      <span class="a11y-sep" aria-hidden="true"></span>

      <button class="a11y-btn ${prefs.dyslexiaFont ? 'active' : ''}" id="btn-dyslexia"
        aria-pressed="${prefs.dyslexiaFont}" title="Fonte para Dislexia">
        <i class="fas fa-spell-check" aria-hidden="true"></i>
        <span>Dislexia</span>
      </button>

      <button class="a11y-btn ${prefs.lineHighlight ? 'active' : ''}" id="btn-highlight"
        aria-pressed="${prefs.lineHighlight}" title="Realce de linhas">
        <i class="fas fa-highlighter" aria-hidden="true"></i>
        <span>Realce</span>
      </button>

      <button class="a11y-btn ${prefs.guidedReading ? 'active' : ''}" id="btn-guided"
        aria-pressed="${prefs.guidedReading}" title="Leitura Guiada">
        <i class="fas fa-book-reader" aria-hidden="true"></i>
        <span>Guiada</span>
      </button>

      <span class="a11y-sep" aria-hidden="true"></span>

      <button class="a11y-btn ${prefs.narration ? 'active' : ''}" id="btn-narration"
        aria-pressed="${prefs.narration}" title="Narração de Texto (Alt+N)">
        <i class="fas fa-volume-up" aria-hidden="true"></i>
        <span>Narrar</span>
      </button>

      <button class="a11y-btn ${prefs.voiceCommands ? 'active' : ''}" id="btn-voice"
        aria-pressed="${prefs.voiceCommands}" title="Comandos por Voz (Alt+V)">
        <i class="fas fa-microphone" aria-hidden="true"></i>
        <span>Voz</span>
      </button>

      <button class="a11y-btn ${prefs.reduceMotion ? 'active' : ''}" id="btn-motion"
        aria-pressed="${prefs.reduceMotion}" title="Reduzir Movimento">
        <i class="fas fa-eye-slash" aria-hidden="true"></i>
        <span>Quieto</span>
      </button>

      <span class="a11y-sep" aria-hidden="true"></span>

      <button class="a11y-btn" id="btn-a11y-panel" title="Painel de Acessibilidade Completo">
        <i class="fas fa-sliders-h" aria-hidden="true"></i>
        <span>Mais</span>
      </button>

      <div class="a11y-profile-indicator hidden" id="a11y-profile-indicator" aria-live="polite">
        <i class="fas fa-check-circle" aria-hidden="true"></i>
        <span id="a11y-profile-name"></span>
      </div>
    `;

    // Eventos
    document.getElementById('btn-contrast')?.addEventListener('click', () => toggle('highContrast'));
    document.getElementById('btn-font-up')?.addEventListener('click', () => increaseFontSize());
    document.getElementById('btn-font-down')?.addEventListener('click', () => decreaseFontSize());
    document.getElementById('btn-dyslexia')?.addEventListener('click', () => toggle('dyslexiaFont'));
    document.getElementById('btn-highlight')?.addEventListener('click', () => toggle('lineHighlight'));
    document.getElementById('btn-guided')?.addEventListener('click', () => toggleGuidedReading());
    document.getElementById('btn-narration')?.addEventListener('click', () => toggle('narration'));
    document.getElementById('btn-voice')?.addEventListener('click', () => toggleVoiceCommands());
    document.getElementById('btn-motion')?.addEventListener('click', () => toggle('reduceMotion'));
    document.getElementById('btn-a11y-panel')?.addEventListener('click', openPanel);

    _updateBarButtons();
  }

  function _updateBarButtons() {
    const map = {
      'btn-contrast':  prefs.highContrast,
      'btn-dyslexia':  prefs.dyslexiaFont,
      'btn-highlight': prefs.lineHighlight,
      'btn-guided':    prefs.guidedReading,
      'btn-narration': prefs.narration,
      'btn-voice':     prefs.voiceCommands,
      'btn-motion':    prefs.reduceMotion,
    };
    Object.entries(map).forEach(([id, state]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.toggle('active', !!state);
        btn.setAttribute('aria-pressed', !!state);
      }
    });
  }

  function _updateProfileIndicator() {
    const el = document.getElementById('a11y-profile-indicator');
    const nameEl = document.getElementById('a11y-profile-name');
    if (!el || !nameEl) return;

    const profileNames = {
      dislexia:    'Modo Dislexia',
      tdah:        'Modo TDAH',
      visual:      'Modo Visual',
      auditiva:    'Modo Auditivo',
      autismo:     'Modo Autismo',
      intelectual: 'Modo Simplificado',
    };
    const name = profileNames[prefs.special_needs];
    if (name) {
      el.classList.remove('hidden');
      nameEl.textContent = name;
    } else {
      el.classList.add('hidden');
    }
  }

  // ─── Painel expandido ─────────────────────────────────────────────────────
  function openPanel() {
    let panel = document.getElementById('a11y-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'a11y-panel';
      panel.className = 'a11y-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Painel de Acessibilidade');
      panel.innerHTML = _buildPanelHTML();
      document.body.appendChild(panel);
      _bindPanelEvents(panel);
    }
    panel.classList.toggle('open');
  }

  function _buildPanelHTML() {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
        <h4><i class="fas fa-universal-access" style="color:var(--accent);margin-right:.4rem"></i> Acessibilidade</h4>
        <button onclick="document.getElementById('a11y-panel').classList.remove('open')"
          style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.9rem;padding:.2rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="a11y-panel-section">
        <label>Perfil de Necessidades</label>
        <select class="form-select" id="panel-needs-select" style="font-size:.78rem;">
          <option value="none">Sem necessidade específica</option>
          <option value="dislexia">Dislexia</option>
          <option value="tdah">TDAH</option>
          <option value="visual">Deficiência Visual</option>
          <option value="auditiva">Deficiência Auditiva</option>
          <option value="autismo">Autismo</option>
          <option value="intelectual">Deficiência Intelectual</option>
          <option value="motora">Deficiência Motora</option>
        </select>
      </div>

      <div class="a11y-panel-section">
        <label>Visual</label>
        ${_switchRow('panel-contrast', 'Alto Contraste', prefs.highContrast)}
        ${_switchRow('panel-dyslexia', 'Fonte para Dislexia (OpenDyslexic)', prefs.dyslexiaFont)}
        ${_switchRow('panel-spacing', 'Espaçamento Ampliado', prefs.dyslexiaSpacing)}
        ${_switchRow('panel-highlight', 'Realce de Linhas', prefs.lineHighlight)}
        ${_switchRow('panel-motion', 'Reduzir Animações', prefs.reduceMotion)}
        ${_switchRow('panel-stimulation', 'Baixa Estimulação (Autismo)', prefs.lowStimulation)}
      </div>

      <div class="a11y-panel-section">
        <label>Tamanho de Fonte</label>
        <div style="display:flex;gap:.4rem;">
          <button class="btn btn-sm btn-secondary" onclick="A11y.setFontSize('normal')">Normal</button>
          <button class="btn btn-sm btn-secondary" onclick="A11y.setFontSize('large')">Grande</button>
          <button class="btn btn-sm btn-secondary" onclick="A11y.setFontSize('xlarge')">Extra</button>
        </div>
      </div>

      <div class="a11y-panel-section">
        <label>Leitura e Áudio</label>
        ${_switchRow('panel-narration', 'Narração de Texto', prefs.narration)}
        ${_switchRow('panel-guided', 'Leitura Guiada', prefs.guidedReading)}
        ${_switchRow('panel-voice', 'Comandos por Voz', prefs.voiceCommands)}
      </div>

      <div class="a11y-panel-section">
        <label>Conteúdo</label>
        ${_switchRow('panel-transcripts', 'Mostrar Transcrições', prefs.transcripts)}
        ${_switchRow('panel-libras', 'Mostrar Intérprete Libras', prefs.libras)}
        ${_switchRow('panel-simplified', 'Texto Simplificado', prefs.simplifiedText)}
        ${_switchRow('panel-stepbystep', 'Modo Passo a Passo', prefs.stepByStep)}
      </div>

      <div class="a11y-panel-section">
        <label>TDAH</label>
        ${_switchRow('panel-tdahfocus', 'Modo Foco (menos distrações)', prefs.tdahFocus)}
        ${_switchRow('panel-pomodoro', 'Timer Pomodoro', prefs.pomodoro)}
      </div>

      <button class="btn btn-primary btn-full" id="panel-save-btn" style="margin-top:.5rem;">
        <i class="fas fa-save"></i> Salvar Preferências
      </button>

      <button class="btn btn-secondary btn-full" onclick="A11y.resetPrefs()" style="margin-top:.4rem;">
        <i class="fas fa-undo"></i> Redefinir Tudo
      </button>
    `;
  }

  function _switchRow(id, label, checked) {
    return `
      <div class="a11y-switch-row">
        <span>${label}</span>
        <label class="a11y-switch" aria-label="${label}">
          <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
          <span class="a11y-switch-slider"></span>
        </label>
      </div>`;
  }

  function _bindPanelEvents(panel) {
    const map = {
      'panel-contrast':     'highContrast',
      'panel-dyslexia':     'dyslexiaFont',
      'panel-spacing':      'dyslexiaSpacing',
      'panel-highlight':    'lineHighlight',
      'panel-motion':       'reduceMotion',
      'panel-stimulation':  'lowStimulation',
      'panel-narration':    'narration',
      'panel-guided':       'guidedReading',
      'panel-voice':        'voiceCommands',
      'panel-transcripts':  'transcripts',
      'panel-libras':       'libras',
      'panel-simplified':   'simplifiedText',
      'panel-stepbystep':   'stepByStep',
      'panel-tdahfocus':    'tdahFocus',
      'panel-pomodoro':     'pomodoro',
    };

    Object.entries(map).forEach(([id, key]) => {
      panel.querySelector(`#${id}`)?.addEventListener('change', e => {
        prefs[key] = e.target.checked;
        _applyAll();
      });
    });

    panel.querySelector('#panel-needs-select')?.addEventListener('change', e => {
      autoApplyProfile(e.target.value);
    });

    // Setar valor atual
    const needsSel = panel.querySelector('#panel-needs-select');
    if (needsSel) needsSel.value = prefs.special_needs || 'none';

    panel.querySelector('#panel-save-btn')?.addEventListener('click', () => {
      _savePrefs();
      UI?.toast('Preferências salvas!', 'success');
      panel.classList.remove('open');
    });
  }

  function _syncPanel() {
    const panel = document.getElementById('a11y-panel');
    if (!panel || !panel.classList.contains('open')) return;
    panel.innerHTML = _buildPanelHTML();
    _bindPanelEvents(panel);
  }

  // ─── Perfis automáticos de necessidades especiais ─────────────────────────
  function autoApplyProfile(need) {
    // Reset
    prefs.dyslexiaFont    = false;
    prefs.dyslexiaSpacing = false;
    prefs.lineHighlight   = false;
    prefs.guidedReading   = false;
    prefs.narration       = false;
    prefs.voiceCommands   = false;
    prefs.transcripts     = false;
    prefs.libras          = false;
    prefs.lowStimulation  = false;
    prefs.routineVisual   = false;
    prefs.stepByStep      = false;
    prefs.simplifiedText  = false;
    prefs.tdahFocus       = false;
    prefs.pomodoro        = false;
    prefs.reduceMotion    = false;
    prefs.special_needs   = need;

    switch (need) {
      case 'dislexia':
        prefs.dyslexiaFont    = true;
        prefs.dyslexiaSpacing = true;
        prefs.lineHighlight   = true;
        prefs.guidedReading   = true;
        prefs.fontSize        = prefs.fontSize === 'normal' ? 'large' : prefs.fontSize;
        break;

      case 'tdah':
        prefs.tdahFocus  = true;
        prefs.pomodoro   = true;
        prefs.reduceMotion = false;
        break;

      case 'visual':
        prefs.highContrast  = true;
        prefs.narration     = true;
        prefs.voiceCommands = true;
        prefs.fontSize      = 'xlarge';
        break;

      case 'auditiva':
        prefs.transcripts = true;
        prefs.libras      = true;
        break;

      case 'autismo':
        prefs.lowStimulation = true;
        prefs.reduceMotion   = true;
        prefs.routineVisual  = true;
        break;

      case 'intelectual':
        prefs.stepByStep     = true;
        prefs.simplifiedText = true;
        prefs.fontSize       = 'large';
        break;
    }

    _applyAll();
    _savePrefs();
    _notifyProfileApplied(need);
  }

  function _notifyProfileApplied(need) {
    const names = {
      dislexia:    'Dislexia ativado',
      tdah:        'TDAH ativado',
      visual:      'Def. Visual ativado',
      auditiva:    'Def. Auditiva ativado',
      autismo:     'Autismo ativado',
      intelectual: 'Def. Intelectual ativado',
    };
    if (names[need]) {
      window.UI?.toast(`Perfil: ${names[need]}`, 'info');
    }
  }

  // ─── Toggles individuais ──────────────────────────────────────────────────
  function toggle(key) {
    prefs[key] = !prefs[key];
    _applyAll();
    _savePrefs();
    _updateBarButtons();

    // Efeitos colaterais
    if (key === 'narration' && !prefs.narration) stopNarration();
    if (key === 'voiceCommands') {
      prefs.voiceCommands ? startVoiceRecognition() : stopVoiceRecognition();
    }
    if (key === 'guidedReading') {
      prefs.guidedReading ? startGuidedReading() : stopGuidedReading();
    }
    if (key === 'pomodoro') {
      prefs.pomodoro ? startPomodoro() : stopPomodoro();
    }
  }

  function setFontSize(size) {
    prefs.fontSize = size;
    _applyAll();
    _savePrefs();
  }

  function increaseFontSize() {
    const sizes = ['normal', 'large', 'xlarge'];
    const idx = sizes.indexOf(prefs.fontSize);
    if (idx < sizes.length - 1) setFontSize(sizes[idx + 1]);
  }

  function decreaseFontSize() {
    const sizes = ['normal', 'large', 'xlarge'];
    const idx = sizes.indexOf(prefs.fontSize);
    if (idx > 0) setFontSize(sizes[idx - 1]);
  }

  function resetPrefs() {
    localStorage.removeItem('edu_a11y');
    Object.assign(prefs, {
      highContrast: false, fontSize: 'normal', dyslexiaFont: false,
      dyslexiaSpacing: false, lineHighlight: false, guidedReading: false,
      reduceMotion: false, screenReader: false, voiceCommands: false,
      narration: false, transcripts: false, libras: false,
      lowStimulation: false, routineVisual: false, stepByStep: false,
      simplifiedText: false, tdahFocus: false, pomodoro: false, special_needs: 'none',
    });
    _applyAll();
    _updateBarButtons();
    stopNarration();
    stopVoiceRecognition();
    stopPomodoro();
    UI?.toast('Preferências redefinidas.', 'info');
  }

  // ─── Leitura Guiada ───────────────────────────────────────────────────────

  // Referência estável ao handler — necessário para removeEventListener funcionar
  // (função anônima cria nova referência a cada chamada → remove não desvincula)
  let _guidedClickHandler = null;
  let _guidedKeyHandler   = null;

  function startGuidedReading() {
    // Limpar estado anterior completamente antes de re-iniciar
    stopGuidedReading();

    const content = document.getElementById('reader-content');
    if (!content) return;

    // Coletar todos os <p> com texto real
    guidedReadingParagraphs = Array.from(content.querySelectorAll('p'))
      .filter(p => p.textContent.trim().length > 0);

    if (!guidedReadingParagraphs.length) return;

    guidedReadingIndex = 0;
    _highlightGuidedParagraph();

    // Handler de clique com referência estável (armazenada para remoção posterior)
    _guidedClickHandler = (e) => {
      const p = e.target.closest('p');
      if (!p) return;
      const idx = guidedReadingParagraphs.indexOf(p);
      if (idx >= 0) {
        guidedReadingIndex = idx;
        _highlightGuidedParagraph();
        // Narra o parágrafo clicado (speak já verifica guidedReading)
        speak(p.textContent);
      }
    };

    // Handler de teclado: setas ← → para avançar/recuar
    _guidedKeyHandler = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextGuidedParagraph(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevGuidedParagraph(); }
    };

    content.addEventListener('click', _guidedClickHandler);
    content.setAttribute('tabindex', '0');
    content.focus({ preventScroll: true });
    document.addEventListener('keydown', _guidedKeyHandler);

    // Narrar instrução + primeiro parágrafo
    speak('Leitura guiada ativada. Use as setas ou clique para avançar. ' +
          guidedReadingParagraphs[0].textContent);
  }

  function _highlightGuidedParagraph() {
    guidedReadingParagraphs.forEach((p, i) => {
      const isActive = i === guidedReadingIndex;
      p.classList.toggle('reading-active', isActive);
      // Dimming inline: ativos ficam totalmente visíveis, não-ativos em 45%
      // Não setar transition inline — já definida no CSS (.reader-content p)
      p.style.opacity = isActive ? '' : '0.45'; // '' remove o inline → CSS assume
    });
    guidedReadingParagraphs[guidedReadingIndex]
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function stopGuidedReading() {
    // Remover destaques de todos os parágrafos conhecidos
    guidedReadingParagraphs.forEach(p => {
      p.classList.remove('reading-active');
      p.style.opacity = '';
      p.style.transition = '';
    });
    guidedReadingParagraphs = [];
    guidedReadingIndex = 0;

    // Remover handlers com a referência correta
    const content = document.getElementById('reader-content');
    if (content && _guidedClickHandler) {
      content.removeEventListener('click', _guidedClickHandler);
    }
    if (_guidedKeyHandler) {
      document.removeEventListener('keydown', _guidedKeyHandler);
    }
    _guidedClickHandler = null;
    _guidedKeyHandler   = null;

    stopNarration();
  }

  function nextGuidedParagraph() {
    if (!guidedReadingParagraphs.length) return;
    if (guidedReadingIndex < guidedReadingParagraphs.length - 1) {
      guidedReadingIndex++;
      _highlightGuidedParagraph();
      speak(guidedReadingParagraphs[guidedReadingIndex].textContent);
    } else {
      speak('Fim do material. Leitura concluída.');
    }
  }

  function prevGuidedParagraph() {
    if (!guidedReadingParagraphs.length) return;
    if (guidedReadingIndex > 0) {
      guidedReadingIndex--;
      _highlightGuidedParagraph();
      speak(guidedReadingParagraphs[guidedReadingIndex].textContent);
    }
  }

  // ─── Text-to-Speech ───────────────────────────────────────────────────────

  // Cache de voz PT — resolvido uma vez e reutilizado
  let _ptVoice = null;
  let _voicesLoaded = false;

  function _loadVoices() {
    if (_voicesLoaded) return;
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
      // Preferência: pt-BR > pt > qualquer pt
      _ptVoice = voices.find(v => v.lang === 'pt-BR')
              || voices.find(v => v.lang.startsWith('pt'))
              || null;
      _voicesLoaded = true;
    }
  }

  // Garante que as vozes sejam carregadas (onvoiceschanged dispara depois do load)
  if (window.speechSynthesis) {
    speechSynthesis.addEventListener('voiceschanged', () => {
      _voicesLoaded = false; // forçar reload
      _loadVoices();
    });
  }

  /**
   * speak(text) — ativa TTS se narration OR guidedReading estiver ligado.
   * guidedReading usa narração para anunciar o parágrafo ativo sem precisar
   * que o usuário ligue a narração global separadamente.
   */
  function speak(text, lang = 'pt-BR') {
    const canSpeak = prefs.narration || prefs.guidedReading || window._forceTTS;
    if (!canSpeak) return;
    if (!window.speechSynthesis) return;
    if (!text || !text.trim()) return;
    stopNarration();

    narrationUtterance = new SpeechSynthesisUtterance(text.trim());
    narrationUtterance.lang = lang;
    narrationUtterance.rate = 0.9;
    narrationUtterance.pitch = 1.0;

    // Voz PT: tenta carregar do cache; se ainda não disponível, dispara assim mesmo
    _loadVoices();
    if (_ptVoice) narrationUtterance.voice = _ptVoice;

    speechSynthesis.speak(narrationUtterance);
  }

  function stopNarration() {
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function readPage() {
    // Lê apenas o conteúdo do material (reader-content); se não estiver
    // aberto, lê o page-body excluindo elementos de UI (botões, nav, header).
    const readerContent = document.getElementById('reader-content');
    if (readerContent) {
      speak(readerContent.textContent.trim());
      return;
    }
    // Fallback: página genérica — coletar apenas texto de parágrafos/headings
    const pageBody = document.getElementById('page-content');
    if (pageBody) {
      const textNodes = Array.from(pageBody.querySelectorAll('p, h1, h2, h3, li'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0)
        .join('. ');
      if (textNodes) speak(textNodes);
    }
  }

  // ─── Comandos por Voz ─────────────────────────────────────────────────────
  function _buildVoiceBar() {
    const existing = document.getElementById('voice-bar');
    if (existing) return;

    const bar = document.createElement('div');
    bar.id = 'voice-bar';
    bar.className = 'voice-bar hidden';
    bar.innerHTML = `
      <div class="voice-transcript-box" id="voice-transcript"></div>
      <button class="voice-btn" id="voice-mic-btn"
        aria-label="Ativar reconhecimento de voz"
        title="Comandos por voz">
        <i class="fas fa-microphone"></i>
      </button>
    `;
    document.body.appendChild(bar);

    document.getElementById('voice-mic-btn')?.addEventListener('click', toggleVoiceCommands);
  }

  function toggleVoiceCommands() {
    if (prefs.voiceCommands) {
      prefs.voiceCommands = false;
      stopVoiceRecognition();
    } else {
      prefs.voiceCommands = true;
      startVoiceRecognition();
    }
    _applyAll();
    _savePrefs();
    _updateBarButtons();
  }

  function startVoiceRecognition() {
    const voiceBar = document.getElementById('voice-bar');
    if (voiceBar) voiceBar.classList.remove('hidden');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      UI?.toast('Reconhecimento de voz não disponível neste navegador.', 'warning');
      return;
    }

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.lang = 'pt-BR';
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;

    const micBtn = document.getElementById('voice-mic-btn');
    if (micBtn) micBtn.classList.add('listening');

    voiceRecognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript).join('');
      const box = document.getElementById('voice-transcript');
      if (box) {
        box.textContent = transcript;
        box.classList.add('visible');
      }
      if (event.results[event.results.length - 1].isFinal) {
        _processVoiceCommand(transcript.toLowerCase().trim());
      }
    };

    voiceRecognition.onend = () => {
      if (prefs.voiceCommands) voiceRecognition.start(); // restart
    };

    voiceRecognition.start();
    UI?.toast('Reconhecimento de voz ativado. Diga um comando!', 'info');
    speak('Reconhecimento de voz ativado. Aguardando comando.');
  }

  function stopVoiceRecognition() {
    if (voiceRecognition) { voiceRecognition.stop(); voiceRecognition = null; }
    const micBtn = document.getElementById('voice-mic-btn');
    if (micBtn) micBtn.classList.remove('listening');
    const voiceBar = document.getElementById('voice-bar');
    if (voiceBar) voiceBar.classList.add('hidden');
    const box = document.getElementById('voice-transcript');
    if (box) { box.textContent = ''; box.classList.remove('visible'); }
  }

  function _processVoiceCommand(cmd) {
    const commands = {
      'ler':            () => readPage(),
      'ler página':     () => readPage(),
      'parar':          () => stopNarration(),
      'parar leitura':  () => stopNarration(),
      'próximo':        () => nextGuidedParagraph(),
      'anterior':       () => prevGuidedParagraph(),
      'aumentar fonte': () => increaseFontSize(),
      'diminuir fonte': () => decreaseFontSize(),
      'alto contraste': () => toggle('highContrast'),
      'início':         () => window.App?.navigate?.('home'),
      'materiais':      () => window.App?.navigate?.('materials'),
      'perfil':         () => window.App?.navigate?.('profile'),
      'sair':           () => window.App?.logout?.(),
    };

    for (const [trigger, action] of Object.entries(commands)) {
      if (cmd.includes(trigger)) { action(); break; }
    }
  }

  // ─── Timer Pomodoro (TDAH) ────────────────────────────────────────────────
  function startPomodoro() {
    _createPomodoroWidget();
    if (!pomodoroRunning) _runPomodoro();
  }

  function stopPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    document.getElementById('pomodoro-widget')?.remove();
  }

  function _createPomodoroWidget() {
    if (document.getElementById('pomodoro-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'pomodoro-widget';
    widget.style.cssText = `
      position: fixed; bottom: 1.5rem; left: 1.5rem;
      z-index: 500; width: 200px;
    `;
    widget.innerHTML = `
      <div class="pomodoro-widget">
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem;">
          <i class="fas fa-clock" style="color:var(--accent)"></i> Foco Pomodoro
        </div>
        <div class="pomodoro-ring">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle class="pomodoro-ring-bg" cx="50" cy="50" r="42"/>
            <circle class="pomodoro-ring-fg" id="pomo-ring-fg" cx="50" cy="50" r="42"
              stroke-dasharray="263.9" stroke-dashoffset="0"/>
          </svg>
          <div class="pomodoro-ring-text" id="pomo-display">25:00</div>
        </div>
        <div id="pomo-label" class="pomodoro-label" aria-live="polite">Hora de estudar! 📚</div>
        <div class="pomodoro-controls">
          <button class="btn btn-sm btn-secondary" id="pomo-toggle" aria-label="Iniciar/Pausar timer">
            <i class="fas fa-play"></i>
          </button>
          <button class="btn btn-sm btn-secondary" id="pomo-reset" aria-label="Reiniciar timer">
            <i class="fas fa-redo"></i>
          </button>
          <button class="btn btn-sm btn-secondary" id="pomo-close" aria-label="Fechar Pomodoro">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('pomo-toggle')?.addEventListener('click', () => {
      if (pomodoroRunning) { clearInterval(pomodoroInterval); pomodoroRunning = false; }
      else _runPomodoro();
      const icon = document.querySelector('#pomo-toggle i');
      if (icon) icon.className = pomodoroRunning ? 'fas fa-pause' : 'fas fa-play';
    });

    document.getElementById('pomo-reset')?.addEventListener('click', () => {
      clearInterval(pomodoroInterval);
      pomodoroRunning = false;
      pomodoroSeconds = 25 * 60;
      pomodoroIsBreak = false;
      _updatePomodoroDisplay();
    });

    document.getElementById('pomo-close')?.addEventListener('click', () => {
      prefs.pomodoro = false;
      stopPomodoro();
    });
  }

  function _runPomodoro() {
    pomodoroRunning = true;
    pomodoroInterval = setInterval(() => {
      pomodoroSeconds--;
      _updatePomodoroDisplay();

      if (pomodoroSeconds <= 0) {
        pomodoroIsBreak = !pomodoroIsBreak;
        pomodoroSeconds = pomodoroIsBreak ? 5 * 60 : 25 * 60;
        const msg = pomodoroIsBreak
          ? '⏸️ Pausa! Descanse 5 minutos.'
          : '▶️ Hora de estudar! Próximo bloco.';
        speak(msg);
        UI?.toast(msg, pomodoroIsBreak ? 'success' : 'info');
        _updatePomodoroLabel();
      }
    }, 1000);
  }

  function _updatePomodoroDisplay() {
    const m = Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0');
    const s = (pomodoroSeconds % 60).toString().padStart(2, '0');
    const display = document.getElementById('pomo-display');
    if (display) display.textContent = `${m}:${s}`;

    const total = pomodoroIsBreak ? 5 * 60 : 25 * 60;
    const progress = pomodoroSeconds / total;
    const circumference = 263.9;
    const offset = circumference * (1 - progress);
    const ring = document.getElementById('pomo-ring-fg');
    if (ring) ring.setAttribute('stroke-dashoffset', offset.toString());
    if (ring) ring.style.stroke = pomodoroIsBreak ? 'var(--green)' : 'var(--accent)';
  }

  function _updatePomodoroLabel() {
    const label = document.getElementById('pomo-label');
    if (label) {
      label.textContent = pomodoroIsBreak
        ? 'Pausa - relaxe! ☕'
        : 'Hora de estudar! 📚';
    }
  }

  // ─── Rotina Visual (Autismo) ──────────────────────────────────────────────
  function renderRoutineSteps(container, steps) {
    if (!prefs.routineVisual && !prefs.stepByStep) return;
    container.innerHTML = `
      <div class="routine-steps" role="list">
        ${steps.map((s, i) => `
          <div class="routine-step ${i === 0 ? 'active' : ''}" role="listitem"
            data-step="${i}" aria-current="${i === 0 ? 'step' : 'false'}">
            <div class="step-num" aria-hidden="true">${i + 1}</div>
            <span class="step-name">${s.icon ? s.icon + ' ' : ''}${s.name}</span>
            ${s.done ? '<i class="fas fa-check-circle" style="color:var(--green)" aria-label="Concluído"></i>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function advanceRoutineStep(container) {
    const steps = container.querySelectorAll('.routine-step');
    let current = -1;
    steps.forEach((s, i) => { if (s.classList.contains('active')) current = i; });
    if (current >= 0) steps[current].classList.replace('active', 'done');
    if (current + 1 < steps.length) {
      steps[current + 1].classList.add('active');
      steps[current + 1].setAttribute('aria-current', 'step');
    }
  }

  // ─── Modo Passo a Passo (Def. Intelectual) ────────────────────────────────
  function renderStepByStep(container, steps) {
    container.innerHTML = `
      <div class="step-by-step" role="list">
        ${steps.map((s, i) => `
          <div class="step-card ${i === 0 ? 'active' : ''}" role="listitem"
            data-index="${i}" aria-current="${i === 0 ? 'step' : 'false'}">
            <div class="step-number" aria-hidden="true">${i + 1}</div>
            <div class="step-content">
              ${s.visual ? `<div class="step-visual" aria-hidden="true">${s.visual}</div>` : ''}
              <div class="step-title">${s.title}</div>
              <div class="step-desc">${s.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── Atalhos de teclado ───────────────────────────────────────────────────
  function _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey) {
        switch (e.key) {
          case 'c': case 'C': e.preventDefault(); toggle('highContrast'); break;
          case 'f': case 'F': e.preventDefault(); increaseFontSize(); break;
          case 'n': case 'N': e.preventDefault(); toggle('narration'); if (prefs.narration) readPage(); break;
          case 'v': case 'V': e.preventDefault(); toggleVoiceCommands(); break;
          case 'd': case 'D': e.preventDefault(); toggle('dyslexiaFont'); break;
          case 'ArrowRight':  e.preventDefault(); nextGuidedParagraph(); break;
          case 'ArrowLeft':   e.preventDefault(); prevGuidedParagraph(); break;
        }
      }
    });
  }

  // ─── API pública ──────────────────────────────────────────────────────────
  return {
    init,
    toggle,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetPrefs,
    autoApplyProfile,
    openPanel,
    speak,
    stopNarration,
    readPage,
    startVoiceRecognition,
    stopVoiceRecognition,
    toggleVoiceCommands,
    startPomodoro,
    stopPomodoro,
    startGuidedReading,
    stopGuidedReading,
    nextGuidedParagraph,
    prevGuidedParagraph,
    renderRoutineSteps,
    advanceRoutineStep,
    renderStepByStep,
    getPrefs() { return { ...prefs }; },
    hasFeature(key) { return !!prefs[key]; },
    getSpecialNeeds() { return prefs.special_needs; },
  };
})();

window.A11y = A11y;
