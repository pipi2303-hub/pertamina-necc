/* ============================================================
   Auth Module — Pertamina NECC
   ============================================================ */

window.Auth = (() => {
  const USERS = [
    { username: 'admin',     password: 'admin123',  role: 'Administrator',      name: 'Andiko Ilman',  initial: 'A', color: '#e8001e' },
    { username: 'operator',  password: 'ops2026',   role: 'Operations Manager', name: 'Budi Santoso',  initial: 'B', color: '#f5a623' },
    { username: 'inspector', password: 'insp2026',  role: 'Field Inspector',    name: 'Citra Dewi',    initial: 'C', color: '#00d4a0' },
  ];

  const KEY = 'pcc_user';

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function login(username, password) {
    const u = USERS.find(x => x.username === username && x.password === password);
    if (!u) return null;
    const session = { username: u.username, role: u.role, name: u.name, initial: u.initial, color: u.color, loginTime: new Date().toISOString() };
    sessionStorage.setItem(KEY, JSON.stringify(session));
    return session;
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    location.reload();
  }

  function isLoggedIn() { return !!getSession(); }

  /* ── Render user chip in navbar ── */
  function renderUserChip(session) {
    const navRight = document.querySelector('.navbar-right');
    if (!navRight || document.getElementById('user-chip')) return;
    const chip = document.createElement('div');
    chip.id = 'user-chip';
    chip.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 10px 4px 4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;margin-right:4px;';
    chip.innerHTML = `
      <div style="width:28px;height:28px;border-radius:50%;background:${session.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;box-shadow:0 0 10px ${session.color}60;">${session.initial}</div>
      <div style="display:flex;flex-direction:column;line-height:1.25;">
        <span style="font-size:11px;font-weight:600;color:#eef2ff;">${session.name}</span>
        <span style="font-size:9px;color:${session.color};font-weight:500;">${session.role}</span>
      </div>
      <button id="logout-btn" title="Logout" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.35);padding:2px 2px 2px 6px;display:flex;align-items:center;transition:color 0.2s;margin-left:2px;"
        onmouseenter="this.style.color='rgba(255,255,255,0.8)'"
        onmouseleave="this.style.color='rgba(255,255,255,0.35)'">
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M6 2H2v12h4M11 11l3-3-3-3M14 8H6"/>
        </svg>
      </button>`;
    navRight.insertBefore(chip, navRight.firstChild);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
  }

  /* ── Hide / show overlay ── */
  function hideOverlay() {
    const ov = document.getElementById('login-overlay');
    if (!ov) return;
    ov.classList.add('fade-out');
    setTimeout(() => { ov.style.display = 'none'; }, 500);
  }

  /* ── Build left-panel SVG ── */
  function buildBgSvg() {
    const nodes = [
      { x: 90,  y: 110, r: 3.5, c: '#1a7fe8' },
      { x: 180, y: 180, r: 5,   c: '#00ffdd' },
      { x: 320, y: 140, r: 4,   c: '#1a7fe8' },
      { x: 460, y: 200, r: 5,   c: '#00c8ff' },
      { x: 590, y: 155, r: 3.5, c: '#00d4a0' },
      { x: 700, y: 230, r: 3,   c: '#1a7fe8' },
      { x: 260, y: 300, r: 5,   c: '#f5a623' },
      { x: 410, y: 340, r: 4,   c: '#a855f7' },
      { x: 560, y: 370, r: 4,   c: '#00c8ff' },
      { x: 75,  y: 390, r: 3,   c: '#1a7fe8' },
      { x: 110, y: 490, r: 3,   c: '#00d4a0' },
      { x: 680, y: 420, r: 3,   c: '#00ffdd' },
      { x: 350, y: 450, r: 3.5, c: '#1a7fe8' },
      { x: 750, y: 130, r: 3,   c: '#f5a623' },
    ];
    const pipes = [
      { x1: 90,  y1: 110, x2: 180, y2: 180, c: '#1a7fe8', d: '10,7', spd: '1.8s' },
      { x1: 180, y1: 180, x2: 320, y2: 140, c: '#00ffdd', d: '10,7', spd: '2.4s' },
      { x1: 320, y1: 140, x2: 460, y2: 200, c: '#1a7fe8', d: '10,7', spd: '2.0s' },
      { x1: 460, y1: 200, x2: 590, y2: 155, c: '#00d4a0', d: '8,6',  spd: '1.6s' },
      { x1: 590, y1: 155, x2: 700, y2: 230, c: '#1a7fe8', d: '8,6',  spd: '2.2s' },
      { x1: 590, y1: 155, x2: 750, y2: 130, c: '#f5a623', d: '6,5',  spd: '2.8s' },
      { x1: 180, y1: 180, x2: 260, y2: 300, c: '#f5a623', d: '8,6',  spd: '2.6s' },
      { x1: 260, y1: 300, x2: 410, y2: 340, c: '#f5a623', d: '8,6',  spd: '3.0s' },
      { x1: 410, y1: 340, x2: 560, y2: 370, c: '#00c8ff', d: '8,6',  spd: '2.2s' },
      { x1: 560, y1: 370, x2: 680, y2: 420, c: '#00ffdd', d: '8,6',  spd: '1.8s' },
      { x1: 75,  y1: 390, x2: 180, y2: 180, c: '#a855f7', d: '6,5',  spd: '3.4s' },
      { x1: 75,  y1: 390, x2: 110, y2: 490, c: '#00d4a0', d: '6,5',  spd: '2.8s' },
      { x1: 320, y1: 140, x2: 260, y2: 300, c: '#00c8ff', d: '6,5',  spd: '3.2s' },
      { x1: 460, y1: 200, x2: 410, y2: 340, c: '#1a7fe8', d: '6,5',  spd: '2.6s' },
      { x1: 260, y1: 300, x2: 350, y2: 450, c: '#00d4a0', d: '6,5',  spd: '3.0s' },
      { x1: 410, y1: 340, x2: 350, y2: 450, c: '#1a7fe8', d: '6,5',  spd: '2.4s' },
    ];

    const pipesSvg = pipes.map((p, i) => `
      <line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}"
        stroke="${p.c}" stroke-width="0.8" opacity="0.35"
        stroke-dasharray="${p.d}"
        style="animation: bg-pipe-flow ${p.spd} linear infinite; animation-delay:${(i * 0.18).toFixed(2)}s"/>
    `).join('');

    const nodesSvg = nodes.map((n, i) => `
      <circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${n.c}" opacity="0.7"
        style="filter:drop-shadow(0 0 5px ${n.c});animation:bg-node-pulse 3s ease-in-out infinite;animation-delay:${(i * 0.22).toFixed(2)}s"/>
    `).join('');

    return `<svg class="login-bg-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="lgrid" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M44 0L0 0 0 44" fill="none" stroke="#ffffff" stroke-width="0.4" opacity="0.04"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lgrid)"/>
      ${pipesSvg}
      ${nodesSvg}
    </svg>`;
  }

  /* ── Inject login overlay HTML ── */
  function buildOverlay() {
    const bgSvg = buildBgSvg();
    return `
    <div class="login-left">
      ${bgSvg}
      <div class="login-left-content">
        <div class="login-logo">
          <div class="login-logo-img-wrap">
            <img src="img/logo.png" alt="Pertamina"/>
          </div>
          <div class="login-logo-text">
            <div class="login-brand-name">PERTAMINA</div>
            <div class="login-brand-sub">Persero</div>
          </div>
        </div>

        <div>
          <h1 class="login-title">NATIONAL <span>ENERGY</span><br>COMMAND CENTER</h1>
          <p class="login-subtitle">Integrated Digital Operations Platform · v2.0</p>
        </div>

        <div class="login-divider"></div>

        <div class="login-stats">
          <div class="login-stat">
            <div class="login-stat-val">10</div>
            <div class="login-stat-label">Dashboards</div>
          </div>
          <div class="login-stat-sep"></div>
          <div class="login-stat">
            <div class="login-stat-val">LIVE</div>
            <div class="login-stat-label">Real-time</div>
          </div>
          <div class="login-stat-sep"></div>
          <div class="login-stat">
            <div class="login-stat-val">AI</div>
            <div class="login-stat-label">Analytics</div>
          </div>
          <div class="login-stat-sep"></div>
          <div class="login-stat">
            <div class="login-stat-val">24/7</div>
            <div class="login-stat-label">Monitoring</div>
          </div>
        </div>

        <div class="login-pipes">
          <div class="login-pipe-row">
            <span class="login-pipe-label">Upstream</span>
            <div class="login-pipe-track"><div class="login-pipe-fill" style="--c:#1a7fe8;width:78%;animation-duration:2.2s;"></div></div>
            <span class="login-pipe-val">2.45 MBOE</span>
          </div>
          <div class="login-pipe-row">
            <span class="login-pipe-label">Refinery</span>
            <div class="login-pipe-track"><div class="login-pipe-fill" style="--c:#00d4a0;width:94%;animation-duration:2.8s;"></div></div>
            <span class="login-pipe-val">94.2%</span>
          </div>
          <div class="login-pipe-row">
            <span class="login-pipe-label">Distribution</span>
            <div class="login-pipe-track"><div class="login-pipe-fill" style="--c:#f5a623;width:96%;animation-duration:1.9s;"></div></div>
            <span class="login-pipe-val">96%</span>
          </div>
        </div>

        <div class="login-version">PT Pertamina (Persero) · NECC Dashboard © 2026</div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-card" id="login-card">
        <div class="login-card-header">
          <h2 class="login-card-title">Selamat Datang</h2>
          <p class="login-card-sub">Masuk ke sistem NECC untuk melanjutkan</p>
        </div>

        <form id="login-form" autocomplete="off">
          <div class="login-field">
            <label class="login-label">Username</label>
            <div class="login-input-wrap">
              <span class="login-input-icon">
                <svg viewBox="0 0 16 16" width="15" fill="currentColor"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="currentColor"/></svg>
              </span>
              <input type="text" id="login-username" class="login-input" placeholder="Masukkan username" autocomplete="off" spellcheck="false" required/>
            </div>
          </div>

          <div class="login-field">
            <label class="login-label">Password</label>
            <div class="login-input-wrap">
              <span class="login-input-icon">
                <svg viewBox="0 0 16 16" width="15" fill="currentColor"><rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
              </span>
              <input type="password" id="login-password" class="login-input" placeholder="Masukkan password" autocomplete="off" required/>
              <button type="button" id="pw-toggle" class="login-pw-toggle" title="Tampilkan/sembunyikan password">
                <svg viewBox="0 0 16 16" width="15" fill="currentColor"><path d="M8 3C4 3 1 8 1 8s3 5 7 5 7-5 7-5-3-5-7-5zm0 8a3 3 0 110-6 3 3 0 010 6z"/></svg>
              </button>
            </div>
          </div>

          <div id="login-error" class="login-error" style="display:none;">
            ⚠ Username atau password tidak valid
          </div>

          <button type="submit" id="login-btn" class="login-btn">
            <span id="login-btn-text">MASUK</span>
            <svg viewBox="0 0 16 16" width="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </button>
        </form>

      </div>
    </div>`;
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    const ov = document.getElementById('login-overlay');
    if (!ov) return;

    const session = getSession();

    if (session) {
      ov.style.display = 'none';
      renderUserChip(session);
      return;
    }

    // Build overlay content
    ov.innerHTML = buildOverlay();

    // Form submit
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const btn      = document.getElementById('login-btn');
      const btnText  = document.getElementById('login-btn-text');
      const err      = document.getElementById('login-error');
      const card     = document.getElementById('login-card');

      btn.disabled = true;
      btnText.textContent = 'Mengautentikasi...';
      err.style.display = 'none';

      setTimeout(() => {
        const sess = login(username, password);
        if (sess) {
          btnText.textContent = '✓ Berhasil';
          hideOverlay();
          renderUserChip(sess);
        } else {
          err.style.display = 'block';
          btn.disabled = false;
          btnText.textContent = 'MASUK';
          card.classList.remove('shake');
          void card.offsetWidth; // reflow to restart animation
          card.classList.add('shake');
          setTimeout(() => card.classList.remove('shake'), 500);
        }
      }, 600);
    });

    // Password show/hide toggle
    document.getElementById('pw-toggle').addEventListener('click', () => {
      const pw = document.getElementById('login-password');
      const tog = document.getElementById('pw-toggle');
      pw.type = pw.type === 'password' ? 'text' : 'password';
      tog.innerHTML = pw.type === 'password'
        ? `<svg viewBox="0 0 16 16" width="15" fill="currentColor"><path d="M8 3C4 3 1 8 1 8s3 5 7 5 7-5 7-5-3-5-7-5zm0 8a3 3 0 110-6 3 3 0 010 6z"/></svg>`
        : `<svg viewBox="0 0 16 16" width="15" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2l12 12M6.5 6.6A3 3 0 0111 10M4 4.5C2.5 5.7 1.5 7.2 1 8c1.5 2.8 4.2 5 7 5a7 7 0 003.5-.9"/></svg>`;
    });

    // Click demo credentials to auto-fill
    document.querySelectorAll('.login-cred-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('login-username').value = item.dataset.u;
        document.getElementById('login-password').value = item.dataset.p;
        document.getElementById('login-username').focus();
      });
    });
  });

  return { login, logout, isLoggedIn, getSession };
})();
