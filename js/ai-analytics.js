/* ============================================================
   PERTAMINA NECC — Dashboard 8: AI Analytics
   Tabs: Leak Detection | Demand Forecast | Fraud Detection | Subsidi BBM | Predictive Maintenance | ESG & Carbon
   ============================================================ */

window.DashAI = (() => {
  let charts     = {};
  let maps       = {};
  let intervals  = [];
  let done       = { leak:false, demand:false, fraud:false, subsidi:false, maint:false, esg:false };
  let currentTab = 'leak';
  let selSpbu    = 0;
  let selAsset   = 0;
  let sfuel      = 'pertalite';

  /* ── DATA ─────────────────────────────────────────────────── */
  const ALERTS = [
    { name:'Pipeline Trans-Sulawesi', loc:'KM 124 · Sulawesi Tengah',  dp:30.2, sev:'KRITIS', sts:'AKTIF',         ai:97.3, risk:94, lat:-1.4, lng:122.0 },
    { name:'Trans-Sumatra Selatan',   loc:'KM 210 · Lampung Utara',    dp:4.8,  sev:'SEDANG', sts:'INVESTIGASI',   ai:72.1, risk:45, lat:-4.8, lng:105.2 },
    { name:'Trans-Sumatra Tengah',    loc:'KM 387 · Riau Daratan',     dp:1.3,  sev:'RENDAH', sts:'INVESTIGASI',   ai:48.6, risk:32, lat: 0.5, lng:101.5 },
    { name:'Trans-Jawa Tengah',       loc:'KM 185 · Purwokerto',       dp:0.8,  sev:'RENDAH', sts:'FALSE POSITIVE',ai:31.2, risk:28, lat:-7.4, lng:109.2 },
    { name:'Trans-Jawa Timur',        loc:'KM 302 · Surabaya',         dp:0.5,  sev:'RENDAH', sts:'NORMAL',        ai:18.4, risk:22, lat:-7.3, lng:112.7 },
  ];
  const ROUTES = [
    { pts:[[-1.9,122.0],[-1.4,122.0],[-0.8,121.5],[0.5,121.0],[1.4,124.8]], col:'#ff4055' },
    { pts:[[-5.5,105.3],[-4.8,105.2],[-3.0,104.5],[-2.0,103.8],[-1.0,102.7]], col:'#f5a623' },
    { pts:[[-2.0,103.8],[-0.5,102.0],[0.5,101.5],[1.5,100.3],[2.5,99.2]], col:'#f5a623' },
    { pts:[[-6.2,106.8],[-6.5,107.5],[-7.0,108.5],[-7.4,109.2],[-7.3,112.7]], col:'#00d4a0' },
    { pts:[[1.0,109.3],[1.5,110.5],[0.5,111.8],[0.0,113.2],[-1.0,114.5]], col:'#00d4a0' },
  ];
  const DESCS = [
    'Penurunan tekanan drastis 30.2 bar dalam 8 menit. AI mendeteksi pola kebocoran kategori besar. Isolasi segmen KM 120–130 disarankan segera.',
    'Penurunan tekanan 4.8 bar di segmen KM 210. Kemungkinan kebocoran minor. Pemantauan lanjutan diperlukan.',
    'Penurunan tekanan minor 1.3 bar. Kemungkinan fluktuasi operasional normal. Investigasi awal dimulai.',
    'Anomali tekanan kecil — probabilitas false positive tinggi. Sensor KM 185 perlu kalibrasi ulang.',
    'Tekanan dalam batas normal. Tidak ada indikasi kebocoran. Monitoring rutin.',
  ];
  const SPBU = [
    { name:'SPBU Jl. Gatot Subroto No.12', code:'14.201.04', prov:'Sumatra Utara',    city:'Medan',          vol:'84.2K L', loss:'Rp 126Jt', flags:['Volume anomali','Meter rusak','Stempel palsu'],            sts:'TERKONFIRMASI', risk:91, lvl:'KRITIS', bukti:7, tgl:'2026-04-29' },
    { name:'SPBU Jl. Diponegoro No.47',    code:'14.215.11', prov:'Sumatra Utara',    city:'Deli Serdang',   vol:'61.0K L', loss:'Rp 91Jt',  flags:['Transaksi ID berulang','Volume anomali'],                   sts:'INVESTIGASI',   risk:84, lvl:'KRITIS', bukti:5, tgl:'2026-04-28' },
    { name:'SPBU Jl. Ahmad Yani No.3',     code:'14.218.07', prov:'Sumatra Utara',    city:'Binjai',         vol:'43.5K L', loss:'Rp 65Jt',  flags:['Harga tidak sesuai','Volume anomali'],                      sts:'INVESTIGASI',   risk:78, lvl:'TINGGI', bukti:4, tgl:'2026-04-27' },
    { name:'SPBU Jl. Soekarno-Hatta No.88',code:'31.403.21',prov:'DKI Jakarta',      city:'Jakarta Selatan',vol:'28.0K L', loss:'Rp 42Jt',  flags:['Transaksi ID berulang','Jam operasi mencurigakan'],         sts:'TERFLAG',       risk:67, lvl:'TINGGI', bukti:3, tgl:'2026-04-26' },
    { name:'SPBU Jl. Raya Ciputat No.14',  code:'31.408.05', prov:'DKI Jakarta',     city:'Jakarta Timur',  vol:'19.4K L', loss:'Rp 29Jt',  flags:['Volume anomali'],                                           sts:'TERFLAG',       risk:55, lvl:'SEDANG', bukti:2, tgl:'2026-04-25' },
    { name:'SPBU Jl. Raya Bogor No.201',   code:'32.104.18', prov:'Jawa Barat',      city:'Bogor',          vol:'15.2K L', loss:'Rp 23Jt',  flags:['Harga tidak sesuai'],                                       sts:'TERFLAG',       risk:48, lvl:'SEDANG', bukti:2, tgl:'2026-04-24' },
    { name:'SPBU Jl. Veteran No.55',       code:'35.201.09', prov:'Jawa Timur',      city:'Surabaya',       vol:'8.8K L',  loss:'Rp 13Jt',  flags:['Meter rusak'],                                              sts:'TERFLAG',       risk:38, lvl:'RENDAH', bukti:1, tgl:'2026-04-23' },
    { name:'SPBU Jl. Sam Ratulangi No.9',  code:'73.101.03', prov:'Sulawesi Selatan',city:'Makassar',       vol:'5.1K L',  loss:'Rp 8Jt',   flags:['Volume anomali'],                                           sts:'INVESTIGASI',   risk:29, lvl:'RENDAH', bukti:1, tgl:'2026-04-22' },
    { name:'SPBU Jl. Urip Sumoharjo No.77',code:'73.105.14',prov:'Sulawesi Selatan', city:'Makassar',       vol:'—',       loss:'—',         flags:[],                                                           sts:'BERSIH',        risk:12, lvl:'BERSIH', bukti:0, tgl:'2026-04-21' },
  ];
  const PROV = [
    { name:'Sumatra Utara',   abbr:'Smtr Utara',  spbu:892,  pop:'14.799K', pert:107.3, sol:104.5, tot:106.1, over:true  },
    { name:'DKI Jakarta',     abbr:'DKI Jakarta', spbu:684,  pop:'10.562K', pert:105.8, sol:103.4, tot:104.8, over:true  },
    { name:'Sulawesi Selatan',abbr:'Sul Selatan', spbu:468,  pop:'9.073K',  pert:97.1,  sol:95.0,  tot:96.2,  over:false },
    { name:'Jawa Tengah',     abbr:'Jawa Tengah', spbu:1580, pop:'36.517K', pert:95.3,  sol:93.1,  tot:94.4,  over:false },
    { name:'Jawa Barat',      abbr:'Jawa Barat',  spbu:2100, pop:'49.935K', pert:98.7,  sol:96.2,  tot:97.6,  over:false },
    { name:'Kal. Selatan',    abbr:'Kal Selatan', spbu:312,  pop:'4.235K',  pert:84.2,  sol:82.1,  tot:83.3,  over:false },
    { name:'Kal. Timur',      abbr:'Kal Timur',   spbu:287,  pop:'3.981K',  pert:78.5,  sol:76.3,  tot:77.5,  over:false },
    { name:'Riau',            abbr:'Riau',        spbu:543,  pop:'6.801K',  pert:91.4,  sol:89.7,  tot:90.7,  over:false },
    { name:'Sumatra Selatan', abbr:'Smtr Selatan',spbu:621,  pop:'8.476K',  pert:88.3,  sol:85.4,  tot:87.1,  over:false },
    { name:'Papua',           abbr:'Papua',       spbu:198,  pop:'4.303K',  pert:72.1,  sol:68.4,  tot:70.5,  over:false },
    { name:'Jawa Timur',      abbr:'Jawa Timur',  spbu:1950, pop:'40.665K', pert:102.4, sol:99.8,  tot:101.3, over:false },
    { name:'Sul. Tengah',     abbr:'Sul Tengah',  spbu:234,  pop:'3.025K',  pert:79.6,  sol:77.1,  tot:78.5,  over:false },
  ];

  const ASSETS = [
    { id:'PMP-001', name:'Pompa Sentrifugal P-101',      site:'RU IV Cilacap',        type:'Pump',       health:23, days:3,  status:'KRITIS',  fail:0.87, lastMaint:'2026-03-15', nextSched:'2026-05-10' },
    { id:'CMP-002', name:'Kompresor K-201',               site:'RU V Balikpapan',      type:'Compressor', health:61, days:18, status:'WARNING', fail:0.41, lastMaint:'2026-04-01', nextSched:'2026-06-01' },
    { id:'HEX-003', name:'Heat Exchanger E-301',          site:'RU II Dumai',          type:'HEX',        health:78, days:32, status:'NORMAL',  fail:0.18, lastMaint:'2026-03-20', nextSched:'2026-06-20' },
    { id:'PMP-004', name:'Pompa Booster P-412',           site:'Terminal Plaju',       type:'Pump',       health:45, days:8,  status:'WARNING', fail:0.62, lastMaint:'2026-04-10', nextSched:'2026-05-15' },
    { id:'TRB-005', name:'Turbin Gas GT-101',             site:'RU VI Balongan',       type:'Turbine',    health:87, days:45, status:'NORMAL',  fail:0.09, lastMaint:'2026-04-15', nextSched:'2026-07-15' },
    { id:'CMP-006', name:'Kompresor K-302',               site:'RU I Pang. Brandan',   type:'Compressor', health:38, days:6,  status:'KRITIS',  fail:0.81, lastMaint:'2026-02-28', nextSched:'2026-05-05' },
    { id:'PMP-007', name:'Pompa Injection P-201',         site:'RU IV Cilacap',        type:'Pump',       health:72, days:25, status:'NORMAL',  fail:0.22, lastMaint:'2026-04-05', nextSched:'2026-06-05' },
    { id:'VLV-008', name:'Control Valve CV-501',          site:'RU V Balikpapan',      type:'Valve',      health:55, days:14, status:'WARNING', fail:0.48, lastMaint:'2026-03-25', nextSched:'2026-05-25' },
    { id:'HEX-009', name:'Air Cooler A-101',              site:'RU VI Balongan',       type:'HEX',        health:91, days:60, status:'NORMAL',  fail:0.07, lastMaint:'2026-04-20', nextSched:'2026-07-20' },
    { id:'TRB-010', name:'Steam Turbine ST-201',          site:'RU II Dumai',          type:'Turbine',    health:67, days:22, status:'NORMAL',  fail:0.28, lastMaint:'2026-04-12', nextSched:'2026-06-12' },
    { id:'PMP-011', name:'Crude Charge Pump CP-101',      site:'Terminal Plaju',       type:'Pump',       health:31, days:5,  status:'KRITIS',  fail:0.84, lastMaint:'2026-03-10', nextSched:'2026-05-08' },
    { id:'CMP-012', name:'Gas Compressor GC-401',         site:'RU I Pang. Brandan',   type:'Compressor', health:82, days:38, status:'NORMAL',  fail:0.13, lastMaint:'2026-04-18', nextSched:'2026-07-18' },
  ];
  const MAINT_SCHED = [
    { asset:'CMP-006 · Kompresor K-302',         site:'RU I Pang. Brandan', date:'05 Mei 2026', type:'Predictive', priority:'URGENT' },
    { asset:'PMP-011 · Crude Charge Pump CP-101',site:'Terminal Plaju',     date:'08 Mei 2026', type:'Predictive', priority:'URGENT' },
    { asset:'PMP-001 · Pompa Sentrifugal P-101', site:'RU IV Cilacap',      date:'10 Mei 2026', type:'Scheduled',  priority:'HIGH'   },
    { asset:'PMP-004 · Pompa Booster P-412',     site:'Terminal Plaju',     date:'15 Mei 2026', type:'Scheduled',  priority:'MEDIUM' },
    { asset:'VLV-008 · Control Valve CV-501',    site:'RU V Balikpapan',    date:'25 Mei 2026', type:'Scheduled',  priority:'MEDIUM' },
  ];
  const FACILITIES_ESG = [
    { name:'RU IV Cilacap',        s1:142.3, s2:45.1, intensity:18.4, target:140, renew:8  },
    { name:'RU V Balikpapan',      s1:128.7, s2:38.6, intensity:16.2, target:125, renew:12 },
    { name:'RU VI Balongan',       s1:98.4,  s2:31.2, intensity:14.8, target:100, renew:15 },
    { name:'RU II Dumai',          s1:87.1,  s2:28.4, intensity:15.1, target:85,  renew:10 },
    { name:'Bontang LNG',          s1:62.4,  s2:22.5, intensity:9.8,  target:60,  renew:25 },
    { name:'Terminal Plaju',       s1:45.2,  s2:18.3, intensity:11.2, target:45,  renew:20 },
    { name:'RU I Pang. Brandan',   s1:32.8,  s2:14.1, intensity:12.6, target:32,  renew:18 },
  ];

  /* ── Helpers ─────────────────────────────────────────────── */
  const hc  = h => h>=70?'#00d4a0':h>=40?'#f5a623':'#ff4055';
  const pc  = p => ({URGENT:'#ff4055',HIGH:'#f5a623',MEDIUM:'#00c8ff',LOW:'#00d4a0'})[p]||'#8095be';
  const rc  = r => r>=80?'#ff4055':r>=60?'#f5a623':r>=40?'#f5c842':'#00d4a0';
  const sc2 = s => ({TERKONFIRMASI:'#ff4055',INVESTIGASI:'#f5a623',TERFLAG:'#f5c842',BERSIH:'#00d4a0',AKTIF:'#ff4055','FALSE POSITIVE':'#4a5f82',NORMAL:'#00d4a0'}[s]||'#8095be');
  const svc = s => ({KRITIS:'#ff4055',SEDANG:'#f5a623',RENDAH:'#1a7fe8'}[s]||'#8095be');
  const p2  = n => String(n).padStart(2,'0');
  const KPI = (label, val, color, sub) => `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px 16px"><div style="font-size:11px;color:var(--text2);margin-bottom:6px;font-weight:500">${label}</div><div style="font-size:28px;font-weight:700;color:${color};line-height:1">${val}</div>${sub?`<div style="font-size:10px;color:var(--text3);margin-top:3px">${sub}</div>`:''}</div>`;

  /* ════════════════════════════════════════════════════════════
     HTML PANELS (all rendered once at init)
  ════════════════════════════════════════════════════════════ */

  function renderLeak() {
    return `
    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex-shrink:0">
      ${KPI('Alert Aktif','1','#ff4055')}
      ${KPI('Pipeline Kritis','1','#ff4055')}
      ${KPI('Avg Risk Score','33','#f5a623')}
      ${KPI('AI Confidence','97%','#1a7fe8')}
    </div>
    <!-- Map + Alerts -->
    <div style="display:grid;grid-template-columns:1fr 370px;gap:10px;flex:1.4;min-height:0">
      <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
        <div style="display:flex;gap:16px;padding:8px 12px;font-size:11px;color:var(--text2);flex-shrink:0">
          ${[['#00d4a0','Normal'],['#f5a623','Warning'],['#ff4055','Critical'],['#4a5f82','Shutdown']].map(([c,l])=>`<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:4px;vertical-align:middle"></span>${l}</span>`).join('')}
        </div>
        <div id="leak-map" style="flex:1;min-height:0"></div>
      </div>
      <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px;border-bottom:1px solid var(--border);flex-shrink:0">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:#ff4055;display:inline-block;box-shadow:0 0 6px #ff4055;animation:ai-pulse 1.4s ease-in-out infinite"></span>
            LEAK ALERTS
          </span>
          <span style="font-size:10px;color:var(--text3)">AI Model v2.4 — <span style="color:#00d4a0;font-weight:600">ACTIVE</span></span>
        </div>
        <div style="flex:1;overflow-y:auto">
          ${ALERTS.map((a,i)=>`
          <div class="leak-alert-row" onclick="window._aiLeak(${i})" id="leak-row-${i}" style="padding:11px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;${i===0?'background:rgba(255,64,85,0.07);border-left:3px solid #ff4055':''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:8px;height:8px;border-radius:50%;background:${svc(a.sev)};display:inline-block;flex-shrink:0"></span>
                <strong class="alert-name" style="font-size:12px;color:var(--text0)">${a.name}</strong>
              </div>
              <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${svc(a.sev)}22;color:${svc(a.sev)};border:1px solid ${svc(a.sev)}44">${a.sev}</span>
            </div>
            <div style="font-size:11px;color:var(--text2);margin:3px 0 3px 14px">${a.loc}</div>
            <div style="display:flex;justify-content:space-between;margin-left:14px">
              <span style="font-size:11px;font-weight:600;color:#ff4055">ΔP: -${a.dp} bar</span>
              <span class="sts-badge" style="font-size:10px;font-weight:600;color:${sc2(a.sts)}">${a.sts}</span>
              <span style="font-size:10px;color:var(--text3)">AI: ${a.ai}%</span>
            </div>
            ${a.sts !== 'NORMAL' && a.sts !== 'FALSE POSITIVE' ? `
            <div class="alert-act-row" style="margin-left:14px;">
              <button class="alert-act-btn" data-action="investigate" onclick="window._alertAct('investigate',this);event.stopPropagation()">Investigate</button>
              <button class="alert-act-btn" data-action="ack"         onclick="window._alertAct('ack',this);event.stopPropagation()">Acknowledge</button>
              <button class="alert-act-btn" data-action="escalate"    onclick="window._alertAct('escalate',this);event.stopPropagation()">Escalate</button>
            </div>` : ''}
          </div>`).join('')}
        </div>
      </div>
    </div>
    <!-- Bottom -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;height:190px;flex-shrink:0">
      <div class="card" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.8px">DETAIL ALERT</span>
          <span style="font-size:11px;color:var(--text2)">Terdeteksi: <span id="leak-clock" style="color:var(--blue);font-family:'JetBrains Mono',monospace"></span></span>
        </div>
        <p id="leak-desc" style="font-size:12px;color:var(--text1);line-height:1.65;margin-bottom:12px">${DESCS[0]}</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div style="background:var(--bg3);border-radius:8px;padding:9px 12px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">AI Confidence</div><div id="leak-ai" style="font-size:18px;font-weight:700;color:#1a7fe8">97.3%</div></div>
          <div style="background:var(--bg3);border-radius:8px;padding:9px 12px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">Pressure Drop</div><div id="leak-dp" style="font-size:18px;font-weight:700;color:#ff4055">30.2 bar</div></div>
          <div style="background:var(--bg3);border-radius:8px;padding:9px 12px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">KM Pipeline</div><div id="leak-km" style="font-size:18px;font-weight:700;color:#f5a623">KM 124</div></div>
        </div>
      </div>
      <div class="card" style="padding:14px;overflow-y:auto">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:12px">RISK SCORE PIPELINE</div>
        ${ALERTS.map((a,i)=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
          <span style="color:var(--text3);font-size:11px;width:14px;flex-shrink:0">${i+1}</span>
          <span style="flex:1;font-size:12px;color:var(--text1);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.name}</span>
          <div style="width:110px;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;flex-shrink:0">
            <div style="height:100%;width:${a.risk}%;background:${rc(a.risk)};border-radius:3px"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:${rc(a.risk)};width:26px;text-align:right;flex-shrink:0">${a.risk}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  function renderDemand() {
    return `
    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex-shrink:0">
      ${KPI('Demand Hari Ini','61.8K <span style="font-size:14px;font-weight:400;color:var(--text2)">KL</span>','#00d4a0')}
      ${KPI('Forecast Besok','62.8K <span style="font-size:14px;font-weight:400;color:var(--text2)">KL</span>','#1a7fe8')}
      ${KPI('Trend vs Kemarin','+1.6%','#f5a623')}
      ${KPI('Model Accuracy','94.7%','#a855f7')}
    </div>
    <!-- Chart -->
    <div class="card" style="flex:1;min-height:0;padding:14px;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0;flex-wrap:wrap;gap:8px">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a7fe8" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          PREDIKSI KEBUTUHAN BBM NASIONAL
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <div style="display:flex;gap:2px;background:var(--bg3);padding:3px;border-radius:7px">
            ${['Pertalite','Pertamax','Solar','Avtur'].map((f,i)=>`<button class="ai-dfbtn" data-f="${f.toLowerCase()}" onclick="window._aiDF('${f.toLowerCase()}')" style="padding:4px 10px;border:none;border-radius:5px;background:${i===0?'var(--bg4)':'transparent'};color:${i===0?'var(--text0)':'var(--text2)'};font-size:11px;font-family:inherit;cursor:pointer;font-weight:${i===0?'600':'400'};white-space:nowrap">${f}</button>`).join('')}
          </div>
          <div style="display:flex;gap:2px;background:var(--bg3);padding:3px;border-radius:7px">
            ${['7 Hari','30 Hari','Semua'].map((t,i)=>`<button class="ai-dtbtn" data-t="${t}" onclick="window._aiDT('${t}')" style="padding:4px 10px;border:none;border-radius:5px;background:${i===2?'var(--bg4)':'transparent'};color:${i===2?'var(--text0)':'var(--text2)'};font-size:11px;font-family:inherit;cursor:pointer;font-weight:${i===2?'600':'400'};white-space:nowrap">${t}</button>`).join('')}
          </div>
        </div>
      </div>
      <div style="flex:1;min-height:0;position:relative">
        <canvas id="demand-chart"></canvas>
        <div id="demand-today" style="position:absolute;top:0;bottom:20px;width:1px;background:rgba(255,255,255,0.15);pointer-events:none">
          <span style="position:absolute;top:0;left:4px;font-size:9px;color:var(--text3);white-space:nowrap">HARI INI</span>
        </div>
      </div>
      <div style="display:flex;gap:18px;margin-top:8px;flex-shrink:0;flex-wrap:wrap">
        ${[['#00d4a0','Data aktual'],['rgba(100,200,140,0.6)','— — Forecast'],['rgba(130,150,200,0.2)','Confidence interval (±90%)']].map(([c,l])=>`<span style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text2)"><span style="width:18px;height:3px;background:${c};display:inline-block;border-radius:2px"></span>${l}</span>`).join('')}
      </div>
    </div>
    <!-- Fuel dist -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex-shrink:0">
      ${[['Pertalite','#00d4a0','28.0K','+2.9%'],['Pertamax','#1a7fe8','8.2K','+2.5%'],['Solar','#f5a623','22.3K','+1.0%'],['Avtur','#a855f7','3.3K','-7.9%']].map(([n,c,v,t])=>`
      <div class="card" style="padding:14px 16px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block;flex-shrink:0"></span>
          <span style="font-size:13px;font-weight:600;color:var(--text0)">${n}</span>
        </div>
        <div style="font-size:26px;font-weight:700;color:var(--text0)">${v}K</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">Kiloliter / hari</div>
        <div style="font-size:12px;font-weight:600;margin-top:8px;color:${t.startsWith('+')?'#f5a623':'#ff4055'}">Forecast besok: ${t}</div>
      </div>`).join('')}
    </div>`;
  }

  function renderFraud() {
    return `
    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex-shrink:0">
      ${KPI('Fraud Terkonfirmasi','1','#ff4055')}
      ${KPI('Dalam Investigasi','3','#f5a623')}
      ${KPI('Volume Mencurigakan','265.2K <span style="font-size:13px;font-weight:400;color:var(--text2)">L</span>','#ff4055')}
      ${KPI('Est. Kerugian Negara','Rp 397 <span style="font-size:14px;font-weight:400;color:var(--text2)">Jt</span>','#ff4055')}
    </div>
    <!-- Table + Detail -->
    <div style="display:grid;grid-template-columns:1fr 310px;gap:10px;flex:1;min-height:0">
      <div class="card" style="padding:14px;display:flex;flex-direction:column;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;flex-shrink:0">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;display:flex;align-items:center;gap:6px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff4055" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            SPBU TERDETEKSI FRAUD
          </span>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${['semua','terkonfirmasi','investigasi','terflag','bersih'].map((f,i)=>`
            <button class="ai-fb" data-filter="${f}" onclick="window._aiFF('${f}')" style="padding:4px 10px;border:1px solid ${f==='semua'?'rgba(255,64,85,0.4)':'var(--border)'};border-radius:4px;background:${f==='semua'?'rgba(255,64,85,0.12)':'transparent'};color:${f==='semua'?'var(--text0)':'var(--text2)'};font-size:11px;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .15s">${['Semua','Terkonfirmasi','Investigasi','Terflag','Bersih'][i]}</button>`).join('')}
          </div>
        </div>
        <div style="flex:1;overflow-y:auto;min-height:0">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>${['Risk','Nama SPBU','Provinsi','Volume','Kerugian','Flag','Status'].map(h=>`<th style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg2)">${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${SPBU.map((s,i)=>`
              <tr class="ai-spbu-row" data-sts="${s.sts.toLowerCase()}" onclick="window._aiFS(${i})" style="cursor:pointer;transition:background .15s;${i===selSpbu?'background:rgba(26,127,232,0.1);outline:1px solid rgba(26,127,232,0.3);outline-offset:-1px':''}">
                <td style="padding:8px 10px">
                  <div style="width:46px;height:50px;border-radius:8px;border:1px solid ${rc(s.risk)}44;background:${rc(s.risk)}12;display:flex;flex-direction:column;align-items:center;justify-content:center">
                    <span style="font-size:15px;font-weight:700;color:${rc(s.risk)};line-height:1">${s.risk}</span>
                    <span style="font-size:9px;color:${rc(s.risk)};font-weight:600">${s.lvl}</span>
                  </div>
                </td>
                <td style="padding:8px 10px"><div style="font-size:12px;font-weight:500;color:var(--text0)">${s.name}</div><div style="font-size:10px;color:var(--text3)">${s.code}</div></td>
                <td style="padding:8px 10px"><div style="font-size:12px;color:var(--text1)">${s.prov}</div><div style="font-size:10px;color:var(--text3)">${s.city}</div></td>
                <td style="padding:8px 10px;font-size:12px;color:var(--text1)">${s.vol}</td>
                <td style="padding:8px 10px;font-size:12px;color:var(--text1)">${s.loss}</td>
                <td style="padding:8px 10px"><div style="display:flex;flex-wrap:wrap;gap:3px">
                  ${s.flags.slice(0,2).map(f=>`<span style="font-size:9px;padding:2px 5px;background:rgba(245,166,35,.12);color:#f5a623;border:1px solid rgba(245,166,35,.3);border-radius:3px;white-space:nowrap">${f}</span>`).join('')}
                  ${s.flags.length>2?`<span style="font-size:9px;padding:2px 5px;background:rgba(245,166,35,.12);color:#f5a623;border:1px solid rgba(245,166,35,.3);border-radius:3px">+${s.flags.length-2}</span>`:''}
                </div></td>
                <td style="padding:8px 10px"><span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;background:${sc2(s.sts)}20;color:${sc2(s.sts)};border:1px solid ${sc2(s.sts)}44;white-space:nowrap">${s.sts}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div id="fraud-detail" class="card" style="overflow-y:auto;padding:14px">${fraudDetail(SPBU[0])}</div>
    </div>`;
  }

  function fraudDetail(s) {
    return `
    <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:4px">DETAIL SPBU</div>
    <div style="font-size:14px;font-weight:600;color:var(--text0);margin-bottom:2px">${s.name}</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:16px">${s.code} · ${s.city}, ${s.prov}</div>
    <div style="position:relative;width:150px;margin:0 auto 14px">
      <canvas id="fraud-gauge" height="80"></canvas>
      <div style="position:absolute;bottom:2px;left:0;right:0;text-align:center">
        <div style="font-size:32px;font-weight:700;color:${rc(s.risk)};line-height:1">${s.risk}</div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:.5px">RISK SCORE</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${[['Bukti',s.bukti+' temuan'],['Aktivitas',s.tgl],['Volume',s.vol],['Est. Rugi',s.loss]].map(([l,v])=>`<div style="background:var(--bg3);border-radius:8px;padding:9px 12px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">${l}</div><div style="font-size:13px;font-weight:600;color:var(--text0)">${v}</div></div>`).join('')}
    </div>
    ${s.flags.length?`
    <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:8px">EVIDENCE FLAGS</div>
    <ul style="list-style:none;padding:0">${s.flags.map(f=>`<li style="font-size:12px;color:var(--text1);padding:5px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:7px"><span style="color:#ff4055;font-size:8px">●</span>${f}</li>`).join('')}</ul>`:`<div style="font-size:12px;color:var(--text3)">Tidak ada evidence flags</div>`}`;
  }

  function renderSubsidi() {
    return `
    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex-shrink:0">
      ${KPI('Realisasi Pertalite','95.4%','#00d4a0','16.04Jt dari 16.80Jt KL')}
      ${KPI('Realisasi Solar','94.6%','#f5a623','10.24Jt dari 10.82Jt KL')}
      ${KPI('Provinsi Over-Kuota','2','#ff4055','perlu perhatian')}
      ${KPI('Rata-rata Efisiensi','93%','#1a7fe8','semua provinsi')}
    </div>
    <!-- Chart + Detail -->
    <div style="display:grid;grid-template-columns:1fr 300px;gap:10px;flex:1;min-height:0">
      <div class="card" style="padding:14px;display:flex;flex-direction:column;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0;flex-wrap:wrap;gap:8px">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.8px">KUOTA VS REALISASI PER PROVINSI</span>
          <div style="display:flex;gap:2px;background:var(--bg3);padding:3px;border-radius:7px">
            ${['Pertalite','Solar','Total'].map((f,i)=>`<button class="ai-sfbtn" data-sf="${f.toLowerCase()}" onclick="window._aiSF('${f.toLowerCase()}')" style="padding:4px 10px;border:none;border-radius:5px;background:${i===0?'var(--bg4)':'transparent'};color:${i===0?'var(--text0)':'var(--text2)'};font-size:11px;font-family:inherit;cursor:pointer;font-weight:${i===0?'600':'400'};white-space:nowrap">${f}</button>`).join('')}
          </div>
        </div>
        <div style="flex:1;min-height:0"><canvas id="subsidi-chart"></canvas></div>
        <div style="display:flex;gap:14px;margin-top:8px;flex-shrink:0;flex-wrap:wrap">
          ${[['rgba(180,195,220,.3)','Kuota'],['#00d4a0','Normal (<85%)'],['#f5a623','Mendekati batas'],['#ff4055','Melebihi kuota']].map(([c,l])=>`<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><span style="width:12px;height:10px;border-radius:2px;background:${c};display:inline-block"></span>${l}</span>`).join('')}
        </div>
      </div>
      <div class="card" style="padding:14px;overflow-y:auto;display:flex;flex-direction:column">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:12px;flex-shrink:0">DETAIL PROVINSI</div>
        <div id="subsidi-detail" style="flex:1;overflow-y:auto">${renderProvDetail('pertalite')}</div>
      </div>
    </div>`;
  }

  function renderProvDetail(fuel) {
    return PROV.map(p => {
      const pt = fuel==='solar'?p.sol:fuel==='total'?p.tot:p.pert;
      const ps = fuel==='solar'?p.sol:p.sol;
      const pp = p.pert;
      return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
          <div>
            <div style="font-size:13px;font-weight:600;color:${p.over?'#f5a623':'var(--text0)'}">${p.name}</div>
            <div style="font-size:10px;color:var(--text3)">${p.spbu} SPBU · ${p.pop} jiwa</div>
          </div>
          ${p.over?'<span style="font-size:9px;font-weight:700;padding:2px 8px;background:rgba(255,64,85,.15);color:#ff4055;border:1px solid rgba(255,64,85,.3);border-radius:4px">OVER</span>':''}
        </div>
        <div style="margin-bottom:3px">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <span style="font-size:11px;color:var(--text2)">Pertalite</span>
            <span style="font-size:11px;font-weight:600;color:${pp>100?'#ff4055':pp>90?'#f5a623':'#00d4a0'}">${pp>100?'+':''}${(pp-100).toFixed(1)}%</span>
          </div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${Math.min(pp,112)/112*100}%;background:${pp>100?'#ff4055':pp>90?'#f5a623':'#00d4a0'};border-radius:2px;transition:width .8s ease"></div>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <span style="font-size:11px;color:var(--text2)">Solar</span>
            <span style="font-size:11px;font-weight:600;color:${ps>100?'#ff4055':ps>90?'#f5a623':'#00d4a0'}">${ps>100?'+':''}${(ps-100).toFixed(1)}%</span>
          </div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${Math.min(ps,112)/112*100}%;background:${ps>100?'#ff4055':ps>90?'#f5a623':'#00d4a0'};border-radius:2px;transition:width .8s ease"></div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  /* ── Predictive Maintenance ─────────────────────────────── */
  function getMaintRec(a) {
    if (a.status === 'KRITIS') return `Segera lakukan inspeksi darurat. Probabilitas kegagalan ${(a.fail*100).toFixed(0)}% — estimasi ${a.days} hari. Sarankan shutdown terencana sebelum ${a.nextSched}.`;
    if (a.status === 'WARNING') return `Percepat jadwal maintenance. Pantau ${a.type.toLowerCase()} setiap 6 jam dan siapkan spare part untuk ${a.id}.`;
    return `Kondisi normal. Lanjutkan monitoring rutin. Maintenance berikutnya dijadwalkan ${a.nextSched}.`;
  }

  function maintDetail(a) {
    return `
    <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:4px">ASSET DETAIL</div>
    <div style="font-size:13px;font-weight:600;color:var(--text0);margin-bottom:2px">${a.name}</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:14px">${a.id} · ${a.site}</div>
    <div style="position:relative;width:150px;margin:0 auto 14px">
      <canvas id="maint-gauge" height="80"></canvas>
      <div style="position:absolute;bottom:2px;left:0;right:0;text-align:center">
        <div style="font-size:30px;font-weight:700;color:${hc(a.health)};line-height:1">${a.health}</div>
        <div style="font-size:10px;color:var(--text3);letter-spacing:.5px">HEALTH SCORE</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--bg3);border-radius:8px;padding:9px 12px">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">Failure Prob.</div>
        <div style="font-size:20px;font-weight:700;color:${a.fail>=.7?'#ff4055':a.fail>=.4?'#f5a623':'#00d4a0'}">${(a.fail*100).toFixed(0)}%</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:9px 12px">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">Hari ke Maint.</div>
        <div style="font-size:20px;font-weight:700;color:${a.days<=7?'#ff4055':a.days<=20?'#f5a623':'#00d4a0'}">~${a.days}h</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:9px 12px">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">Last Maint.</div>
        <div style="font-size:11px;font-weight:600;color:var(--text0)">${a.lastMaint}</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:9px 12px">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">Next Sched.</div>
        <div style="font-size:11px;font-weight:600;color:var(--text0)">${a.nextSched}</div>
      </div>
    </div>
    <div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.25);border-radius:8px;padding:10px 12px">
      <div style="font-size:10px;font-weight:700;color:#a855f7;letter-spacing:.5px;margin-bottom:5px">AI RECOMMENDATION</div>
      <div style="font-size:11px;color:var(--text1);line-height:1.65">${getMaintRec(a)}</div>
    </div>`;
  }

  function renderMaint() {
    const critCount = ASSETS.filter(a => a.status === 'KRITIS').length;
    const warnCount = ASSETS.filter(a => a.status === 'WARNING').length;
    const avgHealth = Math.round(ASSETS.reduce((s,a) => s + a.health, 0) / ASSETS.length);
    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex-shrink:0">
      ${KPI('Fleet Health Score', avgHealth+'<span style="font-size:14px;font-weight:400;color:var(--text2)">%</span>', hc(avgHealth), '12 aset dipantau')}
      ${KPI('Aset Kritis', String(critCount), '#ff4055', 'tindakan segera diperlukan')}
      ${KPI('Perlu Perhatian', String(warnCount), '#f5a623', 'percepat jadwal')}
      ${KPI('Jadwal Maint.', '5', '#1a7fe8', '30 hari ke depan')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 290px;gap:10px;flex:1;min-height:0">
      <div class="card" style="padding:14px;display:flex;flex-direction:column;overflow:hidden">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:10px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center">
          <span style="display:flex;align-items:center;gap:6px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            ASSET HEALTH MONITOR
          </span>
          <span style="font-size:10px;color:var(--text3)">AI Model v3.1 — <span style="color:#a855f7;font-weight:600">ACTIVE</span></span>
        </div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start">
          ${ASSETS.map((a,i) => `
          <div onclick="window._aiAsset(${i})" id="ai-asset-${i}" style="padding:10px 12px;border-radius:8px;background:var(--bg3);border:1px solid ${i===0?'rgba(168,85,247,.5)':'var(--border)'};cursor:pointer;transition:all .15s;${i===0?'box-shadow:0 0 0 1px rgba(168,85,247,.25);':''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
              <div>
                <div style="font-size:11px;font-weight:700;color:var(--text0)">${a.id}</div>
                <div style="font-size:10px;color:var(--text3);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.name}</div>
              </div>
              <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;background:${hc(a.health)}20;color:${hc(a.health)};border:1px solid ${hc(a.health)}40;flex-shrink:0">${a.status}</span>
            </div>
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
              <div style="flex:1;height:5px;background:var(--bg2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${a.health}%;background:${hc(a.health)};border-radius:3px"></div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${hc(a.health)};min-width:26px;text-align:right">${a.health}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:10px;color:var(--text3)">${a.type}</span>
              <span style="font-size:10px;font-weight:600;color:${a.days<=7?'#ff4055':a.days<=20?'#f5a623':'var(--text3)'}">~${a.days}h</span>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div id="maint-detail" class="card" style="padding:14px;overflow-y:auto">${maintDetail(ASSETS[0])}</div>
    </div>
    <div style="height:170px;flex-shrink:0">
      <div class="card" style="height:100%;padding:12px 14px;overflow:hidden;display:flex;flex-direction:column">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:8px;flex-shrink:0;display:flex;justify-content:space-between">
          <span>JADWAL MAINTENANCE — 30 HARI KE DEPAN</span>
          <span style="font-size:10px;color:var(--text3);font-weight:400">2 Predictive · 3 Scheduled</span>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:5px">
          ${MAINT_SCHED.map(m => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;background:${pc(m.priority)}20;color:${pc(m.priority)};border:1px solid ${pc(m.priority)}40;white-space:nowrap;flex-shrink:0">${m.priority}</span>
            <span style="font-size:9px;padding:2px 6px;border-radius:3px;background:${m.type==='Predictive'?'rgba(168,85,247,.12)':'rgba(26,127,232,.12)'};color:${m.type==='Predictive'?'#a855f7':'#1a7fe8'};border:1px solid ${m.type==='Predictive'?'rgba(168,85,247,.3)':'rgba(26,127,232,.3)'};white-space:nowrap;flex-shrink:0">${m.type}</span>
            <span style="flex:1;font-size:11px;color:var(--text1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.asset}</span>
            <span style="font-size:11px;color:var(--text2);white-space:nowrap;flex-shrink:0">${m.site}</span>
            <span style="font-size:11px;font-weight:600;color:var(--text0);white-space:nowrap;flex-shrink:0;min-width:90px;text-align:right">${m.date}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  /* ── ESG & Carbon ────────────────────────────────────────── */
  function renderESG() {
    const totalS1 = FACILITIES_ESG.reduce((s,f) => s+f.s1, 0);
    const totalS2 = FACILITIES_ESG.reduce((s,f) => s+f.s2, 0);
    const totalEmisi = (totalS1 + totalS2).toFixed(0);
    const avgIntensity = (FACILITIES_ESG.reduce((s,f) => s+f.intensity, 0) / FACILITIES_ESG.length).toFixed(1);
    const avgRenew = (FACILITIES_ESG.reduce((s,f) => s+f.renew, 0) / FACILITIES_ESG.length).toFixed(1);
    const ghgPct = ((1 - (totalS1+totalS2) / 750) * 100).toFixed(1);
    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;flex-shrink:0">
      ${KPI('Total Emisi Scope 1+2', totalEmisi+'<span style="font-size:13px;font-weight:400;color:var(--text2)"> kt CO₂e</span>', '#f5a623', `S1: ${totalS1.toFixed(0)} · S2: ${totalS2.toFixed(0)} kt`)}
      ${KPI('Carbon Intensity', avgIntensity+'<span style="font-size:13px;font-weight:400;color:var(--text2)"> kg/BOE</span>', '#00c8ff', 'avg semua fasilitas')}
      ${KPI('Renewable Share', avgRenew+'<span style="font-size:14px;font-weight:400;color:var(--text2)">%</span>', '#00d4a0', 'dari total konsumsi')}
      ${KPI('GHG Reduksi vs Baseline', ghgPct+'<span style="font-size:14px;font-weight:400;color:var(--text2)">%</span>', '#a855f7', 'menuju target 2030')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1;min-height:0">
      <div class="card" style="padding:14px;display:flex;flex-direction:column;overflow:hidden">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:10px;flex-shrink:0">EMISI PER FASILITAS (kt CO₂e)</div>
        <div style="flex:1;min-height:0;position:relative"><canvas id="esg-bar-chart"></canvas></div>
        <div style="display:flex;gap:12px;margin-top:8px;flex-shrink:0">
          ${[['#ff405590','Scope 1 (Direct)'],['#f5a62390','Scope 2 (Indirect)'],['rgba(180,195,220,.5)','Target 2026']].map(([c,l])=>`<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><span style="width:14px;height:5px;border-radius:2px;background:${c};display:inline-block"></span>${l}</span>`).join('')}
        </div>
      </div>
      <div class="card" style="padding:14px;display:flex;flex-direction:column;overflow:hidden">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:10px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center">
          <span>CARBON INTENSITY TREND (kg CO₂/BOE)</span>
          <span style="font-size:10px;color:var(--text3)">— — Target 2026: 13.5</span>
        </div>
        <div style="flex:1;min-height:0;position:relative"><canvas id="esg-trend-chart"></canvas></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;height:185px;flex-shrink:0">
      <div class="card" style="padding:14px;overflow:hidden;display:flex;flex-direction:column">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:8px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center">
          <span>GHG REDUCTION — PROGRESS MENUJU 2030</span>
          <div style="display:flex;gap:10px">
            ${[['#00d4a0','Realisasi'],['#a855f7','Proyeksi'],['rgba(180,195,220,.4)','Target']].map(([c,l])=>`<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><span style="width:14px;height:3px;border-radius:2px;background:${c};display:inline-block"></span>${l}</span>`).join('')}
          </div>
        </div>
        <div style="flex:1;min-height:0;position:relative"><canvas id="esg-ghg-chart"></canvas></div>
      </div>
      <div class="card" style="padding:14px;overflow-y:auto">
        <div style="font-size:11px;font-weight:700;letter-spacing:.8px;margin-bottom:10px">INISIATIF ESG AKTIF</div>
        ${[
          { name:'Solar Panel RU IV Cilacap',     status:'ON TRACK', pct:68, color:'#00d4a0', target:'Des 2026' },
          { name:'Energy Efficiency RU V',         status:'ON TRACK', pct:82, color:'#00d4a0', target:'Sep 2026' },
          { name:'Methane Capture Bontang LNG',    status:'AT RISK',  pct:41, color:'#f5a623', target:'Mar 2027' },
          { name:'Green H₂ Pilot RU II Dumai',     status:'DELAYED',  pct:22, color:'#ff4055', target:'Jun 2027' },
          { name:'Carbon Capture Terminal Plaju',  status:'ON TRACK', pct:55, color:'#00d4a0', target:'Des 2026' },
        ].map(p => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:11px;color:var(--text0);max-width:165px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</span>
            <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;background:${p.color}20;color:${p.color};border:1px solid ${p.color}40;flex-shrink:0">${p.status}</span>
          </div>
          <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:2px">
            <div style="height:100%;width:${p.pct}%;background:${p.color};border-radius:3px;transition:width .8s"></div>
          </div>
          <div style="font-size:10px;color:var(--text3)">${p.pct}% selesai · Target: ${p.target}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  /* ════════════════════════════════════════════════════════════
     PANEL INITIALIZERS (lazy — run once per tab)
  ════════════════════════════════════════════════════════════ */

  function initLeak() {
    const el = document.getElementById('leak-map');
    if (!el) return;
    maps.leak = L.map('leak-map', { center:[-2,118], zoom:5, zoomControl:false, attributionControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:18, subdomains:'abcd' }).addTo(maps.leak);

    ROUTES.forEach(r => {
      L.polyline(r.pts, { color:r.col, weight:14, opacity:.1 }).addTo(maps.leak);
      L.polyline(r.pts, { color:r.col, weight:3.5, opacity:.9 }).addTo(maps.leak);
    });
    ALERTS.forEach((a,i) => {
      const c = svc(a.sev);
      const icon = L.divIcon({
        html:`<div style="width:${i===0?14:10}px;height:${i===0?14:10}px;border-radius:50%;background:${c};border:2px solid rgba(255,255,255,.3);box-shadow:0 0 ${i===0?14:6}px ${c}"></div>`,
        className:'', iconAnchor:[7,7]
      });
      L.marker([a.lat, a.lng], { icon }).addTo(maps.leak)
        .bindPopup(`<b>${a.name}</b><br>${a.loc}<br>ΔP: -${a.dp} bar · AI: ${a.ai}%`);
    });

    intervals.push(setInterval(() => {
      const t = document.getElementById('leak-clock');
      if (t) { const n=new Date(); t.textContent=`${p2(n.getHours())}:${p2(n.getMinutes())}:${p2(n.getSeconds())}`; }
    }, 1000));

    window._aiLeak = idx => {
      const a = ALERTS[idx];
      document.querySelectorAll('[id^="leak-row-"]').forEach((r,i) => {
        r.style.background = i===idx ? 'var(--bg3)' : (i===0&&idx!==0?'rgba(255,64,85,0.07)':'');
      });
      const d=document.getElementById('leak-desc'), ai=document.getElementById('leak-ai'),
            dp=document.getElementById('leak-dp'), km=document.getElementById('leak-km');
      if (d)  d.textContent = DESCS[idx];
      if (ai) ai.textContent = a.ai + '%';
      if (dp) dp.textContent = a.dp + ' bar';
      const m = a.loc.match(/KM (\d+)/);
      if (km) km.textContent = m ? 'KM '+m[1] : '—';
      if (maps.leak) maps.leak.flyTo([a.lat,a.lng], 7, { animate:true, duration:.8 });
    };
    window._aiLeak(0);
  }

  function initDemand() {
    const PTS=40, HIST=30;
    const labels=[], base=new Date('2026-04-01');
    const MO=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    for (let i=0;i<PTS;i++) {
      const d=new Date(base); d.setDate(d.getDate()+i);
      labels.push(i%5===0?`${p2(d.getDate())} ${MO[d.getMonth()]}` : '');
    }

    const ts = (base,v=.035) => App.utils.timeSeries(HIST,base,v);
    const ph=ts(27000), sh=ts(22000), mh=ts(8500,.04), ah=ts(3500,.04);

    const forecast = hist => {
      const out=new Array(PTS).fill(null);
      out[HIST-1]=hist[HIST-1];
      for (let i=HIST;i<PTS;i++) out[i]=out[i-1]*(1+(Math.random()-.35)*.03);
      return out;
    };
    const pf=forecast(ph), sf=forecast(sh);
    const pad0=(a,n)=>[...a,...new Array(n).fill(null)];
    const confU=pf.map(v=>v?v*1.055:null), confL=pf.map(v=>v?v*.945:null);

    const el=document.getElementById('demand-chart');
    if (!el) return;
    charts.demand = new Chart(el, {
      type:'line',
      data:{ labels, datasets:[
        { label:'Pertalite', data:pad0(ph,PTS-HIST), borderColor:'#00d4a0', borderWidth:2, tension:.4, pointRadius:0, fill:false },
        { label:'Solar',     data:pad0(sh,PTS-HIST), borderColor:'#f5a623', borderWidth:2, tension:.4, pointRadius:0, fill:false },
        { label:'Pertamax',  data:pad0(mh,PTS-HIST), borderColor:'#1a7fe8', borderWidth:2, tension:.4, pointRadius:0, fill:false },
        { label:'Avtur',     data:pad0(ah,PTS-HIST), borderColor:'#a855f7', borderWidth:2, tension:.4, pointRadius:0, fill:false },
        { label:'Forecast Pertalite', data:pf, borderColor:'#00d4a0', borderWidth:2, borderDash:[7,5], tension:.4, pointRadius:0, fill:false },
        { label:'Forecast Solar',     data:sf, borderColor:'#f5a623', borderWidth:2, borderDash:[7,5], tension:.4, pointRadius:0, fill:false },
        { label:'_cu', data:confU, borderColor:'transparent', backgroundColor:'rgba(120,150,200,.1)', tension:.4, pointRadius:0, fill:'+1' },
        { label:'_cl', data:confL, borderColor:'transparent', tension:.4, pointRadius:0, fill:false },
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        plugins:{
          legend:{ display:false },
          tooltip:{ backgroundColor:'#111c35', borderColor:'#2a5298', borderWidth:1, titleColor:'#eef2ff', bodyColor:'#8095be',
            filter: i => !i.dataset.label.startsWith('_') },
        },
        scales:{
          x:{ grid:{color:'rgba(42,82,152,.15)'}, ticks:{color:'#4a5f82',font:{size:9},maxRotation:0} },
          y:{ grid:{color:'rgba(42,82,152,.15)'}, ticks:{color:'#4a5f82',font:{size:9},callback:v=>v>=1000?(v/1000).toFixed(0)+'K':v}, beginAtZero:false },
        },
        animation:{ duration:700 },
      }
    });

    // Position "today" line
    const todayLine=document.getElementById('demand-today');
    if (todayLine && el.offsetWidth) {
      todayLine.style.left = ((HIST/PTS)*100)+'%';
    }

    window._aiDF = fuel => {
      document.querySelectorAll('.ai-dfbtn').forEach(b=>{
        const a=b.dataset.f===fuel;
        b.style.background=a?'var(--bg4)':'transparent';
        b.style.color=a?'var(--text0)':'var(--text2)';
        b.style.fontWeight=a?'600':'400';
      });
      const vis={pertalite:[0,4],pertamax:[2],solar:[1,5],avtur:[3]};
      const show=vis[fuel]||[0,4];
      charts.demand.data.datasets.forEach((ds,i)=>{
        if (!ds.label.startsWith('_')) ds.hidden=!show.includes(i);
      });
      charts.demand.update();
    };
    window._aiDT = t => {
      document.querySelectorAll('.ai-dtbtn').forEach(b=>{
        const a=b.dataset.t===t;
        b.style.background=a?'var(--bg4)':'transparent';
        b.style.color=a?'var(--text0)':'var(--text2)';
        b.style.fontWeight=a?'600':'400';
      });
    };
  }

  function initFraud() {
    drawGauge(SPBU[selSpbu].risk);

    window._aiFS = idx => {
      selSpbu = idx;
      document.querySelectorAll('.ai-spbu-row').forEach((r,i)=>{
        r.style.background=i===idx?'rgba(26,127,232,.1)':'';
        r.style.outline=i===idx?'1px solid rgba(26,127,232,.3)':'';
        r.style.outlineOffset='-1px';
      });
      const panel=document.getElementById('fraud-detail');
      if (panel) {
        if (charts.gauge) { charts.gauge.destroy(); delete charts.gauge; }
        panel.innerHTML=fraudDetail(SPBU[idx]);
        setTimeout(()=>drawGauge(SPBU[idx].risk), 40);
      }
    };

    window._aiFF = filter => {
      document.querySelectorAll('.ai-fb').forEach(b=>{
        const a=b.dataset.filter===filter;
        b.style.background=a?'rgba(255,64,85,.12)':'transparent';
        b.style.borderColor=a?'rgba(255,64,85,.4)':'var(--border)';
        b.style.color=a?'var(--text0)':'var(--text2)';
      });
      document.querySelectorAll('.ai-spbu-row').forEach(r=>{
        const rs=r.dataset.sts;
        const show=filter==='semua'||rs===filter;
        r.style.display=show?'':'none';
      });
    };
  }

  function drawGauge(risk) {
    setTimeout(()=>{
      const el=document.getElementById('fraud-gauge');
      if (!el) return;
      charts.gauge=new Chart(el,{
        type:'doughnut',
        data:{ datasets:[{ data:[risk,100-risk], backgroundColor:[rc(risk),'#1a2540'], borderWidth:0, circumference:180, rotation:-90 }] },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{ legend:{display:false}, tooltip:{enabled:false} }, animation:{duration:700} }
      });
    }, 30);
  }

  function initSubsidi() {
    buildSubsidiChart(sfuel);
    window._aiSF = fuel => {
      sfuel=fuel;
      document.querySelectorAll('.ai-sfbtn').forEach(b=>{
        const a=b.dataset.sf===fuel;
        b.style.background=a?'var(--bg4)':'transparent';
        b.style.color=a?'var(--text0)':'var(--text2)';
        b.style.fontWeight=a?'600':'400';
      });
      if (charts.subsBar) { charts.subsBar.destroy(); delete charts.subsBar; }
      buildSubsidiChart(fuel);
      const d=document.getElementById('subsidi-detail');
      if (d) d.innerHTML=renderProvDetail(fuel);
    };
  }

  function buildSubsidiChart(fuel) {
    const el=document.getElementById('subsidi-chart');
    if (!el) return;
    const tot=PROV.reduce((s,p)=>s+p.spbu,0);
    const nat=fuel==='solar'?10820000:fuel==='total'?27620000:16800000;
    const kuota=PROV.map(p=>Math.round(nat*p.spbu/tot));
    const pct=PROV.map(p=>fuel==='solar'?p.sol:fuel==='total'?p.tot:p.pert);
    const real=kuota.map((k,i)=>Math.round(k*pct[i]/100));
    const cols=pct.map(v=>v>100?'#ff4055':v>90?'#f5a623':'#00d4a0');
    charts.subsBar=new Chart(el,{
      type:'bar',
      data:{ labels:PROV.map(p=>p.abbr), datasets:[
        { label:'Kuota', data:kuota, backgroundColor:'rgba(180,195,220,.2)', borderColor:'rgba(180,195,220,.4)', borderWidth:1, borderRadius:3 },
        { label:'Realisasi', data:real, backgroundColor:cols, borderWidth:0, borderRadius:3 },
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false},
          tooltip:{ backgroundColor:'#111c35', borderColor:'#2a5298', borderWidth:1, titleColor:'#eef2ff', bodyColor:'#8095be',
            callbacks:{ label:ctx=>`${ctx.dataset.label}: ${ctx.raw>=1e6?(ctx.raw/1e6).toFixed(2)+'Jt':ctx.raw>=1e3?(ctx.raw/1e3).toFixed(0)+'K':ctx.raw} KL` }
          }
        },
        scales:{
          x:{ grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:8},maxRotation:35} },
          y:{ grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:9},callback:v=>v>=1e6?(v/1e6).toFixed(1)+'Jt':v>=1e3?(v/1e3).toFixed(0)+'K':v} },
        },
        animation:{duration:600},
      }
    });
  }

  /* ── Predictive Maintenance Init ────────────────────────── */
  function drawMaintGauge(health) {
    setTimeout(() => {
      const el = document.getElementById('maint-gauge');
      if (!el) return;
      if (charts.maintGauge) { try { charts.maintGauge.destroy(); } catch(e){} }
      charts.maintGauge = new Chart(el, {
        type: 'doughnut',
        data: { datasets: [{ data:[health, 100-health], backgroundColor:[hc(health),'#1a2540'], borderWidth:0, circumference:180, rotation:-90 }] },
        options: { responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{ legend:{display:false}, tooltip:{enabled:false} }, animation:{duration:600} }
      });
    }, 30);
  }

  function initMaint() {
    drawMaintGauge(ASSETS[selAsset].health);
    window._aiAsset = idx => {
      selAsset = idx;
      document.querySelectorAll('[id^="ai-asset-"]').forEach((el, i) => {
        el.style.borderColor = i===idx ? 'rgba(168,85,247,.5)' : 'var(--border)';
        el.style.boxShadow   = i===idx ? '0 0 0 1px rgba(168,85,247,.25)' : '';
      });
      const panel = document.getElementById('maint-detail');
      if (panel) {
        panel.innerHTML = maintDetail(ASSETS[idx]);
        drawMaintGauge(ASSETS[idx].health);
      }
    };
  }

  /* ── ESG & Carbon Init ───────────────────────────────────── */
  function initESG() {
    // Emissions by Facility — stacked bar + target line
    const barEl = document.getElementById('esg-bar-chart');
    if (barEl) {
      charts.esgBar = new Chart(barEl, {
        type: 'bar',
        data: {
          labels: FACILITIES_ESG.map(f => f.name.length > 14 ? f.name.slice(0,14)+'…' : f.name),
          datasets: [
            { label:'Scope 1', data:FACILITIES_ESG.map(f=>f.s1), backgroundColor:'#ff405590', borderWidth:0, borderRadius:3, stack:'a' },
            { label:'Scope 2', data:FACILITIES_ESG.map(f=>f.s2), backgroundColor:'#f5a62390', borderWidth:0, borderRadius:3, stack:'a' },
            { label:'Target',  data:FACILITIES_ESG.map(f=>f.target), backgroundColor:'transparent', borderColor:'rgba(180,195,220,.55)', borderWidth:2, type:'line', pointRadius:4, pointBackgroundColor:'rgba(180,195,220,.8)', fill:false, tension:0 },
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#111c35', borderColor:'#2a5298', borderWidth:1, titleColor:'#eef2ff', bodyColor:'#8095be', callbacks:{ label:c=>`${c.dataset.label}: ${c.raw} kt` } } },
          scales:{
            x:{ stacked:true, grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:8},maxRotation:30} },
            y:{ stacked:false, grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:9},callback:v=>v+'kt'} },
          },
          animation:{duration:700},
        }
      });
    }

    // Carbon Intensity Trend — 30-day line
    const trendEl = document.getElementById('esg-trend-chart');
    if (trendEl) {
      const MO = ['Jan','Feb','Mar','Apr','Mei'];
      const base = new Date('2026-04-01');
      const labels30 = Array.from({length:30}, (_,i) => {
        const d = new Date(base); d.setDate(d.getDate()+i);
        return i%5===0 ? `${d.getDate()} ${MO[d.getMonth()]}` : '';
      });
      const target30 = new Array(30).fill(13.5);
      charts.esgTrend = new Chart(trendEl, {
        type:'line',
        data:{ labels:labels30, datasets:[
          { label:'Carbon Intensity', data:App.utils.timeSeries(30,14.8,.025), borderColor:'#00c8ff', backgroundColor:'rgba(0,200,255,.08)', fill:true, tension:.4, pointRadius:0, borderWidth:2 },
          { label:'Target 2026',     data:target30, borderColor:'#00d4a0', borderDash:[6,4], pointRadius:0, borderWidth:1.5, fill:false },
        ]},
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#111c35', borderColor:'#2a5298', borderWidth:1, titleColor:'#eef2ff', bodyColor:'#8095be' } },
          scales:{
            x:{ grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:9},maxTicksLimit:8} },
            y:{ grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:9},callback:v=>v+' kg'}, suggestedMin:12, suggestedMax:18 },
          },
          animation:{duration:700},
        }
      });
    }

    // GHG Reduction Progress — actual vs projected vs target 2022-2030
    const ghgEl = document.getElementById('esg-ghg-chart');
    if (ghgEl) {
      charts.esgGhg = new Chart(ghgEl, {
        type:'line',
        data:{
          labels:['2022','2023','2024','2025','2026','2027','2028','2029','2030'],
          datasets:[
            { label:'Target',    data:[750,720,695,665,632,596,555,505,450], borderColor:'rgba(180,195,220,.4)', borderDash:[5,5], pointRadius:0, borderWidth:1.5, fill:false },
            { label:'Realisasi', data:[750,718,692,662,null,null,null,null,null], borderColor:'#00d4a0', backgroundColor:'rgba(0,212,160,.08)', fill:true, tension:.3, pointRadius:3, borderWidth:2, pointBackgroundColor:'#00d4a0' },
            { label:'Proyeksi',  data:[null,null,null,662,615,575,535,492,450], borderColor:'#a855f7', borderDash:[5,4], tension:.3, pointRadius:3, borderWidth:2, pointBackgroundColor:'#a855f7', fill:false },
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#111c35', borderColor:'#2a5298', borderWidth:1, titleColor:'#eef2ff', bodyColor:'#8095be', callbacks:{ label:c=>`${c.dataset.label}: ${c.raw} kt CO₂e` } } },
          scales:{
            x:{ grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:9}} },
            y:{ grid:{color:'rgba(42,82,152,.1)'}, ticks:{color:'#4a5f82',font:{size:9},callback:v=>v+'kt'}, suggestedMin:400, suggestedMax:800 },
          },
          animation:{duration:700},
        }
      });
    }
  }

  /* ── Tab Switching ────────────────────────────────────────── */
  const tabInits = { leak:initLeak, demand:initDemand, fraud:initFraud, subsidi:initSubsidi, maint:initMaint, esg:initESG };

  function showPanel(tab) {
    ['leak','demand','fraud','subsidi','maint','esg'].forEach(t => {
      const p=document.getElementById('ai-panel-'+t);
      if (p) p.style.display=t===tab?'flex':'none';
    });
    document.querySelectorAll('.ai-tab').forEach(b => {
      const a=b.dataset.tab===tab;
      b.style.background=a?'var(--bg3)':'transparent';
      b.style.borderColor=a?'var(--border-bright)':'transparent';
      b.style.color=a?'var(--text0)':'var(--text2)';
    });
    if (!done[tab]) {
      done[tab]=true;
      setTimeout(()=>tabInits[tab](), 60);
    }
    currentTab=tab;
  }

  /* ── Lifecycle ────────────────────────────────────────────── */
  function init() {
    const c=document.getElementById('dash-ai');
    if (!c) return;

    c.innerHTML=`
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      <!-- Sub-nav -->
      <div style="display:flex;align-items:center;gap:4px;padding:8px 16px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto">
        <span style="font-size:11px;font-weight:600;color:var(--text3);margin-right:8px;white-space:nowrap;letter-spacing:.5px;flex-shrink:0">INTELIJEN /</span>
        <button class="ai-tab" data-tab="leak"    style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid var(--border-bright);border-radius:7px;background:var(--bg3);color:var(--text0);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"/></svg>
          Leak Detection AI
          <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;font-size:10px;font-weight:700;background:#ff405530;color:#ff4055;border:1px solid #ff405550">1</span>
        </button>
        <button class="ai-tab" data-tab="demand"  style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text2);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Demand Forecast
        </button>
        <button class="ai-tab" data-tab="fraud"   style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text2);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Fraud Detection
          <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;font-size:10px;font-weight:700;background:#f5a62330;color:#f5a623;border:1px solid #f5a62350">8</span>
        </button>
        <button class="ai-tab" data-tab="subsidi" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text2);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="1" y="12" width="4" height="10"/><rect x="7" y="8" width="4" height="14"/><rect x="13" y="5" width="4" height="17"/><rect x="19" y="9" width="4" height="13"/></svg>
          Subsidi BBM
        </button>
        <button class="ai-tab" data-tab="maint" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text2);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          Predictive Maintenance
          <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;font-size:10px;font-weight:700;background:#ff405530;color:#ff4055;border:1px solid #ff405550">3</span>
        </button>
        <button class="ai-tab" data-tab="esg" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text2);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>
          ESG &amp; Carbon
        </button>
      </div>
      <!-- Panels -->
      <div style="flex:1;min-height:0;position:relative;overflow:hidden">
        <div id="ai-panel-leak"    style="position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;padding:12px 16px;overflow:hidden">${renderLeak()}</div>
        <div id="ai-panel-demand"  style="position:absolute;inset:0;display:none;flex-direction:column;gap:10px;padding:12px 16px;overflow:hidden">${renderDemand()}</div>
        <div id="ai-panel-fraud"   style="position:absolute;inset:0;display:none;flex-direction:column;gap:10px;padding:12px 16px;overflow:hidden">${renderFraud()}</div>
        <div id="ai-panel-subsidi" style="position:absolute;inset:0;display:none;flex-direction:column;gap:10px;padding:12px 16px;overflow:hidden">${renderSubsidi()}</div>
        <div id="ai-panel-maint"   style="position:absolute;inset:0;display:none;flex-direction:column;gap:10px;padding:12px 16px;overflow:hidden">${renderMaint()}</div>
        <div id="ai-panel-esg"     style="position:absolute;inset:0;display:none;flex-direction:column;gap:10px;padding:12px 16px;overflow:hidden">${renderESG()}</div>
      </div>
    </div>`;

    document.querySelectorAll('.ai-tab').forEach(b => b.addEventListener('click', () => showPanel(b.dataset.tab)));

    setTimeout(() => {
      done.leak = true;
      initLeak();
    }, 100);
  }

  function destroy() {
    intervals.forEach(clearInterval);
    intervals = [];
    if (maps.leak) { maps.leak.remove(); maps.leak = null; }
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
    charts = {};
    done = { leak:false, demand:false, fraud:false, subsidi:false, maint:false, esg:false };
    selSpbu = 0;
    selAsset = 0;
    sfuel = 'pertalite';
  }

  return { init, destroy };
})();
