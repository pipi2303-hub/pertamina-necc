/* ============================================================
   Dashboard 9 — HSE (Health, Safety & Environment)
   ============================================================ */

window.DashHSE = (() => {
  const u = () => App.utils;
  let charts    = {};
  let maps      = {};
  let intervals = [];
  let selIdx    = 0;
  const incMarkers = [];

  /* ── DATA ──────────────────────────────────────────────────── */
  const ITYPE_COLOR = {
    'Kebakaran'       : '#ff4055',
    'Tumpahan Minyak' : '#f5a623',
    'Gas Leak'        : '#a855f7',
    'Kecelakaan Kerja': '#00c8ff',
    'Near Miss'       : '#00d4a0',
  };

  const INCIDENTS = [
    { id:'INC-2604-001', type:'Kebakaran',        site:'RU IV Cilacap',    loc:'Unit CDU-3',          sev:'KRITIS', sts:'AKTIF',      time:'08:14', dur:'2j 18m', injure:0, lat:-7.73, lng:109.01,
      desc:'Kebakaran di unit CDU-3 akibat kebocoran flange. Tim pemadam dikerahkan, area diisolasi radius 50m. Shutdown darurat aktif.' },
    { id:'INC-2604-002', type:'Tumpahan Minyak',  site:'RU VI Balongan',   loc:'Marine Terminal',     sev:'TINGGI', sts:'INVESTIGASI', time:'06:42', dur:'3j 50m', injure:0, lat:-6.48, lng:108.54,
      desc:'Tumpahan crude oil ±15 kL di area dermaga akibat kebocoran flange loading arm. Tim OSRL diaktifkan. Boom barrier terpasang.' },
    { id:'INC-2604-003', type:'Gas Leak',         site:'RU II Dumai',      loc:'HDS Unit',            sev:'TINGGI', sts:'TERTANGANI',  time:'11:25', dur:'45m',    injure:0, lat:1.68,  lng:101.44,
      desc:'Deteksi H2S 12 ppm di unit HDS. Personel dievakuasi, isolasi segmen selesai. Konsentrasi gas sudah di bawah LEL.' },
    { id:'INC-2604-004', type:'Kecelakaan Kerja', site:'Terminal Plaju',   loc:'Area Loading Arm',    sev:'SEDANG', sts:'INVESTIGASI', time:'09:03', dur:'3j 09m', injure:1, lat:-2.98, lng:104.87,
      desc:'Pekerja kontraktor luka ringan terpeleset di platform loading. Sudah ditangani medis. RCA dijadwalkan 14:00 WIB hari ini.' },
    { id:'INC-2604-005', type:'Near Miss',        site:'RU V Balikpapan',  loc:'Tanki T-201',         sev:'RENDAH', sts:'CLOSED',      time:'07:55', dur:'1j 05m', injure:0, lat:-1.27, lng:116.83,
      desc:'Hampir-celaka: swing crane hampir mengenai pekerja di area tanki. Tidak ada cedera. LOTO re-briefing dilaksanakan.' },
    { id:'INC-2604-006', type:'Gas Leak',         site:'RU I Pangkalan Brandan', loc:'Kompresor K-101', sev:'SEDANG', sts:'CLOSED',  time:'05:30', dur:'2j 00m', injure:0, lat:4.02,  lng:98.22,
      desc:'Minor gas leak pada seal kompresor K-101. Dideteksi oleh FGD system. Penggantian seal selesai dalam waktu 2 jam.' },
  ];

  const SITES = [
    { name:'RU IV Cilacap',        short:'Cilacap',    ltif:0.85, comply:91, days:8,   ptw:42, co2:187.3, active:true  },
    { name:'RU VI Balongan',       short:'Balongan',   ltif:0.22, comply:96, days:45,  ptw:38, co2:143.1, active:true  },
    { name:'RU II Dumai',          short:'Dumai',      ltif:0.18, comply:94, days:62,  ptw:31, co2:121.7, active:false },
    { name:'Terminal Plaju',       short:'Plaju',      ltif:0.64, comply:89, days:21,  ptw:28, co2:98.4,  active:false },
    { name:'RU V Balikpapan',      short:'Balikpapan', ltif:0.12, comply:97, days:89,  ptw:55, co2:156.2, active:false },
    { name:'RU I Pang. Brandan',   short:'Pangkalan',  ltif:0.09, comply:98, days:112, ptw:24, co2:71.8,  active:false },
    { name:'RU III Sei. Gerong',   short:'Sei.Gerong', ltif:0.31, comply:93, days:33,  ptw:16, co2:68.8,  active:false },
  ];

  const PTW_LIST = [
    { id:'PTW-4821', type:'Hot Work',          site:'RU IV Cilacap',        exp:'16:00', sts:'AKTIF',   risk:'TINGGI' },
    { id:'PTW-4822', type:'Confined Space',    site:'RU V Balikpapan',      exp:'18:30', sts:'AKTIF',   risk:'TINGGI' },
    { id:'PTW-4823', type:'Electrical Work',   site:'RU II Dumai',          exp:'14:00', sts:'AKTIF',   risk:'SEDANG' },
    { id:'PTW-4824', type:'Working at Height', site:'RU VI Balongan',       exp:'12:00', sts:'EXPIRED', risk:'SEDANG' },
    { id:'PTW-4825', type:'Cold Work',         site:'Terminal Plaju',       exp:'20:00', sts:'AKTIF',   risk:'RENDAH' },
    { id:'PTW-4826', type:'Excavation',        site:'RU I Pang. Brandan',   exp:'17:00', sts:'CLOSED',  risk:'RENDAH' },
  ];

  const SITE_COORDS = {
    'RU IV Cilacap'       : [-7.73,  109.01],
    'RU VI Balongan'      : [-6.48,  108.54],
    'RU II Dumai'         : [ 1.68,  101.44],
    'Terminal Plaju'      : [-2.98,  104.87],
    'RU V Balikpapan'     : [-1.27,  116.83],
    'RU I Pang. Brandan'  : [ 4.02,   98.22],
    'RU III Sei. Gerong'  : [-3.00,  104.85],
  };

  /* ── HELPERS ───────────────────────────────────────────────── */
  function sevColor(s) {
    return { KRITIS:'#ff4055', TINGGI:'#f5a623', SEDANG:'#00c8ff', RENDAH:'#00d4a0' }[s] || '#8095be';
  }
  function stsColor(s) {
    return { AKTIF:'#ff4055', INVESTIGASI:'#f5a623', TERTANGANI:'#00c8ff', CLOSED:'#00d4a0', EXPIRED:'#ff4055' }[s] || '#8095be';
  }
  function riskColor(r) {
    return { TINGGI:'#ff4055', SEDANG:'#f5a623', RENDAH:'#00d4a0' }[r] || '#8095be';
  }

  function badge(label, color) {
    return `<span style="font-size:9.5px;padding:2px 7px;border-radius:3px;background:${color}22;color:${color};font-weight:700;border:1px solid ${color}44;white-space:nowrap;">${label}</span>`;
  }

  /* ── RENDER ────────────────────────────────────────────────── */
  function render() {
    const activeInc = INCIDENTS.filter(i => i.sts === 'AKTIF').length;

    return `
    <div style="display:grid;grid-template-rows:56px 1fr 120px;padding:10px;gap:10px;height:100%;">

      <!-- ── KPI Row ─────────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'LTIF',                val:'0.42',  unit:'',     delta:'▼ -0.08 vs last month', color:'green',  id:'ltif' },
          { label:'Near Misses (MTD)',   val:'12',    unit:'',     delta:'▲ +3 vs last month',   color:'yellow', id:'nm'   },
          { label:'HSE Compliance',      val:'94.7',  unit:'%',    delta:'▲ +1.2% vs last month',color:'blue',   id:'comp' },
          { label:'Days Without LTI',    val:'18',    unit:'days', delta:'⚠ Target: 30 days',    color:'orange', id:'dwl'  },
          { label:'CO₂ Emissions MTD',   val:'847',   unit:'KT',   delta:'▼ -3.1% vs target',   color:'cyan',   id:'co2'  },
          { label:'Active PTW',          val:'234',   unit:'',     delta:'42 High Risk',          color:'purple', id:'ptw'  },
        ].map(k => `
        <div class="kpi-card ${k.color} dd-clickable" data-dd-title="${k.label}" data-dd-domain="hse" data-dd-value="${(k.val||'').toString().replace(/<[^>]*>/g,'')}" data-dd-unit="${k.unit||''}" data-dd-delta="${k.delta||''}" data-dd-color="${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit"> ${k.unit}</span></div>
          <div class="kpi-delta ${k.delta.startsWith('▲')?'up':k.delta.startsWith('▼')?'down':'warn'}">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="hse-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- ── Body ────────────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:1fr 296px 272px;gap:10px;min-height:0;">

        <!-- Left: Map -->
        <div class="card" style="display:flex;flex-direction:column;overflow:hidden;padding:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;flex-shrink:0;">
            <div class="card-title" style="margin-bottom:0;"><span class="card-title-dot" style="background:#ff4055;box-shadow:0 0 8px rgba(255,64,85,.5);"></span>INCIDENT MAP — LIVE</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;">
              ${Object.entries(ITYPE_COLOR).map(([t,c]) =>
                `<span style="display:flex;align-items:center;gap:4px;font-size:9.5px;color:var(--text2);">
                  <span style="width:7px;height:7px;border-radius:50%;background:${c};display:inline-block;flex-shrink:0;"></span>${t}
                </span>`).join('')}
            </div>
          </div>
          <div id="hse-map" style="flex:1;min-height:0;"></div>
        </div>

        <!-- Center: Incidents + PTW -->
        <div style="display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden;">

          <!-- Active Incidents -->
          <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;padding:10px 0 0;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0 14px 8px;flex-shrink:0;">
              <div class="card-title" style="margin-bottom:0;">
                <span class="card-title-dot" style="background:#ff4055;box-shadow:0 0 8px rgba(255,64,85,.5);animation:hse-dot-pulse 1.5s infinite;"></span>
                ACTIVE INCIDENTS
              </div>
              <span style="font-size:10px;background:rgba(255,64,85,.15);color:#ff4055;padding:2px 8px;border-radius:10px;font-weight:700;">${activeInc} AKTIF</span>
            </div>
            <div style="flex:1;overflow-y:auto;">
              ${INCIDENTS.map((inc, idx) => `
              <div class="hse-inc-row ${inc.sev==='KRITIS'?'hse-inc-crit':''}" onclick="window._hseInc(${idx})" id="hse-row-${idx}">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:10.5px;font-weight:700;color:${ITYPE_COLOR[inc.type]||'#8095be'};">
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${ITYPE_COLOR[inc.type]||'#8095be'};margin-right:4px;vertical-align:middle;${inc.sts==='AKTIF'?'animation:hse-dot-pulse 1.5s infinite;':''}"></span>${inc.type}
                  </span>
                  ${badge(inc.sev, sevColor(inc.sev))}
                </div>
                <div style="font-size:11px;color:var(--text0);font-weight:600;margin-bottom:2px;">${inc.site}</div>
                <div style="font-size:10px;color:var(--text2);">${inc.loc} · ${inc.time} WIB</div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                  <span class="sts-badge" style="font-size:9.5px;padding:2px 7px;border-radius:3px;background:${stsColor(inc.sts)}22;color:${stsColor(inc.sts)};font-weight:700;border:1px solid ${stsColor(inc.sts)}44;white-space:nowrap;">${inc.sts}</span>
                  ${inc.injure > 0 ? `<span style="font-size:9.5px;color:#ff4055;font-weight:700;">⚠ ${inc.injure} Korban</span>` : `<span style="font-size:9.5px;color:var(--text3);">Durasi: ${inc.dur}</span>`}
                </div>
                ${inc.sts !== 'CLOSED' && inc.sts !== 'TERTANGANI' ? `
                <div class="alert-act-row">
                  <button class="alert-act-btn" data-action="investigate" onclick="window._alertAct('investigate',this);event.stopPropagation()">Investigate</button>
                  <button class="alert-act-btn" data-action="ack"         onclick="window._alertAct('ack',this);event.stopPropagation()">Acknowledge</button>
                  <button class="alert-act-btn" data-action="escalate"    onclick="window._alertAct('escalate',this);event.stopPropagation()">Escalate</button>
                </div>` : ''}
              </div>`).join('')}
            </div>
          </div>

          <!-- Permit-to-Work -->
          <div class="card" style="flex-shrink:0;padding:10px;">
            <div class="card-title" style="margin-bottom:8px;">
              <span class="card-title-dot"></span>PERMIT-TO-WORK STATUS
              <span style="margin-left:auto;font-size:10px;color:var(--text3);">${PTW_LIST.filter(p=>p.sts==='AKTIF').length} Aktif · ${PTW_LIST.filter(p=>p.sts==='EXPIRED').length} Expired</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;">
              ${PTW_LIST.map(p => `
              <div style="display:flex;align-items:center;gap:7px;">
                <span style="width:7px;height:7px;border-radius:50%;background:${riskColor(p.risk)};flex-shrink:0;display:inline-block;"></span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:10.5px;font-weight:600;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.type}</div>
                  <div style="font-size:9.5px;color:var(--text3);">${p.site} · Exp ${p.exp}</div>
                </div>
                ${badge(p.sts, stsColor(p.sts))}
              </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Right: Environment + Safety Score -->
        <div style="display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden;">

          <!-- Environmental Monitoring -->
          <div class="card" style="flex:1;padding:12px;overflow-y:auto;display:flex;flex-direction:column;">
            <div class="card-title" style="margin-bottom:10px;flex-shrink:0;">
              <span class="card-title-dot" style="background:var(--green);box-shadow:var(--glow-green);"></span>
              ENVIRONMENTAL MONITORING
            </div>

            <div style="flex-shrink:0;margin-bottom:12px;">
              <div style="font-size:9.5px;color:var(--text3);font-weight:700;letter-spacing:.7px;text-transform:uppercase;margin-bottom:7px;">CO₂ Emisi per Kilang (KT MTD)</div>
              ${SITES.map(s => `
              <div style="margin-bottom:7px;">
                <div style="display:flex;justify-content:space-between;font-size:9.5px;color:var(--text2);margin-bottom:2px;">
                  <span>${s.short}</span>
                  <span style="color:${s.co2>160?'#f5a623':s.co2>120?'#00c8ff':'#00d4a0'};font-weight:600;">${s.co2} KT</span>
                </div>
                <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
                  <div style="height:100%;width:${Math.min(100,(s.co2/200)*100).toFixed(0)}%;background:${s.co2>160?'#f5a623':s.co2>120?'#00c8ff':'#00d4a0'};border-radius:2px;transition:width 0.8s;"></div>
                </div>
              </div>`).join('')}
            </div>

            <div style="border-top:1px solid var(--border);padding-top:10px;flex-shrink:0;">
              <div style="font-size:9.5px;color:var(--text3);font-weight:700;letter-spacing:.7px;text-transform:uppercase;margin-bottom:8px;">Tumpahan & Remediasi</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                <div style="background:var(--bg3);padding:8px;border-radius:7px;text-align:center;border:1px solid var(--border);">
                  <div style="font-size:17px;font-weight:700;color:var(--orange);">15 kL</div>
                  <div style="font-size:9px;color:var(--text3);margin-top:1px;">Volume Aktif</div>
                </div>
                <div style="background:var(--bg3);padding:8px;border-radius:7px;text-align:center;border:1px solid var(--border);">
                  <div id="hse-remed-pct" style="font-size:17px;font-weight:700;color:var(--yellow);">68%</div>
                  <div style="font-size:9px;color:var(--text3);margin-top:1px;">Remediasi</div>
                </div>
              </div>
              <div style="font-size:9.5px;color:var(--text2);margin-bottom:5px;">Progress — RU VI Balongan</div>
              <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;">
                <div id="hse-remed-bar" style="height:100%;width:68%;background:linear-gradient(90deg,#f5a623,#00d4a0);border-radius:4px;transition:width 1.2s ease;"></div>
              </div>
              <div style="font-size:9px;color:var(--text3);margin-top:4px;">Target selesai: 5 Mei 2026 · Tim OSRL aktif</div>
            </div>
          </div>

          <!-- Safety Score per Site -->
          <div class="card" style="flex-shrink:0;padding:12px;">
            <div class="card-title" style="margin-bottom:8px;">
              <span class="card-title-dot" style="background:var(--blue);box-shadow:var(--glow-blue);"></span>
              SAFETY SCORE — SITE
            </div>
            ${SITES.map(s => `
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;">
              <div style="width:62px;font-size:9.5px;color:var(--text2);flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.short}</div>
              <div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${s.comply}%;background:${s.comply>=95?'#00d4a0':s.comply>=90?'#00c8ff':'#f5a623'};border-radius:3px;"></div>
              </div>
              <div style="font-size:10px;font-weight:700;color:${s.comply>=95?'#00d4a0':s.comply>=90?'#00c8ff':'#f5a623'};width:30px;text-align:right;">${s.comply}%</div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- ── Bottom Charts ─────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;height:120px;">

        <div class="card" style="padding:10px;overflow:hidden;">
          <div class="card-title" style="margin-bottom:5px;"><span class="card-title-dot"></span>LTIF TREND — 12 BULAN</div>
          <div style="height:76px;position:relative;"><canvas id="hse-chart-ltif"></canvas></div>
        </div>

        <div class="card" style="padding:10px;overflow:hidden;">
          <div class="card-title" style="margin-bottom:5px;"><span class="card-title-dot" style="background:#f5a623;"></span>INSIDEN PER KATEGORI (YTD)</div>
          <div style="height:76px;position:relative;"><canvas id="hse-chart-cat"></canvas></div>
        </div>

        <div class="card" style="padding:10px;overflow:hidden;">
          <div class="card-title" style="margin-bottom:5px;"><span class="card-title-dot" style="background:#00d4a0;box-shadow:var(--glow-green);"></span>COMPLIANCE RATE PER SITE</div>
          <div style="height:76px;position:relative;"><canvas id="hse-chart-comp"></canvas></div>
        </div>
      </div>
    </div>
    `;
  }

  /* ── CHARTS ────────────────────────────────────────────────── */
  function initCharts() {
    const sparkCfg = [
      { id:'ltif', base:0.42, v:0.12, col:'#00d4a0' },
      { id:'nm',   base:12,   v:0.18, col:'#f5a623' },
      { id:'comp', base:94.7, v:0.01, col:'#1a7fe8' },
      { id:'dwl',  base:18,   v:0.08, col:'#ff7b00' },
      { id:'co2',  base:847,  v:0.04, col:'#00c8ff' },
      { id:'ptw',  base:234,  v:0.06, col:'#a855f7' },
    ];
    sparkCfg.forEach(s => {
      charts[`spk_${s.id}`] = u().sparkline(`hse-spk-${s.id}`, u().timeSeries(20, s.base, s.v), s.col);
    });

    // LTIF Trend - 12 months downward trend
    const months = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','Mei'];
    const ltifVals = [0.81,0.74,0.68,0.71,0.65,0.58,0.62,0.55,0.50,0.47,0.44,0.42];
    charts.ltif = u().lineChart('hse-chart-ltif', months, [{
      label: 'LTIF',
      data: ltifVals,
      borderColor: '#00d4a0',
      backgroundColor: 'rgba(0,212,160,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 1.5,
    }], { beginAtZero: true, legend: { display: false } });

    // Incident by Category
    charts.cat = u().miniBar(
      'hse-chart-cat',
      ['Kebakaran','Tumpahan','Gas Leak','Kecelakaan','Near Miss'],
      [3, 5, 4, 7, 12],
      ['#ff4055','#f5a623','#a855f7','#00c8ff','#00d4a0']
    );

    // Compliance by Site
    charts.comp = u().miniBar(
      'hse-chart-comp',
      SITES.map(s => s.short),
      SITES.map(s => s.comply),
      SITES.map(s => s.comply >= 95 ? '#00d4a0' : s.comply >= 90 ? '#00c8ff' : '#f5a623')
    );
  }

  /* ── MAP ───────────────────────────────────────────────────── */
  function initMap() {
    const el = document.getElementById('hse-map');
    if (!el || maps.main) return;

    maps.main = L.map('hse-map', { zoomControl: false, attributionControl: false }).setView([-2, 118], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 14 }).addTo(maps.main);

    // Site base markers
    SITES.forEach(s => {
      const coords = SITE_COORDS[s.name];
      if (!coords) return;
      L.circleMarker(coords, {
        radius: 6,
        color: '#2a5298',
        fillColor: s.active ? '#ff4055' : '#1a7fe8',
        fillOpacity: 0.75,
        weight: 1.5,
      })
        .addTo(maps.main)
        .bindPopup(
          `<div style="font-family:Inter,sans-serif;min-width:160px;">
             <div style="font-weight:700;color:#111827;margin-bottom:4px;">${s.name}</div>
             <div style="color:#4b5563;font-size:11px;">LTIF: <b style="color:${s.ltif<0.3?'#059669':'#d97706'}">${s.ltif}</b></div>
             <div style="color:#4b5563;font-size:11px;">Days Without LTI: <b style="color:#111827">${s.days}</b></div>
             <div style="color:#4b5563;font-size:11px;">Compliance: <b style="color:${s.comply>=95?'#059669':s.comply>=90?'#0284c7':'#d97706'}">${s.comply}%</b></div>
           </div>`
        );
    });

    // Incident markers
    incMarkers.length = 0;
    INCIDENTS.forEach((inc, idx) => {
      const color = ITYPE_COLOR[inc.type] || '#8095be';
      const size  = inc.sev === 'KRITIS' ? 20 : 14;
      const pulse = inc.sts === 'AKTIF';

      const html = `
        <div style="position:relative;width:${size}px;height:${size}px;">
          ${pulse ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.25;animation:hse-ring 1.8s ease-out infinite;"></div>` : ''}
          <div style="position:absolute;inset:${size>14?3:2}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color};"></div>
        </div>`;

      const marker = L.marker([inc.lat, inc.lng], {
        icon: L.divIcon({ html, className: '', iconAnchor: [size/2, size/2] }),
        zIndexOffset: inc.sev === 'KRITIS' ? 1000 : 0,
      })
        .addTo(maps.main)
        .bindPopup(
          `<div style="font-family:Inter,sans-serif;min-width:190px;">
             <div style="font-weight:700;color:${color};margin-bottom:4px;">${inc.type}</div>
             <div style="font-weight:600;color:#111827;margin-bottom:3px;">${inc.site}</div>
             <div style="color:#4b5563;font-size:11px;margin-bottom:3px;">${inc.loc} · ${inc.time} WIB</div>
             <div style="color:${color};font-size:11px;font-weight:600;margin-bottom:6px;">${inc.sev} · ${inc.sts}</div>
             <div style="color:#374151;font-size:10.5px;line-height:1.4;">${inc.desc}</div>
           </div>`
        );

      incMarkers.push(marker);
    });
  }

  /* ── WINDOW HANDLERS ───────────────────────────────────────── */
  window._hseInc = function(idx) {
    selIdx = idx;
    document.querySelectorAll('.hse-inc-row').forEach((row, i) => {
      row.style.background = i === idx ? 'rgba(26,127,232,0.12)' : '';
      const isCrit = INCIDENTS[i].sev === 'KRITIS';
      row.style.borderLeft = i === idx
        ? '3px solid #1a7fe8'
        : (isCrit ? '3px solid rgba(255,64,85,0.5)' : '');
    });
    if (maps.main && incMarkers[idx]) {
      const inc = INCIDENTS[idx];
      maps.main.flyTo([inc.lat, inc.lng], 9, { duration: 1.0 });
      setTimeout(() => { if (incMarkers[idx]) incMarkers[idx].openPopup(); }, 1100);
    }
  };

  /* ── LIVE UPDATES ──────────────────────────────────────────── */
  function startUpdates() {
    let remedPct = 68;
    intervals.push(setInterval(() => {
      remedPct = Math.min(75, remedPct + u().rand(0, 0.15));
      const bar = document.getElementById('hse-remed-bar');
      const pct = document.getElementById('hse-remed-pct');
      if (bar) bar.style.width = remedPct.toFixed(1) + '%';
      if (pct) pct.textContent = remedPct.toFixed(0) + '%';
    }, 3000));
  }

  /* ── LIFECYCLE ─────────────────────────────────────────────── */
  function init() {
    const c = document.getElementById('dash-hse');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => {
      initCharts();
      initMap();
      startUpdates();
    }, 80);
  }

  function destroy() {
    intervals.forEach(clearInterval);
    intervals = [];
    Object.values(charts).forEach(ch => { try { ch.destroy(); } catch(e){} });
    charts = {};
    if (maps.main) { maps.main.remove(); maps.main = null; }
    incMarkers.length = 0;
  }

  return { init, destroy };
})();
