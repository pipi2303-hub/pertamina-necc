/* ============================================================
   PERTAMINA NECC — Dashboard 8: AI Analytics
   Sub-tabs: Leak Detection AI | Demand Forecast | Fraud Detection | Subsidi BBM
   ============================================================ */

window.DashAI = (() => {
  let charts = {};
  let maps   = {};
  let intervals = [];
  let currentTab   = 'leak';
  let selectedSpbu = 0;
  let fraudFilter  = 'semua';
  let subsidiFuel  = 'pertalite';

  /* ── Static Data ─────────────────────────────────────────── */
  const pipelineAlerts = [
    { id:1, name:'Pipeline Trans-Sulawesi',  loc:'KM 124 · Sulawesi Tengah', dp:'-30.2 bar', sev:'KRITIS', status:'AKTIF',          ai:97.3, risk:94, lat:-1.4,  lng:122.0 },
    { id:2, name:'Trans-Sumatra Selatan',    loc:'KM 210 · Lampung Utara',   dp:'-4.8 bar',  sev:'SEDANG', status:'INVESTIGASI',     ai:72.1, risk:45, lat:-4.8,  lng:105.2 },
    { id:3, name:'Trans-Sumatra Tengah',     loc:'KM 387 · Riau Daratan',    dp:'-1.3 bar',  sev:'RENDAH', status:'INVESTIGASI',     ai:48.6, risk:32, lat: 0.5,  lng:101.5 },
    { id:4, name:'Trans-Jawa Tengah',        loc:'KM 185 · Purwokerto',      dp:'-0.8 bar',  sev:'RENDAH', status:'FALSE POSITIVE',  ai:31.2, risk:28, lat:-7.4,  lng:109.2 },
    { id:5, name:'Trans-Jawa Timur',         loc:'KM 302 · Surabaya',        dp:'-0.5 bar',  sev:'RENDAH', status:'NORMAL',          ai:18.4, risk:22, lat:-7.3,  lng:112.7 },
  ];

  const pipelineRoutes = [
    { coords:[[-1.9,122.0],[-1.4,122.0],[-0.8,121.5],[0.5,121.0],[1.4,124.8]], color:'#ff4055' },
    { coords:[[-5.5,105.3],[-4.8,105.2],[-3.0,104.5],[-2.0,103.8],[-1.0,102.7]], color:'#f5a623' },
    { coords:[[-2.0,103.8],[-0.5,102.0],[0.5,101.5],[1.5,100.3],[2.5,99.2]],     color:'#f5a623' },
    { coords:[[-6.2,106.8],[-6.5,107.5],[-7.0,108.5],[-7.4,109.2],[-7.3,110.5],[-7.3,112.7]], color:'#00d4a0' },
    { coords:[[1.0,109.3],[1.5,110.5],[0.5,111.8],[0.0,113.2],[-1.0,114.5],[-2.0,115.9]], color:'#00d4a0' },
  ];

  const alertDescs = [
    'Penurunan tekanan drastis 30.2 bar dalam 8 menit. AI mendeteksi pola kebocoran kategori besar. Isolasi segmen disarankan.',
    'Penurunan tekanan 4.8 bar terdeteksi di segmen KM 210. Pemantauan lanjutan diperlukan.',
    'Penurunan tekanan minor 1.3 bar. Kemungkinan disebabkan fluktuasi normal. Investigasi awal dimulai.',
    'Anomali tekanan kecil terdeteksi namun kemungkinan besar false positive. Lanjut monitoring.',
    'Tekanan dalam batas normal, tidak ada indikasi kebocoran signifikan.',
  ];

  const spbuFraud = [
    { id:1, name:'SPBU Jl. Gatot Subroto No.12', code:'14.201.04', prov:'Sumatra Utara',    city:'Medan',          vol:'84.2K L', loss:'Rp 126Jt', flags:['Volume anomali','Meter rusak','Stempel palsu'],            status:'TERKONFIRMASI', risk:91, level:'KRITIS', bukti:7, tgl:'2026-04-29' },
    { id:2, name:'SPBU Jl. Diponegoro No.47',    code:'14.215.11', prov:'Sumatra Utara',    city:'Deli Serdang',   vol:'61.0K L', loss:'Rp 91Jt',  flags:['Transaksi ID berulang','Volume anomali'],                   status:'INVESTIGASI',   risk:84, level:'KRITIS', bukti:5, tgl:'2026-04-28' },
    { id:3, name:'SPBU Jl. Ahmad Yani No.3',     code:'14.218.07', prov:'Sumatra Utara',    city:'Binjai',         vol:'43.5K L', loss:'Rp 65Jt',  flags:['Harga tidak sesuai','Volume anomali'],                      status:'INVESTIGASI',   risk:78, level:'TINGGI', bukti:4, tgl:'2026-04-27' },
    { id:4, name:'SPBU Jl. Soekarno-Hatta No.88',code:'31.403.21', prov:'DKI Jakarta',     city:'Jakarta Selatan',vol:'28.0K L', loss:'Rp 42Jt',  flags:['Transaksi ID berulang','Jam operasi mencurigakan'],         status:'TERFLAG',       risk:67, level:'TINGGI', bukti:3, tgl:'2026-04-26' },
    { id:5, name:'SPBU Jl. Raya Ciputat No.14',  code:'31.408.05', prov:'DKI Jakarta',     city:'Jakarta Timur',  vol:'19.4K L', loss:'Rp 29Jt',  flags:['Volume anomali'],                                           status:'TERFLAG',       risk:55, level:'SEDANG', bukti:2, tgl:'2026-04-25' },
    { id:6, name:'SPBU Jl. Raya Bogor No.201',   code:'32.104.18', prov:'Jawa Barat',      city:'Bogor',          vol:'15.2K L', loss:'Rp 23Jt',  flags:['Harga tidak sesuai'],                                       status:'TERFLAG',       risk:48, level:'SEDANG', bukti:2, tgl:'2026-04-24' },
    { id:7, name:'SPBU Jl. Veteran No.55',       code:'35.201.09', prov:'Jawa Timur',      city:'Surabaya',       vol:'8.8K L',  loss:'Rp 13Jt',  flags:['Meter rusak'],                                              status:'TERFLAG',       risk:38, level:'RENDAH', bukti:1, tgl:'2026-04-23' },
    { id:8, name:'SPBU Jl. Sam Ratulangi No.9',  code:'73.101.03', prov:'Sulawesi Selatan',city:'Makassar',       vol:'5.1K L',  loss:'Rp 8Jt',   flags:['Volume anomali'],                                           status:'INVESTIGASI',   risk:29, level:'RENDAH', bukti:1, tgl:'2026-04-22' },
    { id:9, name:'SPBU Jl. Urip Sumoharjo No.77',code:'73.105.14', prov:'Sulawesi Selatan',city:'Makassar',       vol:'—',       loss:'—',         flags:[],                                                           status:'BERSIH',        risk:12, level:'BERSIH', bukti:0, tgl:'2026-04-21' },
  ];

  const provinsiData = [
    { name:'Sumatra Utara',    abbr:'Smtr Utara',   spbu:892,  pop:'14.799K', pert:107.3, sol:104.5, total:106.1, over:true  },
    { name:'DKI Jakarta',      abbr:'DKI Jakarta',  spbu:684,  pop:'10.562K', pert:105.8, sol:103.4, total:104.8, over:true  },
    { name:'Sulawesi Selatan', abbr:'Sul Selatan',  spbu:468,  pop:'9.073K',  pert:97.1,  sol:95.0,  total:96.2,  over:false },
    { name:'Jawa Tengah',      abbr:'Jawa Tengah',  spbu:1580, pop:'36.517K', pert:95.3,  sol:93.1,  total:94.4,  over:false },
    { name:'Jawa Barat',       abbr:'Jawa Barat',   spbu:2100, pop:'49.935K', pert:98.7,  sol:96.2,  total:97.6,  over:false },
    { name:'Kalimantan Selatan',abbr:'Kal Selatan', spbu:312,  pop:'4.235K',  pert:84.2,  sol:82.1,  total:83.3,  over:false },
    { name:'Kalimantan Timur', abbr:'Kal Timur',    spbu:287,  pop:'3.981K',  pert:78.5,  sol:76.3,  total:77.5,  over:false },
    { name:'Riau',             abbr:'Riau',         spbu:543,  pop:'6.801K',  pert:91.4,  sol:89.7,  total:90.7,  over:false },
    { name:'Sumatra Selatan',  abbr:'Smtr Selatan', spbu:621,  pop:'8.476K',  pert:88.3,  sol:85.4,  total:87.1,  over:false },
    { name:'Papua',            abbr:'Papua',        spbu:198,  pop:'4.303K',  pert:72.1,  sol:68.4,  total:70.5,  over:false },
    { name:'Jawa Timur',       abbr:'Jawa Timur',   spbu:1950, pop:'40.665K', pert:102.4, sol:99.8,  total:101.3, over:false },
    { name:'Sulawesi Tengah',  abbr:'Sul Tengah',   spbu:234,  pop:'3.025K',  pert:79.6,  sol:77.1,  total:78.5,  over:false },
  ];

  /* ── Helpers ─────────────────────────────────────────────── */
  function riskColor(r) {
    if (r >= 80) return '#ff4055';
    if (r >= 60) return '#f5a623';
    if (r >= 40) return '#f5c842';
    return '#00d4a0';
  }

  function statusColor(s) {
    return { TERKONFIRMASI:'#ff4055', INVESTIGASI:'#f5a623', TERFLAG:'#f5c842', BERSIH:'#00d4a0', AKTIF:'#ff4055', NORMAL:'#00d4a0', 'FALSE POSITIVE':'#4a5f82' }[s] || '#8095be';
  }

  function sevColor(s) {
    return { KRITIS:'#ff4055', SEDANG:'#f5a623', RENDAH:'#1a7fe8', NORMAL:'#00d4a0' }[s] || '#8095be';
  }

  function badge(text, color) {
    return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:${color}22;color:${color};border:1px solid ${color}44;letter-spacing:0.3px">${text}</span>`;
  }

  function destroyTabContent() {
    intervals.forEach(clearInterval);
    intervals = [];
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
    charts = {};
    if (maps._raf) { cancelAnimationFrame(maps._raf); maps._raf = null; }
    if (maps.leak) { maps.leak.remove(); maps.leak = null; }
  }

  /* ── Main Shell ──────────────────────────────────────────── */
  function render() {
    return `
    <div class="ai-wrap" style="height:calc(100vh - var(--nav-h))">
      <div class="ai-subnav">
        <span class="ai-subnav-label">INTELIJEN /</span>
        <button class="ai-tab active" data-tab="leak">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          Leak Detection AI <span class="ai-badge ai-badge-red">1</span>
        </button>
        <button class="ai-tab" data-tab="demand">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Demand Forecast
        </button>
        <button class="ai-tab" data-tab="fraud">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Fraud Detection <span class="ai-badge ai-badge-orange">8</span>
        </button>
        <button class="ai-tab" data-tab="subsidi">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="1" y="12" width="4" height="10"/><rect x="7" y="8" width="4" height="14"/><rect x="13" y="5" width="4" height="17"/><rect x="19" y="9" width="4" height="13"/></svg>
          Subsidi BBM
        </button>
      </div>
      <div id="ai-content" class="ai-content"></div>
    </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     TAB 1 — LEAK DETECTION AI
     ══════════════════════════════════════════════════════════ */
  function leakHTML() {
    return `
    <div class="ai-page">
      <div class="ai-kpi-row">
        <div class="ai-kpi-card"><div class="ai-kpi-label">Alert Aktif</div><div class="ai-kpi-val" style="color:#ff4055">1</div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Pipeline Kritis</div><div class="ai-kpi-val" style="color:#ff4055">1</div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Avg Risk Score</div><div class="ai-kpi-val" style="color:#f5a623">33</div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">AI Confidence</div><div class="ai-kpi-val" style="color:#1a7fe8">97%</div></div>
      </div>

      <div class="ai-leak-main">
        <div class="card ai-leak-map-card" style="padding:0;overflow:hidden">
          <div class="ai-map-legend">
            ${['#00d4a0|Normal','#f5a623|Warning','#ff4055|Critical','#4a5f82|Shutdown'].map(s=>{const[c,l]=s.split('|');return `<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:4px;vertical-align:middle"></span>${l}</span>`;}).join('')}
          </div>
          <div id="leak-map" style="width:100%;height:calc(100% - 36px)"></div>
        </div>

        <div class="card ai-leak-alerts" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px;border-bottom:1px solid var(--border);flex-shrink:0">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;color:var(--text0)">
              <span class="pulse-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4055;margin-right:6px;vertical-align:middle;box-shadow:0 0 0 0 rgba(255,64,85,.7);animation:pulse-ring 1.4s ease-out infinite"></span>
              LEAK ALERTS
            </span>
            <span style="font-size:10px;color:var(--text3)">AI Model v2.4 — <span style="color:#00d4a0;font-weight:600">ACTIVE</span></span>
          </div>
          <div style="overflow-y:auto;flex:1">
            ${pipelineAlerts.map((a,i) => `
            <div class="ai-alert-row${i===0?' ai-alert-crit':''}" id="leak-row-${i}" onclick="window._aiLeak(${i})">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${sevColor(a.sev)};display:inline-block;flex-shrink:0"></span>
                  <strong style="font-size:12px;color:var(--text0)">${a.name}</strong>
                </div>
                ${badge(a.sev, sevColor(a.sev))}
              </div>
              <div style="font-size:11px;color:var(--text2);margin:3px 0 3px 14px">${a.loc}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-left:14px">
                <span style="color:#ff4055;font-size:11px;font-weight:600">ΔP: ${a.dp}</span>
                <span style="font-size:10px;color:${statusColor(a.status)};font-weight:600">${a.status}</span>
                <span style="font-size:10px;color:var(--text3)">AI: ${a.ai}%</span>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="ai-leak-bottom">
        <div class="card" style="flex:1;padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.8px">DETAIL ALERT</span>
            <span style="font-size:11px;color:var(--text2)">Terdeteksi: <span id="leak-time" style="color:var(--blue);font-family:'JetBrains Mono',monospace;font-size:11px">--:--:--</span></span>
          </div>
          <p id="leak-desc" style="font-size:12px;color:var(--text1);line-height:1.65;margin-bottom:12px">${alertDescs[0]}</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div class="ai-mbox"><div class="ai-mlabel">AI Confidence</div><div class="ai-mval" style="color:#1a7fe8" id="leak-conf">97.3%</div></div>
            <div class="ai-mbox"><div class="ai-mlabel">Pressure Drop</div><div class="ai-mval" style="color:#ff4055" id="leak-pdrop">30.2 bar</div></div>
            <div class="ai-mbox"><div class="ai-mlabel">KM Pipeline</div><div class="ai-mval" style="color:#f5a623" id="leak-km">KM 124</div></div>
          </div>
        </div>

        <div class="card" style="flex:1;padding:14px;overflow-y:auto">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:12px">RISK SCORE PIPELINE</div>
          ${pipelineAlerts.map((a,i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
            <span style="color:var(--text3);font-size:11px;width:14px;flex-shrink:0">${i+1}</span>
            <span style="flex:1;font-size:12px;color:var(--text1)">${a.name}</span>
            <div style="width:120px;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;flex-shrink:0">
              <div style="height:100%;width:${a.risk}%;background:${riskColor(a.risk)};border-radius:3px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${riskColor(a.risk)};width:24px;text-align:right;flex-shrink:0">${a.risk}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function initLeak() {
    const el = document.getElementById('leak-map');
    if (!el || maps.leak) return;

    maps.leak = L.map('leak-map', { center:[-2,118], zoom:5, zoomControl:false, attributionControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:18, subdomains:'abcd' }).addTo(maps.leak);

    pipelineRoutes.forEach(r => {
      L.polyline(r.coords, { color:r.color, weight:12, opacity:0.12 }).addTo(maps.leak);
      L.polyline(r.coords, { color:r.color, weight:3.5, opacity:0.9 }).addTo(maps.leak);
    });

    pipelineAlerts.forEach((a, i) => {
      const c = sevColor(a.sev);
      const pulse = i === 0 ? 'animation:log-pulse-map 1.4s ease-in-out infinite' : '';
      const icon = L.divIcon({
        html:`<div style="width:${i===0?14:10}px;height:${i===0?14:10}px;border-radius:50%;background:${c};border:2px solid #fff3;box-shadow:0 0 ${i===0?14:6}px ${c};${pulse}"></div>`,
        className:'', iconAnchor:[7,7]
      });
      L.marker([a.lat, a.lng], { icon }).addTo(maps.leak)
        .bindPopup(`<b>${a.name}</b><br>${a.loc}<br>ΔP: ${a.dp}<br>AI: ${a.ai}%`);
    });

    intervals.push(setInterval(() => {
      const t = document.getElementById('leak-time');
      if (t) { const n=new Date(); t.textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`; }
    }, 1000));

    window._aiLeak = (idx) => {
      const a = pipelineAlerts[idx];
      document.querySelectorAll('.ai-alert-row').forEach((r,i) => r.style.background = i===idx ? 'var(--bg3)' : '');
      const d = document.getElementById('leak-desc');
      const c = document.getElementById('leak-conf');
      const p = document.getElementById('leak-pdrop');
      const k = document.getElementById('leak-km');
      if (d) d.textContent = alertDescs[idx];
      if (c) c.textContent = a.ai + '%';
      if (p) p.textContent = a.dp.replace('-','') + ' bar';
      if (k) { const m = a.loc.match(/KM (\d+)/); k.textContent = m ? 'KM '+m[1] : '—'; }
      if (maps.leak) maps.leak.flyTo([a.lat, a.lng], 7, { animate:true, duration:0.8 });
    };
    window._aiLeak(0);
  }

  /* ══════════════════════════════════════════════════════════
     TAB 2 — DEMAND FORECAST
     ══════════════════════════════════════════════════════════ */
  function demandHTML() {
    return `
    <div class="ai-page">
      <div class="ai-kpi-row">
        <div class="ai-kpi-card"><div class="ai-kpi-label">Demand Hari Ini</div><div class="ai-kpi-val" style="color:#00d4a0">61.8K <span style="font-size:14px;font-weight:400;color:var(--text2)">KL</span></div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Forecast Besok</div><div class="ai-kpi-val" style="color:#1a7fe8">62.8K <span style="font-size:14px;font-weight:400;color:var(--text2)">KL</span></div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Trend vs Kemarin</div><div class="ai-kpi-val" style="color:#ff4055">+1.6%</div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Model Accuracy</div><div class="ai-kpi-val" style="color:#a855f7">94.7%</div></div>
      </div>

      <div class="card" style="flex:1;min-height:0;padding:14px;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;flex-shrink:0">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;display:flex;align-items:center;gap:6px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a7fe8" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            PREDIKSI KEBUTUHAN BBM NASIONAL
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <div class="ai-seg-grp">
              ${['Pertalite','Pertamax','Solar','Avtur'].map((f,i) => `<button class="ai-seg-btn ${i===0?'active':''}" data-dfuel="${f.toLowerCase()}">${f}</button>`).join('')}
            </div>
            <div class="ai-seg-grp">
              ${['7 Hari','30 Hari','Semua'].map((t,i) => `<button class="ai-seg-btn ${i===2?'active':''}" data-dtime="${t}">${t}</button>`).join('')}
            </div>
          </div>
        </div>
        <div style="flex:1;min-height:0;position:relative">
          <canvas id="demand-chart"></canvas>
        </div>
        <div style="display:flex;gap:20px;margin-top:8px;flex-shrink:0;flex-wrap:wrap">
          ${[['#00d4a0','Data aktual'],['rgba(100,180,120,0.5)','— — Forecast'],['rgba(130,150,200,0.25)','Confidence interval (±90%)']].map(([c,l])=>`<span style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text2)"><span style="width:18px;height:3px;background:${c};display:inline-block;border-radius:2px"></span>${l}</span>`).join('')}
        </div>
      </div>

      <div class="ai-demand-dist">
        ${[['Pertalite','#00d4a0','28.0K','+2.9%'],['Pertamax','#1a7fe8','8.2K','+2.5%'],['Solar','#f5a623','22.3K','+1.0%'],['Avtur','#a855f7','3.3K','-7.9%']].map(([n,c,v,t])=>`
        <div class="card ai-fuel-dcard">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block;flex-shrink:0"></span>
            <span style="font-size:13px;font-weight:600;color:var(--text0)">${n}</span>
          </div>
          <div style="font-size:26px;font-weight:700;color:var(--text0)">${v}K</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">Kiloliter / hari</div>
          <div style="font-size:12px;font-weight:600;margin-top:8px;color:${t.startsWith('+')?'#f5a623':'#ff4055'}">Forecast besok: ${t}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  function initDemand() {
    const PTS = 40, HIST = 30;
    const labels = [];
    const base = new Date('2026-04-01');
    for (let i = 0; i < PTS; i++) {
      const d = new Date(base); d.setDate(d.getDate() + i);
      labels.push(i % 5 === 0 ? `${pad(d.getDate())} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]}` : '');
    }

    const gen = (base, v=0.035) => App.utils.timeSeries(HIST, base, v);
    const pertHist = gen(27000); const solHist = gen(22000);
    const maxHist = gen(8500, 0.04); const avturHist = gen(3500, 0.04);

    const fore = (hist) => {
      const out = new Array(PTS).fill(null);
      out[HIST-1] = hist[HIST-1];
      for (let i = HIST; i < PTS; i++) out[i] = out[i-1] * (1 + (Math.random()-0.35)*0.03);
      return out;
    };
    const pertFore = fore(pertHist), solFore = fore(solHist);

    const pad0 = (arr, n) => [...arr, ...new Array(n).fill(null)];
    const confU = pertFore.map(v => v ? v*1.055 : null);
    const confL = pertFore.map(v => v ? v*0.945 : null);

    const ctx = document.getElementById('demand-chart');
    if (!ctx) return;
    charts.demand = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Pertalite', data:pad0(pertHist,PTS-HIST), borderColor:'#00d4a0', borderWidth:2, tension:0.4, pointRadius:0, fill:false },
          { label:'Solar',     data:pad0(solHist,PTS-HIST),  borderColor:'#f5a623', borderWidth:2, tension:0.4, pointRadius:0, fill:false },
          { label:'Pertamax',  data:pad0(maxHist,PTS-HIST),  borderColor:'#1a7fe8', borderWidth:2, tension:0.4, pointRadius:0, fill:false },
          { label:'Avtur',     data:pad0(avturHist,PTS-HIST),borderColor:'#a855f7', borderWidth:2, tension:0.4, pointRadius:0, fill:false },
          { label:'Pertalite Forecast', data:pertFore, borderColor:'#00d4a0', borderWidth:2, borderDash:[7,5], tension:0.4, pointRadius:0, fill:false },
          { label:'Solar Forecast',     data:solFore,  borderColor:'#f5a623', borderWidth:2, borderDash:[7,5], tension:0.4, pointRadius:0, fill:false },
          { label:'_confU', data:confU, borderColor:'transparent', backgroundColor:'rgba(120,150,200,0.1)', tension:0.4, pointRadius:0, fill:'+1' },
          { label:'_confL', data:confL, borderColor:'transparent', tension:0.4, pointRadius:0, fill:false },
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        plugins:{
          legend:{ display:false },
          tooltip:{ backgroundColor:'#111c35', borderColor:'#2a5298', borderWidth:1, titleColor:'#eef2ff', bodyColor:'#8095be',
            filter: item => !item.dataset.label.startsWith('_') },
        },
        scales:{
          x:{ grid:{ color:'rgba(42,82,152,0.15)' }, ticks:{ color:'#4a5f82', font:{ size:9 }, maxRotation:0 } },
          y:{ grid:{ color:'rgba(42,82,152,0.15)' }, ticks:{ color:'#4a5f82', font:{ size:9 }, callback: v => v>=1000?(v/1000).toFixed(0)+'K':v }, beginAtZero:false },
        },
        animation:{ duration:700 },
      }
    });

    document.querySelectorAll('[data-dfuel]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-dfuel]').forEach(b => b.classList.toggle('active', b===btn));
        const f = btn.dataset.dfuel;
        const vis = { pertalite:[0,4], pertamax:[2], solar:[1,5], avtur:[3] }[f] || [0,4];
        charts.demand.data.datasets.forEach((ds, i) => {
          if (ds.label.startsWith('_')) return;
          charts.demand.data.datasets[i].hidden = !vis.includes(i);
        });
        charts.demand.update();
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     TAB 3 — FRAUD DETECTION
     ══════════════════════════════════════════════════════════ */
  function fraudHTML() {
    const rows = fraudFilter==='semua' ? spbuFraud : spbuFraud.filter(s => s.status.toLowerCase()===fraudFilter || (fraudFilter==='terkonfirmasi'&&s.status==='TERKONFIRMASI') || (fraudFilter==='investigasi'&&s.status==='INVESTIGASI') || (fraudFilter==='terflag'&&s.status==='TERFLAG') || (fraudFilter==='bersih'&&s.status==='BERSIH'));
    return `
    <div class="ai-page">
      <div class="ai-kpi-row">
        <div class="ai-kpi-card"><div class="ai-kpi-label">Fraud Terkonfirmasi</div><div class="ai-kpi-val" style="color:#ff4055">1</div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Dalam Investigasi</div><div class="ai-kpi-val" style="color:#f5a623">3</div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Volume Mencurigakan</div><div class="ai-kpi-val" style="color:#ff4055">265.2K <span style="font-size:13px;font-weight:400;color:var(--text2)">L</span></div></div>
        <div class="ai-kpi-card"><div class="ai-kpi-label">Est. Kerugian Negara</div><div class="ai-kpi-val" style="color:#ff4055">Rp 397 <span style="font-size:14px;font-weight:400;color:var(--text2)">Jt</span></div></div>
      </div>

      <div class="ai-fraud-layout">
        <div class="card ai-fraud-tbl-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;flex-shrink:0">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;display:flex;align-items:center;gap:6px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff4055" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              SPBU TERDETEKSI FRAUD
            </span>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${['Semua','Terkonfirmasi','Investigasi','Terflag','Bersih'].map(f=>`
              <button class="ai-filter-btn${fraudFilter===f.toLowerCase()||fraudFilter===f?'':''}"
                style="${(fraudFilter===f.toLowerCase()||(f==='Semua'&&fraudFilter==='semua'))?'background:rgba(255,64,85,0.12);border-color:rgba(255,64,85,0.4);color:var(--text0)':''}"
                onclick="window._aiFF('${f.toLowerCase()}')">${f}</button>`).join('')}
            </div>
          </div>
          <div style="flex:1;overflow-y:auto;min-height:0">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  ${['Risk','Nama SPBU','Provinsi','Volume','Kerugian','Flag','Status'].map(h=>`<th style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;padding:8px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg2)">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${spbuFraud.map((s,i) => `
                <tr class="ai-fraud-row" id="frow-${i}" onclick="window._aiFS(${i})" style="${selectedSpbu===i?'background:rgba(26,127,232,0.1);outline:1px solid rgba(26,127,232,0.3);outline-offset:-1px':''}">
                  <td style="padding:8px 10px">
                    <div style="width:46px;height:52px;border-radius:8px;border:1px solid ${riskColor(s.risk)}44;background:${riskColor(s.risk)}12;display:flex;flex-direction:column;align-items:center;justify-content:center">
                      <span style="font-size:15px;font-weight:700;color:${riskColor(s.risk)};line-height:1">${s.risk}</span>
                      <span style="font-size:9px;color:${riskColor(s.risk)};font-weight:600">${s.level}</span>
                    </div>
                  </td>
                  <td style="padding:8px 10px">
                    <div style="font-size:12px;font-weight:500;color:var(--text0)">${s.name}</div>
                    <div style="font-size:10px;color:var(--text3)">${s.code}</div>
                  </td>
                  <td style="padding:8px 10px">
                    <div style="font-size:12px;color:var(--text1)">${s.prov}</div>
                    <div style="font-size:10px;color:var(--text3)">${s.city}</div>
                  </td>
                  <td style="padding:8px 10px;font-size:12px;color:var(--text1)">${s.vol}</td>
                  <td style="padding:8px 10px;font-size:12px;color:var(--text1)">${s.loss}</td>
                  <td style="padding:8px 10px">
                    <div style="display:flex;flex-wrap:wrap;gap:3px">
                      ${s.flags.slice(0,2).map(f=>`<span style="font-size:9px;padding:2px 6px;background:rgba(245,166,35,0.12);color:#f5a623;border:1px solid rgba(245,166,35,0.3);border-radius:3px;white-space:nowrap">${f}</span>`).join('')}
                      ${s.flags.length>2?`<span style="font-size:9px;padding:2px 6px;background:rgba(245,166,35,0.12);color:#f5a623;border:1px solid rgba(245,166,35,0.3);border-radius:3px">+${s.flags.length-2}</span>`:''}
                    </div>
                  </td>
                  <td style="padding:8px 10px">
                    <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;background:${statusColor(s.status)}20;color:${statusColor(s.status)};border:1px solid ${statusColor(s.status)}44;white-space:nowrap">${s.status}</span>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card ai-fraud-detail" id="fraud-detail">
          ${fraudDetailHTML(spbuFraud[selectedSpbu])}
        </div>
      </div>
    </div>`;
  }

  function fraudDetailHTML(s) {
    return `
      <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:4px">DETAIL SPBU</div>
      <div style="font-size:14px;font-weight:600;color:var(--text0);margin-bottom:2px">${s.name}</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:16px">${s.code} · ${s.city}, ${s.prov}</div>
      <div style="position:relative;width:150px;margin:0 auto 14px">
        <canvas id="fraud-gauge" height="80"></canvas>
        <div style="position:absolute;bottom:2px;left:0;right:0;text-align:center">
          <div style="font-size:32px;font-weight:700;color:${riskColor(s.risk)};line-height:1">${s.risk}</div>
          <div style="font-size:10px;color:var(--text3);letter-spacing:0.5px">RISK SCORE</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        ${[['Bukti',s.bukti+' temuan'],['Aktivitas',s.tgl],['Volume',s.vol],['Est. Rugi',s.loss]].map(([l,v])=>`
        <div class="ai-mbox"><div class="ai-mlabel">${l}</div><div style="font-size:13px;font-weight:600;color:var(--text0)">${v}</div></div>`).join('')}
      </div>
      ${s.flags.length ? `
      <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:8px;color:var(--text0)">EVIDENCE FLAGS</div>
      <ul style="list-style:none;padding:0">
        ${s.flags.map(f=>`<li style="font-size:12px;color:var(--text1);padding:5px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px"><span style="color:#ff4055;font-size:9px">●</span>${f}</li>`).join('')}
      </ul>` : `<div style="font-size:12px;color:var(--text3)">Tidak ada evidence flags</div>`}`;
  }

  function initFraud() {
    drawFraudGauge(spbuFraud[selectedSpbu].risk);

    window._aiFS = (idx) => {
      selectedSpbu = idx;
      document.querySelectorAll('.ai-fraud-row').forEach((r,i) => {
        r.style.background = i===idx ? 'rgba(26,127,232,0.1)' : '';
        r.style.outline = i===idx ? '1px solid rgba(26,127,232,0.3)' : '';
        r.style.outlineOffset = '-1px';
      });
      const panel = document.getElementById('fraud-detail');
      if (panel) {
        if (charts.fGauge) { charts.fGauge.destroy(); delete charts.fGauge; }
        panel.innerHTML = fraudDetailHTML(spbuFraud[idx]);
        setTimeout(() => drawFraudGauge(spbuFraud[idx].risk), 40);
      }
    };

    window._aiFF = (filter) => {
      fraudFilter = filter;
      const content = document.getElementById('ai-content');
      if (content) {
        if (charts.fGauge) { charts.fGauge.destroy(); delete charts.fGauge; }
        content.innerHTML = fraudHTML();
        setTimeout(initFraud, 60);
      }
    };
  }

  function drawFraudGauge(risk) {
    setTimeout(() => {
      const el = document.getElementById('fraud-gauge');
      if (!el) return;
      charts.fGauge = new Chart(el, {
        type:'doughnut',
        data:{ datasets:[{ data:[risk, 100-risk], backgroundColor:[riskColor(risk),'#1a2540'], borderWidth:0, circumference:180, rotation:-90 }] },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{ legend:{display:false}, tooltip:{enabled:false} }, animation:{duration:700} }
      });
    }, 30);
  }

  /* ══════════════════════════════════════════════════════════
     TAB 4 — SUBSIDI BBM
     ══════════════════════════════════════════════════════════ */
  function subsidiBBMHTML() {
    return `
    <div class="ai-page">
      <div class="ai-kpi-row">
        <div class="ai-kpi-card">
          <div class="ai-kpi-label">Realisasi Pertalite</div>
          <div class="ai-kpi-val" style="color:#00d4a0">95.4%</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">16.04Jt dari 16.80Jt KL</div>
        </div>
        <div class="ai-kpi-card">
          <div class="ai-kpi-label">Realisasi Solar</div>
          <div class="ai-kpi-val" style="color:#f5a623">94.6%</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">10.24Jt dari 10.82Jt KL</div>
        </div>
        <div class="ai-kpi-card">
          <div class="ai-kpi-label">Provinsi Over-Kuota</div>
          <div class="ai-kpi-val" style="color:#ff4055">2</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">perlu perhatian</div>
        </div>
        <div class="ai-kpi-card">
          <div class="ai-kpi-label">Rata-rata Efisiensi</div>
          <div class="ai-kpi-val" style="color:#1a7fe8">93%</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">semua provinsi</div>
        </div>
      </div>

      <div class="ai-subsidi-layout">
        <div class="card ai-subsidi-chart" style="display:flex;flex-direction:column;padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;flex-wrap:wrap;gap:8px">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.8px">KUOTA VS REALISASI PER PROVINSI</div>
            <div class="ai-seg-grp">
              ${['Pertalite','Solar','Total'].map((f,i)=>`<button class="ai-seg-btn${i===0?' active':''}" data-sfuel="${f.toLowerCase()}" onclick="window._aiSF('${f.toLowerCase()}')">${f}</button>`).join('')}
            </div>
          </div>
          <div style="flex:1;min-height:0"><canvas id="subsidi-chart"></canvas></div>
          <div style="display:flex;gap:14px;margin-top:8px;flex-shrink:0;flex-wrap:wrap">
            ${[['rgba(180,195,220,0.3)','Kuota'],['#00d4a0','Normal (<85%)'],['#f5a623','Mendekati batas'],['#ff4055','Melebihi kuota']].map(([c,l])=>`<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><span style="width:12px;height:10px;border-radius:2px;background:${c};display:inline-block"></span>${l}</span>`).join('')}
          </div>
        </div>

        <div class="card ai-subsidi-detail">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:12px;flex-shrink:0">DETAIL PROVINSI</div>
          <div style="flex:1;overflow-y:auto">
            ${provinsiData.map(p => {
              const fc = subsidiFuel;
              const pct = fc==='solar'?p.sol:fc==='total'?p.total:p.pert;
              const c = pct>100?'#ff4055':pct>90?'#f5a623':'#00d4a0';
              return `
              <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
                  <div>
                    <div style="font-size:13px;font-weight:600;color:${p.over?'#f5a623':'var(--text0)'}">${p.name}</div>
                    <div style="font-size:10px;color:var(--text3)">${p.spbu} SPBU · ${p.pop} jiwa</div>
                  </div>
                  ${p.over?`<span style="font-size:9px;font-weight:700;padding:2px 8px;background:rgba(255,64,85,0.15);color:#ff4055;border:1px solid rgba(255,64,85,0.3);border-radius:4px">OVER</span>`:''}
                </div>
                <div style="margin-bottom:3px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:11px;color:var(--text2)">Pertalite</span><span style="font-size:11px;font-weight:600;color:${p.pert>100?'#ff4055':p.pert>90?'#f5a623':'#00d4a0'}">${p.pert>100?'+':''}${(p.pert-100).toFixed(1)}%</span></div>
                  <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden"><div style="height:100%;width:${Math.min(p.pert,112)/112*100}%;background:${p.pert>100?'#ff4055':p.pert>90?'#f5a623':'#00d4a0'};border-radius:2px"></div></div>
                </div>
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:11px;color:var(--text2)">Solar</span><span style="font-size:11px;font-weight:600;color:${p.sol>100?'#ff4055':p.sol>90?'#f5a623':'#00d4a0'}">${p.sol>100?'+':''}${(p.sol-100).toFixed(1)}%</span></div>
                  <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden"><div style="height:100%;width:${Math.min(p.sol,112)/112*100}%;background:${p.sol>100?'#ff4055':p.sol>90?'#f5a623':'#00d4a0'};border-radius:2px"></div></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  function initSubsidi() {
    buildSubsidiChart(subsidiFuel);

    window._aiSF = (fuel) => {
      subsidiFuel = fuel;
      document.querySelectorAll('[data-sfuel]').forEach(b => b.classList.toggle('active', b.dataset.sfuel===fuel));
      if (charts.subsBar) { charts.subsBar.destroy(); delete charts.subsBar; }
      buildSubsidiChart(fuel);
      // refresh detail panel
      const detail = document.querySelector('.ai-subsidi-detail > div:last-child');
      // Re-render detail - simpler to just reload the tab
      const wrap = document.querySelector('.ai-subsidi-detail');
      if (wrap) {
        const old = wrap.querySelector('div:last-child');
        if (old) {
          old.innerHTML = provinsiData.map(p => {
            const pct = fuel==='solar'?p.sol:fuel==='total'?p.total:p.pert;
            const c = pct>100?'#ff4055':pct>90?'#f5a623':'#00d4a0';
            return `
            <div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
                <div>
                  <div style="font-size:13px;font-weight:600;color:${p.over?'#f5a623':'var(--text0)'}">${p.name}</div>
                  <div style="font-size:10px;color:var(--text3)">${p.spbu} SPBU · ${p.pop} jiwa</div>
                </div>
                ${p.over?`<span style="font-size:9px;font-weight:700;padding:2px 8px;background:rgba(255,64,85,0.15);color:#ff4055;border:1px solid rgba(255,64,85,0.3);border-radius:4px">OVER</span>`:''}
              </div>
              <div style="margin-bottom:3px">
                <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:11px;color:var(--text2)">Pertalite</span><span style="font-size:11px;font-weight:600;color:${p.pert>100?'#ff4055':p.pert>90?'#f5a623':'#00d4a0'}">${p.pert>100?'+':''}${(p.pert-100).toFixed(1)}%</span></div>
                <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden"><div style="height:100%;width:${Math.min(p.pert,112)/112*100}%;background:${p.pert>100?'#ff4055':p.pert>90?'#f5a623':'#00d4a0'};border-radius:2px"></div></div>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:11px;color:var(--text2)">Solar</span><span style="font-size:11px;font-weight:600;color:${p.sol>100?'#ff4055':p.sol>90?'#f5a623':'#00d4a0'}">${p.sol>100?'+':''}${(p.sol-100).toFixed(1)}%</span></div>
                <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden"><div style="height:100%;width:${Math.min(p.sol,112)/112*100}%;background:${p.sol>100?'#ff4055':p.sol>90?'#f5a623':'#00d4a0'};border-radius:2px"></div></div>
              </div>
            </div>`;
          }).join('');
        }
      }
    };
  }

  function buildSubsidiChart(fuel) {
    const el = document.getElementById('subsidi-chart');
    if (!el) return;
    const totalSPBU = provinsiData.reduce((s,p) => s+p.spbu, 0);
    const natKuota = fuel==='solar' ? 10820000 : fuel==='total' ? 27620000 : 16800000;
    const kuotaArr = provinsiData.map(p => Math.round(natKuota * p.spbu / totalSPBU));
    const pctArr   = provinsiData.map(p => fuel==='solar'?p.sol:fuel==='total'?p.total:p.pert);
    const realArr  = kuotaArr.map((k,i) => Math.round(k * pctArr[i] / 100));
    const colors   = pctArr.map(v => v>100?'#ff4055':v>90?'#f5a623':'#00d4a0');

    charts.subsBar = new Chart(el, {
      type:'bar',
      data:{
        labels: provinsiData.map(p=>p.abbr),
        datasets:[
          { label:'Kuota', data:kuotaArr, backgroundColor:'rgba(180,195,220,0.2)', borderColor:'rgba(180,195,220,0.4)', borderWidth:1, borderRadius:3 },
          { label:'Realisasi', data:realArr, backgroundColor:colors, borderWidth:0, borderRadius:3 },
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{ backgroundColor:'#111c35', borderColor:'#2a5298', borderWidth:1, titleColor:'#eef2ff', bodyColor:'#8095be',
            callbacks:{ label: ctx => `${ctx.dataset.label}: ${ctx.raw>=1e6?(ctx.raw/1e6).toFixed(2)+'Jt':ctx.raw>=1e3?(ctx.raw/1e3).toFixed(0)+'K':ctx.raw} KL` }
          },
        },
        scales:{
          x:{ grid:{color:'rgba(42,82,152,0.1)'}, ticks:{color:'#4a5f82',font:{size:8},maxRotation:35} },
          y:{ grid:{color:'rgba(42,82,152,0.1)'}, ticks:{color:'#4a5f82',font:{size:9},callback:v=>v>=1e6?(v/1e6).toFixed(1)+'Jt':v>=1e3?(v/1e3).toFixed(0)+'K':v} },
        },
        animation:{duration:600},
      }
    });
  }

  /* ── Tab Switching ───────────────────────────────────────── */
  const tabHTML = { leak:leakHTML, demand:demandHTML, fraud:fraudHTML, subsidi:subsidiBBMHTML };
  const tabInit = { leak:initLeak, demand:initDemand, fraud:initFraud, subsidi:initSubsidi };

  function showTab(tab) {
    destroyTabContent();
    currentTab = tab;
    document.querySelectorAll('.ai-tab').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
    const content = document.getElementById('ai-content');
    if (!content) return;
    content.innerHTML = tabHTML[tab]();
    setTimeout(() => tabInit[tab](), 80);
  }

  function pad(n) { return String(n).padStart(2,'0'); }

  /* ── Lifecycle ───────────────────────────────────────────── */
  function init() {
    const c = document.getElementById('dash-ai');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => {
      document.querySelectorAll('.ai-tab').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
      showTab('leak');
    }, 30);
  }

  function destroy() {
    destroyTabContent();
    currentTab = 'leak';
    fraudFilter = 'semua';
  }

  return { init, destroy };
})();
