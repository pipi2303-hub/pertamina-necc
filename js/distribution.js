/* ============================================================
   Dashboard 6 — Distribution & Retail Control Dashboard
   ============================================================ */

window.DashDistribution = (() => {
  const u = () => App.utils;
  let charts = {};
  let maps = {};
  let intervals = [];

  const NOZZLE_TYPES = [
    { type:'Premium',  nozzle:'$124.5M', sales:3, status:'Online' },
    { type:'Pertalite', nozzle:'$85.0M', sales:10, status:'Offline' },
    { type:'Pertamax', nozzle:'$113.5M', sales:5, status:'Online' },
    { type:'Solar',    nozzle:'$84.0M',  sales:6, status:'Online' },
    { type:'Solar',    nozzle:'$70.5M',  sales:4, status:'Online' },
    { type:'Pertamax', nozzle:'$50.5M',  sales:2, status:'Online' },
    { type:'Pertalite', nozzle:'$30.0M', sales:2, status:'Online' },
    { type:'Premium',  nozzle:'$133.5M', sales:4, status:'Online' },
    { type:'Solar',    nozzle:'$23.8M',  sales:4, status:'Online' },
    { type:'Premium',  nozzle:'$19.2M',  sales:22, status:'Online' },
    { type:'Pertamax', nozzle:'$14.8M',  sales:2, status:'Online' },
    { type:'Solar',    nozzle:'$14.8M',  sales:3, status:'Online' },
  ];

  const RECON = [
    { label:'Tank Stock',    val:'$11,200.2kL', delta:'+2.5%' },
    { label:'Delivery Receipt', val:'18,500.0kL', delta:'-3.9%' },
    { label:'Sales Transaction', val:'1,250,000 1L', delta:'+1.5%' },
    { label:'Remaining Balance', val:'$110,280.00', delta:'+0.05%' },
  ];

  function init() {
    const c = document.getElementById('dash-distribution');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => { initCharts(); initMap(); startUpdates(); }, 80);
  }

  function render() {
    return `
    <div style="display:grid;grid-template-rows:56px 1fr 88px;padding:10px;gap:10px;height:100%;">

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'Total Retail Sales',    val:'$124.5M', unit:'',  delta:'▲ +2.1%', color:'green', id:'rs' },
          { label:'Fuel Stock Position',   val:'18,500',  unit:'KL', delta:'▲ 92% Capacity', color:'blue', id:'fs' },
          { label:'Nozzle Transactions',   val:'1,250,000', unit:'', delta:'▲ +1.9%', color:'cyan', id:'nt' },
          { label:'Subsidy Allocation',    val:'500',     unit:'KL', delta:'⚠ 75% Used', color:'yellow', id:'sa' },
          { label:'Stock vs Sales Var.',   val:'0.05',    unit:'%',  delta:'✓ Within limit', color:'green', id:'sv' },
          { label:'Abnormal Transactions', val:'45',      unit:'',   delta:'⚠ Alert', color:'red', id:'at' },
        ].map(k => `
        <div class="kpi-card ${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit">${k.unit}</span></div>
          <div class="kpi-delta ${k.delta.startsWith('▲')||k.delta.startsWith('✓')?'up':'warn'}">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="dist-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- Body -->
      <div style="display:grid;grid-template-columns:230px 1fr 240px;gap:10px;min-height:0;">

        <!-- Nozzle Sales Monitor -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 8px;">
          <div class="card-title">
            <span class="card-title-dot"></span>NOZZLE SALES MONITOR
            <select style="margin-left:auto;background:var(--bg3);border:1px solid var(--border);color:var(--text1);border-radius:4px;padding:2px 4px;font-size:9.5px;">
              <option>SPBU Score: Premium</option>
              <option>All Types</option>
            </select>
          </div>
          <div style="flex:1;overflow-y:auto;">
            <table class="data-table" style="font-size:10.5px;">
              <thead><tr><th>Product Type</th><th>Sales/Nozzle</th><th>Nozzles</th><th>Status</th></tr></thead>
              <tbody>
                ${NOZZLE_TYPES.slice(0,8).map(n => `<tr>
                  <td class="highlight">${n.type}</td>
                  <td>${n.nozzle}</td>
                  <td>${n.sales}</td>
                  <td><span class="badge ${n.status.toLowerCase()}">${n.status}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="divider" style="margin:6px 0;"></div>
          <div class="card-title"><span class="card-title-dot"></span>REPEAT TRANSACTIONS</div>
          <div style="height:50px;position:relative;"><canvas id="dist-repeat-chart"></canvas></div>
        </div>

        <!-- SPBU Network Map -->
        <div class="card" style="padding:0;overflow:hidden;position:relative;border-radius:var(--radius-lg);display:flex;flex-direction:column;">
          <div style="position:absolute;top:8px;left:8px;z-index:500;font-size:10px;font-weight:600;color:var(--text1);background:rgba(7,13,27,0.85);padding:4px 10px;border-radius:4px;border:1px solid var(--border);">⛽ SPBU NETWORK</div>
          <div style="position:absolute;top:8px;right:8px;z-index:500;display:flex;gap:4px;">
            <span class="badge normal" style="font-size:8px;"><span class="badge-dot online"></span>Online</span>
            <span class="badge offline" style="font-size:8px;">Offline</span>
            <span class="badge critical" style="font-size:8px;">Alert</span>
          </div>
          <div id="dist-map" style="height:100%;width:100%;"></div>
          <div class="map-legend">
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--green)"></div>Online SPBU</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--red)"></div>Offline</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--yellow)"></div>Alert</div>
          </div>
          <!-- CCTV feed overlay at bottom -->
          <div style="position:absolute;bottom:8px;right:8px;z-index:500;width:140px;height:80px;background:rgba(7,13,27,0.9);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
            <div class="cctv-scanline"></div>
            <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,255,0.01) 2px,rgba(0,200,255,0.01) 4px);"></div>
            <div style="position:absolute;top:4px;left:6px;font-size:7px;color:var(--green);font-family:'JetBrains Mono',monospace;">● CAM SPBU-02</div>
            <div style="position:absolute;bottom:4px;left:6px;font-size:7px;color:var(--cyan);font-family:'JetBrains Mono',monospace;" id="dist-cctv-time">--:--:--</div>
          </div>
        </div>

        <!-- Subsidy Control Panel -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot" style="background:var(--yellow);"></span>SUBSIDY CONTROL PANEL</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
            <div class="stat-box">
              <div class="stat-box-val" style="color:var(--yellow);font-size:16px;">500 KL</div>
              <div class="stat-box-label">Quota Usage</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-val" style="color:var(--green);font-size:28px;">75</div>
              <div class="stat-box-label">Eligibles</div>
            </div>
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:9.5px;color:var(--text2);margin-bottom:3px;">Eligibility Status</div>
            <div class="progress-bar"><div class="progress-bar-fill yellow" style="width:75%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:2px;"><span>0%</span><span>75% Used</span><span>100%</span></div>
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--red);box-shadow:var(--glow-red);"></span>ALERT / SUSPICIOUS CLUSTER</div>
          <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:3px;" id="dist-alert-list">
            ${['Suspicious Cluster A','Suspicious Cluster B','Suspicious Cluster C','Suspicious Cluster D','Suspicious Cluster E'].map(a => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;background:rgba(255,64,85,0.05);border:1px solid rgba(255,64,85,0.15);border-radius:4px;">
              <span style="font-size:10.5px;color:var(--text1);">${a}</span>
              <span class="badge critical" style="font-size:8px;">Alert</span>
            </div>`).join('')}
          </div>
          <div class="divider"></div>
          <div style="height:45px;position:relative;margin-top:4px;"><canvas id="dist-subsidy-chart"></canvas></div>
        </div>

      </div>

      <!-- Bottom: Stock vs Sales Reconciliation -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;min-height:0;">
        ${RECON.map(r => `
        <div class="card" style="padding:9px 12px;display:flex;align-items:center;gap:12px;">
          <div>
            <div style="font-size:9.5px;color:var(--text3);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${r.label}</div>
            <div style="font-size:17px;font-weight:700;color:var(--text0);margin-top:2px;">${r.val}</div>
            <div style="font-size:10px;color:${r.delta.startsWith('+')||r.delta.startsWith('▲')?'var(--green)':'var(--yellow)'};margin-top:1px;">${r.delta.startsWith('+')||r.delta.startsWith('-')?'Trend: ':''}${r.delta}</div>
          </div>
          <div style="margin-left:auto;height:36px;width:80px;position:relative;"><canvas id="dist-recon-${r.label.replace(/[^a-z]/gi,'').toLowerCase()}"></canvas></div>
        </div>`).join('')}
        <div class="card" style="padding:9px 12px;display:flex;align-items:center;gap:10px;">
          <div>
            <div style="font-size:9.5px;color:var(--text3);font-weight:600;">VARIANCE</div>
            <div style="font-size:17px;font-weight:700;color:var(--green);">−0.05%</div>
            <div style="font-size:10px;color:var(--green);">Within limit</div>
          </div>
          <div style="height:36px;width:80px;position:relative;flex:1;"><canvas id="dist-recon-variance"></canvas></div>
        </div>
      </div>

    </div>`;
  }

  function initCharts() {
    const u2 = u();
    const ks = ['rs','fs','nt','sa','sv','at'];
    const cls = ['#00d4a0','#1a7fe8','#00c8ff','#f5a623','#00d4a0','#ff4055'];
    ks.forEach((k,i) => { charts[`spk${k}`] = u2.sparkline(`dist-spk-${k}`, u2.timeSeries(18, 50+i*3, 0.05), cls[i]); });

    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    charts.repeat = u2.miniBar('dist-repeat-chart', labels,
      [40,30,15,10,75,55,25],
      ['#1a7fe8','#1a7fe8','#f5a623','#f5a623','#ff4055','#1a7fe8','#1a7fe8']
    );

    charts.subsidy = u2.sparkline('dist-subsidy-chart', u2.timeSeries(16, 60, 0.1), '#f5a623');

    // Mini sparklines for recon cards
    const reconKeys = ['tankstock','deliveryreceipt','salestransaction','remainingbalance','variance'];
    const reconColors = ['#1a7fe8','#00d4a0','#f5a623','#00c8ff','#00d4a0'];
    reconKeys.forEach((k,i) => {
      charts[`recon${k}`] = u2.sparkline(`dist-recon-${k}`, u2.timeSeries(12, 50+i*5, 0.06), reconColors[i], false);
    });

    // CCTV time
    const iid = setInterval(() => {
      const el = document.getElementById('dist-cctv-time');
      if (!el) { clearInterval(iid); return; }
      const now = new Date();
      el.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    }, 1000);
    intervals.push(iid);
  }

  function initMap() {
    if (maps.main) return;
    maps.main = L.map('dist-map', { zoomControl: false, attributionControl: true })
      .setView([-6.5, 107], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:19 }).addTo(maps.main);

    const spbus = [
      { name:'SPBU Serpong 01',   lat:-6.31, lng:106.66, status:'online' },
      { name:'SPBU Tangerang 02', lat:-6.18, lng:106.63, status:'online' },
      { name:'SPBU Jakarta 03',   lat:-6.21, lng:106.85, status:'alert' },
      { name:'SPBU Bekasi 04',    lat:-6.24, lng:107.00, status:'online' },
      { name:'SPBU Depok 05',     lat:-6.40, lng:106.81, status:'offline' },
      { name:'SPBU Bogor 06',     lat:-6.60, lng:106.79, status:'online' },
      { name:'SPBU Ciawi 07',     lat:-6.68, lng:106.89, status:'online' },
      { name:'SPBU Cikarang 08',  lat:-6.26, lng:107.14, status:'alert' },
      { name:'SPBU Cirebon 09',   lat:-6.71, lng:108.55, status:'online' },
      { name:'SPBU Bandung 10',   lat:-6.91, lng:107.61, status:'online' },
      { name:'SPBU Sukabumi 11',  lat:-6.92, lng:106.93, status:'online' },
      { name:'SPBU Karawang 12',  lat:-6.32, lng:107.33, status:'online' },
    ];

    const cMap = { online:'#00d4a0', offline:'#4a5f82', alert:'#f5a623' };
    spbus.forEach(s => {
      const c = cMap[s.status];
      const html = `<div style="background:${c}20;border:2px solid ${c};border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:9px;box-shadow:0 0 8px ${c}50;">⛽</div>`;
      L.marker([s.lat,s.lng], { icon: L.divIcon({ className:'', html, iconSize:[20,20], iconAnchor:[10,10] }) })
        .addTo(maps.main)
        .bindPopup(`<div style="background:#111c35;border:1px solid #2a5298;border-radius:6px;padding:8px;color:#eef2ff;font-size:11px;font-family:Inter,sans-serif;"><strong>${s.name}</strong><br><span style="color:${c};">${s.status.toUpperCase()}</span></div>`);
    });

    // Heat map zones (simplified colored circles)
    const heatZones = [
      { lat:-6.21, lng:106.85, r:15000, color:'#ff4055', opacity:0.08 },
      { lat:-6.31, lng:106.66, r:10000, color:'#f5a623', opacity:0.07 },
    ];
    heatZones.forEach(z => {
      L.circle([z.lat,z.lng], { radius:z.r, color:z.color, weight:0, fillColor:z.color, fillOpacity:z.opacity }).addTo(maps.main);
    });
  }

  function startUpdates() {}

  function destroy() {
    intervals.forEach(clearInterval);
    intervals = [];
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
    charts = {};
    if (maps.main) { maps.main.remove(); maps.main = null; }
  }

  return { init, destroy };
})();
