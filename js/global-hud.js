/* ============================================================
   Global HUD — Notification Bell & Alert Feed
   Persistent layer, initialized once on DOMContentLoaded.
   ============================================================ */

window.GlobalHUD = (() => {
  let unread = 0;
  let alerts = [];
  let nextTimer = null;

  /* ── DOMAIN META ───────────────────────────────────────────── */
  const DOMAINS = {
    upstream:     { label:'Upstream',     color:'#1a7fe8' },
    refinery:     { label:'Refinery',     color:'#f5a623' },
    storage:      { label:'Storage',      color:'#00c8ff' },
    logistics:    { label:'Logistics',    color:'#00d4a0' },
    distribution: { label:'Distribution', color:'#a855f7' },
    spklu:        { label:'SPKLU',        color:'#00d4a0' },
    hse:          { label:'HSE',          color:'#ff4055' },
    ai:           { label:'AI Analytics', color:'#00c8ff' },
    financial:    { label:'Financial',    color:'#f5a623' },
  };

  /* ── ALERT TEMPLATES ───────────────────────────────────────── */
  const POOL = [
    { domain:'hse',          sev:'critical', msg:'Kebakaran aktif RU IV Cilacap Unit CDU-3 — respons darurat dikerahkan' },
    { domain:'ai',           sev:'critical', msg:'AI mendeteksi anomali tekanan pipeline KM 124 Sulawesi (ΔP 30.2 bar)' },
    { domain:'distribution', sev:'critical', msg:'SPBU Jl. Sudirman Jakarta stok turun di bawah 15% — resupply segera' },
    { domain:'upstream',     sev:'warn',     msg:'Tekanan sumur WB-47 turun 3.2 bar di bawah threshold minimum' },
    { domain:'refinery',     sev:'warn',     msg:'Unit CDU-2 utilization 87% — di bawah target operasional 95%' },
    { domain:'storage',      sev:'warn',     msg:'Tanki T-05 Balongan mencapai 94% kapasitas — monitoring intensif' },
    { domain:'logistics',    sev:'warn',     msg:'MT Badak mengalami delay 45 menit — ETA direvisi ke 16:30 WIB' },
    { domain:'hse',          sev:'warn',     msg:'Near miss dilaporkan di Terminal Plaju — investigasi berlanjut' },
    { domain:'ai',           sev:'warn',     msg:'Fraud score SPBU Gatot Subroto Medan meningkat ke level KRITIS (91)' },
    { domain:'distribution', sev:'warn',     msg:'Anomali transaksi terdeteksi di 3 SPBU Medan — AI flagging aktif' },
    { domain:'spklu',        sev:'warn',     msg:'3 stasiun SPKLU Jakarta Barat offline — teknisi sedang dikerahkan' },
    { domain:'financial',    sev:'warn',     msg:'Op. Cost segmen Hilir 3.2% di atas budget — review diperlukan' },
    { domain:'upstream',     sev:'info',     msg:'Produksi WB-12 mencapai target harian 1,850 BOPD' },
    { domain:'refinery',     sev:'info',     msg:'Yield Pertalite meningkat 0.4% setelah optimasi recipe unit CDU-1' },
    { domain:'storage',      sev:'info',     msg:'Transfer T-12 → T-14 selesai: 4,200 kL MOGAS dipindahkan' },
    { domain:'logistics',    sev:'info',     msg:'Pengiriman Depot Surabaya selesai tepat waktu: 850 kL Solar' },
    { domain:'spklu',        sev:'info',     msg:'Utilisasi SPKLU peak hour mencapai 92% — rekap harian disiapkan' },
    { domain:'financial',    sev:'info',     msg:'Revenue hari ini IDR 2.8T — 7.7% di atas target harian IDR 2.6T' },
    { domain:'hse',          sev:'info',     msg:'Remediasi tumpahan Balongan progress 68% — on track selesai 5 Mei' },
    { domain:'ai',           sev:'info',     msg:'Model Demand Forecast update: akurasi 7-hari meningkat ke 94.2%' },
  ];

  /* ── UTILS ─────────────────────────────────────────────────── */
  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff <   60) return `${diff}d lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    return `${Math.floor(diff / 3600)}j lalu`;
  }

  function sevColor(s) {
    return { critical:'#ff4055', warn:'#f5a623', info:'#8095be' }[s] || '#8095be';
  }

  /* ── BADGE & DROPDOWN ──────────────────────────────────────── */
  function updateBadge() {
    const badge = document.getElementById('hud-badge');
    if (!badge) return;
    const count = alerts.filter(a => !a.read).length;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function renderList() {
    const list = document.getElementById('hud-alert-list');
    if (!list) return;
    if (!alerts.length) {
      list.innerHTML = '<div style="padding:20px 14px;text-align:center;color:var(--text3);font-size:11px;">Tidak ada notifikasi</div>';
      return;
    }
    list.innerHTML = alerts.slice(0, 15).map(a => {
      const dm = DOMAINS[a.domain] || { label: a.domain, color:'#8095be' };
      return `
      <div class="hud-item${!a.read?' hud-item-new':''}">
        <span class="hud-sev-dot" style="background:${sevColor(a.sev)};${a.sev==='critical'?'animation:hse-dot-pulse 1.5s infinite;':''}"></span>
        <div class="hud-item-body">
          <div class="hud-item-msg">${a.msg}</div>
          <div class="hud-item-meta">
            <span style="color:${dm.color};font-weight:600;">${dm.label}</span>
            &nbsp;·&nbsp;${timeAgo(a.ts)}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function openDropdown() {
    const dd = document.getElementById('hud-dropdown');
    if (!dd) return;
    dd.style.display = 'flex';
    alerts.forEach(a => a.read = true);
    unread = 0;
    updateBadge();
    renderList();
  }

  function closeDropdown() {
    const dd = document.getElementById('hud-dropdown');
    if (dd) dd.style.display = 'none';
  }

  function toggleDropdown(e) {
    e.stopPropagation();
    const dd = document.getElementById('hud-dropdown');
    if (!dd) return;
    dd.style.display === 'none' ? openDropdown() : closeDropdown();
  }

  /* ── ADD ALERT ─────────────────────────────────────────────── */
  function addAlert(template) {
    alerts.unshift({ ...template, id: Date.now() + Math.random(), ts: Date.now(), read: false });
    if (alerts.length > 60) alerts.pop();
    updateBadge();
    renderList();
  }

  /* ── AUTO ALERTS ───────────────────────────────────────────── */
  function scheduleNext() {
    const delay = 40000 + Math.random() * 50000; // 40–90 seconds
    nextTimer = setTimeout(() => {
      addAlert(POOL[Math.floor(Math.random() * POOL.length)]);
      scheduleNext();
    }, delay);
  }

  /* ── PUBLIC ACTIONS ────────────────────────────────────────── */
  function clearAll() {
    alerts = [];
    updateBadge();
    renderList();
  }

  /* ── INIT ──────────────────────────────────────────────────── */
  function init() {
    const navRight = document.querySelector('.navbar-right');
    if (!navRight) return;

    /* Bell button */
    const bell = document.createElement('div');
    bell.id = 'hud-bell';
    bell.className = 'hud-bell';
    bell.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span id="hud-badge" class="hud-badge" style="display:none;">0</span>
    `;
    bell.addEventListener('click', toggleDropdown);
    navRight.insertBefore(bell, navRight.firstChild);

    /* Dropdown panel */
    const dd = document.createElement('div');
    dd.id = 'hud-dropdown';
    dd.className = 'hud-dropdown';
    dd.style.display = 'none';
    dd.innerHTML = `
      <div class="hud-dd-header">
        <span class="hud-dd-title">
          <span class="card-title-dot" style="background:#ff4055;box-shadow:0 0 8px rgba(255,64,85,.5);animation:hse-dot-pulse 2s infinite;width:5px;height:5px;"></span>
          ALERT FEED
        </span>
        <div style="display:flex;gap:6px;">
          <button class="hud-action-btn" onclick="window.GlobalHUD.clearAll()">Hapus Semua</button>
          <button class="hud-action-btn" onclick="window.GlobalHUD.close()">✕</button>
        </div>
      </div>
      <div id="hud-alert-list" class="hud-alert-list"></div>
    `;
    document.body.appendChild(dd);

    /* Close on outside click */
    document.addEventListener('click', (e) => {
      const ddEl = document.getElementById('hud-dropdown');
      const bellEl = document.getElementById('hud-bell');
      if (ddEl && bellEl && !bellEl.contains(e.target) && !ddEl.contains(e.target)) {
        ddEl.style.display = 'none';
      }
    });

    /* Seed historical alerts (last ~25 mins) */
    const seedPool = [
      POOL[0], POOL[1], POOL[2], POOL[3],
      POOL[6], POOL[8], POOL[10], POOL[12],
      POOL[14], POOL[17],
    ];
    const now = Date.now();
    seedPool.forEach((t, i) => {
      alerts.push({ ...t, id: now - (seedPool.length - i) * 1000, ts: now - (seedPool.length - i) * 150000, read: false });
    });
    unread = alerts.length;
    updateBadge();
    renderList();

    scheduleNext();
  }

  return { init, clearAll, close: closeDropdown };
})();
