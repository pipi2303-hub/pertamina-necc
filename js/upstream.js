/* ============================================================
   Dashboard 2 — Upstream Production Dashboard
   ============================================================ */

window.DashUpstream = (() => {
  const u = () => App.utils;
  let charts = {};
  let maps = {};
  let intervals = [];

  const WELLS = [
    { id:'Well A-12', prod:'1.2 K BOPD', rate:'35', pressure:'2500', temp:'29.5', flow:'1,850', status:'normal' },
    { id:'Well A-13', prod:'1.80 K BOPD', rate:'2500', pressure:'29.5', temp:'29.5', flow:'1,020', status:'warning' },
    { id:'Well A-14', prod:'4.20 BOPD', rate:'2500', pressure:'29.5', temp:'1,020', flow:'1,020', status:'normal' },
    { id:'Well A-15', prod:'3.06 K BOPD', rate:'2500', pressure:'29.5', temp:'29.5', flow:'1,220', status:'normal' },
    { id:'Well A-16', prod:'2.7 K BOPD', rate:'2500', pressure:'29.5', temp:'29.5', flow:'1,020', status:'warning' },
    { id:'Well A-17', prod:'1.80 K BOPD', rate:'2500', pressure:'29.5', temp:'29.5', flow:'1,020', status:'normal' },
    { id:'Well A-18', prod:'3.77 K BOPD', rate:'2000', pressure:'29.5', temp:'29.5', flow:'1,000', status:'critical' },
    { id:'Well A-19', prod:'0.71 K BOPD', rate:'2500', pressure:'29.5', temp:'22.5', flow:'1,083', status:'warning' },
    { id:'Well A-20', prod:'4.00 K BOPD', rate:'2500', pressure:'29.5', temp:'29.5', flow:'1,020', status:'normal' },
  ];

  const ANOMALIES = [
    { level:'critical', icon:'📉', title:'Sudden Production Drop', desc:'Well A-12 (15% drop from baseline)', sub:'Investigate choking factor' },
    { level:'warning',  icon:'🔴', title:'Abnormal Pressure', desc:'Pipeline 8-4 (High pressure detected)', sub:'Inspect relief system' },
    { level:'warning',  icon:'🔥', title:'Flaring Anomaly', desc:'Platform C (Exceeding daily limit)', sub:'Activate reduction protocol' },
    { level:'warning',  icon:'📋', title:'Reporting Mismatch', desc:'Zone D — data discrepancy detected', sub:'Cross-check metering' },
  ];

  const RECS = [
    'Optimize Choke Settings on Well A-12',
    'Inspect Pipeline 8-4 Pressure Relief System',
    'Review Flaring Reduction Protocol on Platform C',
  ];

  function init() {
    const c = document.getElementById('dash-upstream');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => { initCharts(); initMap(); startUpdates(); }, 80);
  }

  function render() {
    return `
    <div style="display:grid;grid-template-rows:72px 1fr 126px;padding:10px;gap:10px;height:100%;">

      <!-- KPI Gauges Row -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'Oil Production', val:'1.2M', unit:'BOPD', delta:'▲ +1.5%', color:'blue', id:'oil' },
          { label:'Gas Production', val:'4.5', unit:'BCFD', delta:'▲ +0.6%', color:'cyan', id:'gas' },
          { label:'Well Availability', val:'98.5', unit:'%', delta:'▲ +0.3%', color:'green', id:'avail' },
          { label:'Pressure Integrity', val:'Normal', unit:'', delta:'✓ Stable', color:'green', id:'press' },
          { label:'Flaring Status', val:'Minimal', unit:'', delta:'✓ Within limit', color:'yellow', id:'flare' },
          { label:'Production Deviation', val:'+2.1', unit:'%', delta:'▲ vs. target', color:'orange', id:'dev' },
        ].map(k => `
        <div class="kpi-card ${k.color} dd-clickable" data-dd-title="${k.label}" data-dd-domain="upstream" data-dd-value="${(k.val||'').toString().replace(/<[^>]*>/g,'')}" data-dd-unit="${k.unit||''}" data-dd-delta="${k.delta||''}" data-dd-color="${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit">${k.unit}</span></div>
          <div class="kpi-delta up">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="ups-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- Body -->
      <div style="display:grid;grid-template-columns:260px 1fr 260px;gap:10px;min-height:0;">

        <!-- Well Performance Table -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 8px;">
          <div class="card-title"><span class="card-title-dot"></span>WELL PERFORMANCE TABLE</div>
          <div style="flex:1;overflow-y:auto;">
            <table class="data-table" style="font-size:10.5px;">
              <thead>
                <tr>
                  <th>Well ID</th><th>Prod Rate</th><th>PSI</th><th>°C</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${WELLS.map(w => `<tr>
                  <td class="highlight">${w.id}</td>
                  <td>${w.prod}</td>
                  <td>${w.pressure}</td>
                  <td>${w.temp}</td>
                  <td><span class="badge ${w.status === 'critical' ? 'critical' : w.status === 'warning' ? 'warning' : 'normal'}">${w.status === 'critical' ? 'Critical' : w.status === 'warning' ? 'Warning' : 'Normal'}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Live Upstream Field Map -->
        <div class="card" style="padding:0;overflow:hidden;position:relative;border-radius:var(--radius-lg);">
          <div style="position:absolute;top:8px;left:8px;z-index:500;font-size:10px;font-weight:600;color:var(--text1);background:rgba(7,13,27,0.85);padding:4px 10px;border-radius:4px;border:1px solid var(--border);">⛽ LIVE UPSTREAM FIELD MAP</div>
          <div id="ups-map" style="height:100%;width:100%;"></div>
          <div class="map-legend">
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--green)"></div>Operating</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--yellow)"></div>Warning</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--red)"></div>Critical</div>
          </div>
        </div>

        <!-- Anomaly Detection -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot" style="background:var(--red);box-shadow:var(--glow-red);"></span>ANOMALY DETECTION</div>
          <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:5px;">
            ${ANOMALIES.map(a => `
            <div class="anomaly-card ${a.level}">
              <div class="anomaly-card-icon">${a.icon}</div>
              <div class="anomaly-card-body">
                <div class="anomaly-card-title">${a.title}</div>
                <div class="anomaly-card-desc">${a.desc}</div>
                <div style="margin-top:3px;font-size:9.5px;color:var(--text3);">${a.sub}</div>
              </div>
            </div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin-top:6px;"><span class="card-title-dot" style="background:var(--blue);box-shadow:var(--glow-blue);"></span>EXEC RECOMMENDATIONS</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${RECS.map((r,i) => `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:5px 6px;background:var(--bg3);border-radius:var(--radius);border:1px solid var(--border);">
              <div style="width:18px;height:18px;background:var(--blue);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;">${i+1}</div>
              <div style="font-size:10.5px;color:var(--text1);">${r}</div>
            </div>`).join('')}
          </div>
        </div>

      </div>

      <!-- Bottom: Chart -->
      <div style="display:grid;grid-template-columns:260px 1fr;gap:10px;min-height:0;">
        <div class="card" style="padding:10px 8px;">
          <div class="card-title"><span class="card-title-dot"></span>PRODUCTION SUMMARY</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;">
            ${[
              { label:'Avg. Flow Rate', val:'1,250 BOPD', color:'var(--blue)' },
              { label:'Active Wells', val:'9 / 10', color:'var(--green)' },
              { label:'Wellhead Pressure', val:'2,450 PSI', color:'var(--cyan)' },
              { label:'GOR', val:'450 scf/bbl', color:'var(--yellow)' },
            ].map(s => `
            <div class="stat-box">
              <div class="stat-box-val" style="color:${s.color};font-size:14px;">${s.val}</div>
              <div class="stat-box-label">${s.label}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="card" style="padding:10px 12px;display:flex;flex-direction:column;min-height:0;">
          <div class="card-title"><span class="card-title-dot"></span>TARGET vs ACTUAL PRODUCTION CHART
            <div style="margin-left:auto;display:flex;gap:8px;">
              <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2);"><div style="width:20px;height:2px;background:var(--blue);border-radius:1px;"></div>Planned</div>
              <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2);"><div style="width:20px;height:2px;background:var(--green);border-radius:1px;"></div>Actual</div>
            </div>
          </div>
          <div style="flex:1;position:relative;min-height:0;"><canvas id="ups-line-chart"></canvas></div>
        </div>
      </div>

    </div>`;
  }

  function initCharts() {
    const u2 = u();
    const colors = ['#1a7fe8','#00c8ff','#00d4a0','#00d4a0','#f5a623','#f5a623'];
    ['oil','gas','avail','press','flare','dev'].forEach((k,i) => {
      charts[`spk${k}`] = u2.sparkline(`ups-spk-${k}`, u2.timeSeries(18, 60+i*5, 0.04), colors[i]);
    });

    const labels = u2.timeLabels(20, 3);
    const planned = u2.timeSeries(20, 1200, 0.02);
    const actual  = planned.map(v => v * (1 + (Math.random()-0.5)*0.06));

    charts.line = u2.lineChart('ups-line-chart', labels, [
      { label: 'Planned', data: planned, borderColor: '#1a7fe8', backgroundColor: 'rgba(26,127,232,0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 },
      { label: 'Actual',  data: actual,  borderColor: '#00d4a0', backgroundColor: 'rgba(0,212,160,0.08)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 },
    ], { beginAtZero: false });
  }

  function initMap() {
    if (maps.main) return;
    maps.main = L.map('ups-map', { zoomControl: false, attributionControl: false })
      .setView([0, 108], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(maps.main);

    const platforms = [
      { name:'Platform Alpha', lat: 1.2, lng: 108.5, status:'normal' },
      { name:'Platform Beta',  lat: 0.5, lng: 107.8, status:'warning' },
      { name:'Platform C',     lat:-0.3, lng: 109.2, status:'critical' },
      { name:'Platform D',     lat: 1.8, lng: 106.9, status:'normal' },
      { name:'Well Cluster A', lat:-1.5, lng: 116.4, status:'normal' },
      { name:'Well Cluster B', lat:-2.1, lng: 115.8, status:'warning' },
    ];
    const colorMap = { normal:'#00d4a0', warning:'#f5a623', critical:'#ff4055' };
    platforms.forEach(p => {
      const c = colorMap[p.status];
      const html = `<div style="background:${c}25;border:2px solid ${c};border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 0 10px ${c}60;">⛽</div>`;
      L.marker([p.lat,p.lng], { icon: L.divIcon({ className:'', html, iconSize:[24,24], iconAnchor:[12,12] }) })
        .addTo(maps.main)
        .bindPopup(`<div style="background:#111c35;border:1px solid #2a5298;border-radius:6px;padding:8px 10px;color:#eef2ff;font-size:11px;font-family:Inter,sans-serif;"><strong>${p.name}</strong><br><span style="color:${c};">${p.status.toUpperCase()}</span></div>`);
    });
    // pipeline connections
    platforms.forEach((p,i) => {
      if (i > 0) {
        L.polyline([[platforms[0].lat,platforms[0].lng],[p.lat,p.lng]], { color:'#1a7fe8', weight:1.5, opacity:0.4, dashArray:'4,4' }).addTo(maps.main);
      }
    });
  }

  function startUpdates() {
    const iid = setInterval(() => {
      if (!document.getElementById('ups-map')) { clearInterval(iid); return; }
      // update sparklines with small nudge
    }, 4000);
    intervals.push(iid);
  }

  function destroy() {
    intervals.forEach(clearInterval);
    intervals = [];
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
    charts = {};
    if (maps.main) { maps.main.remove(); maps.main = null; }
  }

  return { init, destroy };
})();
