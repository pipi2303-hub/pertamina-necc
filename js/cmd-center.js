/* ============================================================
   Dashboard 1 — National Energy Command Center
   ============================================================ */

window.DashCommand = (() => {
  const u = () => App.utils;
  let charts = {};
  let maps = {};
  let intervals = [];
  let alertRotate = 0;

  const ALERTS = [
    { level: 'critical', icon: '🚢', title: 'Tanker 3 — Collision Risk', loc: 'Selat Sunda', severity: 'Critical', loss: 'IDR 15 B', status: 'Initiated', time: '14:05' },
    { level: 'warning',  icon: '🏭', title: 'Refinery Unit 4 — Temp Rise', loc: 'Cilacap Refinery', severity: 'Warning', loss: 'IDR 5 B', status: 'Monitoring', time: '14:18' },
    { level: 'normal',   icon: '⛽', title: 'Pipeline Sector 7 — Flow Stable', loc: 'East Java Pipeline', severity: 'Normal', loss: 'IDR 2 B', status: 'Resolved', time: '13:55' },
    { level: 'critical', icon: '⚡', title: 'SPKLU Network — Outage', loc: 'Kalimantan Grid', severity: 'Critical', loss: 'IDR 1 B', status: 'Pending', time: '14:22' },
  ];

  const AI_ACTIONS = [
    { title: 'Reroute Tanker 3', unit: 'Logistics', loss: 'IDR 15 B', status: 'initiated' },
    { title: 'Optimize Refinery 4 Cooling', unit: 'Refining', loss: 'IDR 5 B', status: 'pending' },
  ];

  const ENERGY_CHAIN = [
    { icon: '⛽', name: 'UPSTREAM', sub: 'Oil Platform · Gas', val: '2.45 MBOEPD', key: 'upstream', color: '#1a7fe8' },
    { icon: '🏭', name: 'REFINERY', sub: 'Storage · Volume', val: '8.9 MMKL', key: 'refinery', color: '#00d4a0' },
    { icon: '🛢️', name: 'STORAGE TERMINAL', sub: 'Flow · Terminal', val: 'IDR 450.2 T', key: 'storage', color: '#f5a623' },
    { icon: '🚢', name: 'LOGISTICS NETWORK', sub: 'Data · Logistics', val: '8.3 B', key: 'logistics', color: '#00c8ff' },
    { icon: '🏪', name: 'DISTRIBUTION', sub: 'Data · Distribution', val: '96%', key: 'distribution', color: '#a855f7' },
    { icon: '⚡', name: 'RETAIL / EV SPKLU', sub: 'Data · 1 SK', val: '1 SK', key: 'spklu', color: '#ff7b00' },
  ];

  function getHTML() {
    const kpiCards = [
      { label: 'Total Production', val: '2.45', unit: 'MBOEPD', delta: '+1.3%', dir: 'up', color: 'blue',   id: 'kpi-prod' },
      { label: 'Distribution Volume', val: '8.9', unit: 'MMKL', delta: '+0.8%', dir: 'up', color: 'green',  id: 'kpi-dist' },
      { label: 'Energy Flow Value', val: 'IDR 450.2', unit: 'T', delta: '+2.1%', dir: 'up', color: 'cyan',   id: 'kpi-flow' },
      { label: 'Active Alerts', val: '<span style="color:var(--red)">3 Critical</span>', unit: '', delta: '7 Warning', dir: 'warn', color: 'red', id: 'kpi-alerts' },
      { label: 'System Integrity', val: '99.4', unit: '%', delta: '−0.1%', dir: 'down', color: 'green', id: 'kpi-int' },
      { label: 'Est. Loss Today', val: 'IDR 1.2', unit: 'B', delta: '↑ from IDR 0.8 B', dir: 'warn', color: 'orange', id: 'kpi-loss' },
    ];

    return `
<div id="dash-command" class="dash active" style="display:grid;grid-template-rows:56px 1fr;padding:10px;gap:10px;height:100%;">
  <!-- KPI Row -->
  <div class="cmd-kpi-row">
    ${kpiCards.map(k => `
    <div class="kpi-card ${k.color} dd-clickable" data-dd-title="${k.label}" data-dd-domain="command" data-dd-value="${(k.val||'').toString().replace(/<[^>]*>/g,'')}" data-dd-unit="${k.unit||''}" data-dd-delta="${k.delta||''}" data-dd-color="${k.color}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.val}<span class="unit">${k.unit}</span></div>
      <div class="kpi-delta ${k.dir}">${k.dir === 'up' ? '▲' : k.dir === 'down' ? '▼' : '⚠'} ${k.delta}</div>
      <div class="kpi-sparkline"><canvas id="spk-${k.id}"></canvas></div>
    </div>`).join('')}
  </div>

  <!-- Body -->
  <div class="cmd-body">

    <!-- Energy Chain -->
    <div class="card fill" style="display:flex;flex-direction:column;gap:6px;padding:10px 10px;">
      <div class="card-title"><span class="card-title-dot"></span>ENERGY CHAIN</div>
      <div class="energy-chain scroll-y fill" id="ec-list">
        ${ENERGY_CHAIN.map((e,i) => `
        <div class="ec-item${i===0?' active':''}" data-key="${e.key}" onclick="App.navigate('${e.key}')">
          <div class="ec-icon">${e.icon}</div>
          <div class="ec-body">
            <div class="ec-name">${e.name}</div>
            <div class="ec-val">${e.val}</div>
            <div class="ec-sub">${e.sub}</div>
          </div>
          <div style="width:6px;height:6px;border-radius:50%;background:${e.color};box-shadow:0 0 6px ${e.color};flex-shrink:0;"></div>
        </div>
        <div class="flow-connector">↓</div>
        `).join('')}
      </div>
    </div>

    <!-- Center: Map + AI -->
    <div class="cmd-map-area">
      <div class="card fill" style="padding:0;overflow:hidden;">
        <div style="position:absolute;top:8px;left:8px;z-index:500;font-size:10px;font-weight:600;letter-spacing:1px;color:var(--text2);background:rgba(7,13,27,0.8);padding:4px 8px;border-radius:4px;border:1px solid var(--border);">INDONESIA NATIONAL GRID</div>
        <div id="cmd-map" class="map-container" style="height:100%;border-radius:var(--radius-lg);"></div>
        <div class="map-legend">
          <div class="map-legend-item"><div class="legend-dot" style="background:var(--blue)"></div> Refinery</div>
          <div class="map-legend-item"><div class="legend-dot" style="background:var(--green)"></div> Terminal</div>
          <div class="map-legend-item"><div class="legend-dot" style="background:var(--yellow)"></div> SPBU/SPKLU</div>
          <div class="map-legend-item"><div class="legend-dot" style="background:var(--red)"></div> Alert Zone</div>
        </div>
      </div>

      <!-- AI Decision Engine -->
      <div class="card" style="padding:10px 12px;">
        <div class="card-title"><span class="card-title-dot" style="background:var(--purple);box-shadow:0 0 6px var(--purple);"></span>AI DECISION ENGINE</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${AI_ACTIONS.map((a,i) => `
          <div class="ai-action">
            <div class="ai-action-num">${i+1}</div>
            <div class="ai-action-body">
              <div class="ai-action-title">${a.title}</div>
              <div class="ai-action-meta">
                <div class="ai-action-field"><div class="ai-action-field-label">Unit</div><div class="ai-action-field-val">${a.unit}</div></div>
                <div class="ai-action-field"><div class="ai-action-field-label">Est. Loss Avoided</div><div class="ai-action-field-val">${a.loss}</div></div>
                <div class="ai-action-field"><div class="ai-action-field-label">Status</div><div class="ai-action-field-val"><span class="badge ${a.status}">${a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></div></div>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Live Alerts -->
    <div class="card fill" style="display:flex;flex-direction:column;padding:10px 12px;">
      <div class="card-title"><span class="card-title-dot" style="background:var(--red);box-shadow:var(--glow-red);"></span>LIVE ALERT
        <span class="badge critical" style="margin-left:auto;">ALL</span>
      </div>
      <div class="scroll-y fill" id="alert-list" style="display:flex;flex-direction:column;gap:5px;">
        ${ALERTS.map(a => alertHTML(a)).join('')}
      </div>
    </div>

  </div>
</div>`;
  }

  function alertHTML(a) {
    return `
    <div class="alert-item ${a.level}">
      <div class="alert-icon">${a.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.level === 'critical' ? '<span class="blink" style="color:var(--red);">●</span> ' : a.level === 'warning' ? '<span style="color:var(--yellow);">●</span> ' : '<span style="color:var(--green);">●</span> '}${a.title}</div>
        <div class="alert-meta"><span>${a.loc}</span> · Severity: ${a.severity} · Est. Loss Avoided: ${a.loss}</div>
        <div class="alert-meta" style="margin-top:2px;">Status: <span class="badge ${a.status.toLowerCase()}">${a.status}</span> <span style="margin-left:6px;">${a.time}</span></div>
      </div>
    </div>`;
  }

  function initMap() {
    const mapEl = document.getElementById('cmd-map');
    if (!mapEl || maps.main) return;
    maps.main = L.map('cmd-map', { zoomControl: true, attributionControl: true, scrollWheelZoom: true })
      .setView([-2.5, 118], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(maps.main);

    const locs = [
      { name: 'Jakarta', lat: -6.21, lng: 106.85, type: 'refinery', icon: '🏭', color: '#1a7fe8' },
      { name: 'Cilacap Refinery', lat: -7.72, lng: 109.01, type: 'refinery', icon: '🏭', color: '#1a7fe8' },
      { name: 'Balikpapan', lat: -1.27, lng: 116.83, type: 'refinery', icon: '🏭', color: '#1a7fe8' },
      { name: 'Dumai', lat: 1.67, lng: 101.44, type: 'refinery', icon: '🏭', color: '#1a7fe8' },
      { name: 'Medan Terminal', lat: 3.58, lng: 98.67, type: 'terminal', icon: '🛢️', color: '#00d4a0' },
      { name: 'Surabaya Terminal', lat: -7.25, lng: 112.75, type: 'terminal', icon: '🛢️', color: '#00d4a0' },
      { name: 'Makassar', lat: -5.14, lng: 119.43, type: 'terminal', icon: '🛢️', color: '#00d4a0' },
      { name: 'Sunda Strait (ALERT)', lat: -6.05, lng: 105.85, type: 'alert', icon: '⚠️', color: '#ff4055' },
      { name: 'Bontang LNG', lat: 0.13, lng: 117.50, type: 'refinery', icon: '⛽', color: '#f5a623' },
      { name: 'Palembang', lat: -2.99, lng: 104.76, type: 'terminal', icon: '🛢️', color: '#00d4a0' },
    ];

    locs.forEach(loc => {
      const iconHtml = `<div style="background:${loc.color}20;border:2px solid ${loc.color};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 10px ${loc.color}60;">${loc.icon}</div>`;
      const marker = L.marker([loc.lat, loc.lng], {
        icon: L.divIcon({ className: '', html: iconHtml, iconSize: [28,28], iconAnchor: [14,14] })
      }).addTo(maps.main);
      marker.bindPopup(`<div style="background:#111c35;border:1px solid #2a5298;border-radius:6px;padding:8px 10px;color:#eef2ff;font-family:Inter,sans-serif;font-size:11px;"><strong>${loc.name}</strong><br><span style="color:#8095be;">${loc.type.toUpperCase()}</span></div>`, { className: 'custom-popup' });
    });

    // pipeline lines
    const routes = [
      [[-6.21,106.85],[-7.72,109.01]],
      [[-7.72,109.01],[-7.25,112.75]],
      [[-2.99,104.76],[1.67,101.44]],
      [[1.67,101.44],[3.58,98.67]],
      [[-1.27,116.83],[0.13,117.50]],
    ];
    routes.forEach(r => {
      L.polyline(r, { color: '#1a7fe8', weight: 1.5, opacity: 0.5, dashArray: '5,5' }).addTo(maps.main);
    });
  }

  function initCharts() {
    const colors = ['#1a7fe8','#00d4a0','#00c8ff','#ff4055','#00d4a0','#f5a623'];
    ['prod','dist','flow','alerts','int','loss'].forEach((k,i) => {
      charts[k] = u().sparkline(`spk-kpi-${k}`, u().timeSeries(18, 50+Math.random()*30, 0.05), colors[i]);
    });
  }

  function startUpdates() {
    const iid = setInterval(() => {
      // Rotate alert flash
      const alertEls = document.querySelectorAll('.alert-item.critical .alert-title .blink');
      alertEls.forEach(el => el.style.opacity = Math.random() > 0.5 ? '1' : '0.2');
    }, 1500);
    intervals.push(iid);
  }

  function init() {
    const container = document.getElementById('dash-command');
    if (!container) return;
    container.innerHTML = `
      <div style="display:grid;grid-template-rows:56px 1fr;padding:10px;gap:10px;height:100%;">
        ${renderKPIRow()}
        <div class="cmd-body">
          ${renderEnergyChain()}
          ${renderMapArea()}
          ${renderAlertPanel()}
        </div>
      </div>`;

    setTimeout(() => {
      initMap();
      initCharts();
      startUpdates();
    }, 100);
  }

  function renderKPIRow() {
    const cards = [
      { label: 'Total Production', val: '2.45', unit: 'MBOEPD', delta: '▲ +1.3%', dir: 'up', color: 'blue',   id: 'prod' },
      { label: 'Distribution Volume', val: '8.9', unit: 'MMKL', delta: '▲ +0.8%', dir: 'up', color: 'green',  id: 'dist' },
      { label: 'Energy Flow Value', val: 'IDR 450.2', unit: 'T', delta: '▲ +2.1%', dir: 'up', color: 'cyan',   id: 'flow' },
      { label: 'Active Alerts', val: '3 Critical', unit: '', delta: '⚠ 7 Warning', dir: 'warn', color: 'red', id: 'alerts' },
      { label: 'System Integrity', val: '99.4', unit: '%', delta: '▼ −0.1%', dir: 'down', color: 'green', id: 'int' },
      { label: 'Est. Loss Today', val: 'IDR 1.2', unit: 'B', delta: '⚠ ↑ from 0.8 B', dir: 'warn', color: 'orange', id: 'loss' },
    ];
    return `<div class="cmd-kpi-row">
      ${cards.map(k => `
      <div class="kpi-card ${k.color} dd-clickable" data-dd-title="${k.label}" data-dd-domain="command" data-dd-value="${(k.val||'').toString().replace(/<[^>]*>/g,'')}" data-dd-unit="${k.unit||''}" data-dd-delta="${k.delta||''}" data-dd-color="${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value" style="${k.id==='alerts'?'font-size:16px;color:var(--red);':''}">${k.val}<span class="unit">${k.unit}</span></div>
        <div class="kpi-delta ${k.dir}">${k.delta}</div>
        <div class="kpi-sparkline"><canvas id="spk-kpi-${k.id}" height="28"></canvas></div>
      </div>`).join('')}
    </div>`;
  }

  function renderEnergyChain() {
    return `
    <div class="card fill" style="display:flex;flex-direction:column;min-height:0;padding:10px;">
      <div class="card-title"><span class="card-title-dot"></span>ENERGY CHAIN</div>
      <div class="energy-chain scroll-y" style="flex:1;overflow-y:auto;">
        ${ENERGY_CHAIN.map((e,i) => `
        <div class="ec-item${i===0?' active':''}" onclick="App.navigate('${e.key}')" style="cursor:pointer;">
          <div class="ec-icon">${e.icon}</div>
          <div class="ec-body">
            <div class="ec-name">${e.name}</div>
            <div class="ec-val">${e.val}</div>
            <div class="ec-sub">${e.sub}</div>
          </div>
          <div style="width:7px;height:7px;border-radius:50%;background:${e.color};box-shadow:0 0 8px ${e.color};flex-shrink:0;"></div>
        </div>
        ${i < ENERGY_CHAIN.length-1 ? '<div style="text-align:center;color:var(--text3);font-size:13px;margin:-1px 0;">↓</div>' : ''}
        `).join('')}
      </div>
    </div>`;
  }

  function renderMapArea() {
    return `
    <div style="display:grid;grid-template-rows:1fr 104px;gap:10px;min-height:0;">
      <div class="card" style="padding:0;overflow:hidden;position:relative;border-radius:var(--radius-lg);">
        <div style="position:absolute;top:8px;left:8px;z-index:500;font-size:10px;font-weight:600;letter-spacing:1px;color:var(--text1);background:rgba(7,13,27,0.85);padding:4px 10px;border-radius:4px;border:1px solid var(--border);">🗺 INDONESIA NATIONAL ENERGY GRID</div>
        <div id="cmd-map" style="height:100%;width:100%;"></div>
        <div class="map-legend">
          <div class="map-legend-item"><div class="legend-dot" style="background:var(--blue)"></div>Refinery</div>
          <div class="map-legend-item"><div class="legend-dot" style="background:var(--green)"></div>Terminal</div>
          <div class="map-legend-item"><div class="legend-dot" style="background:var(--red)"></div>Alert Zone</div>
        </div>
      </div>
      <div class="card" style="padding:10px 12px;">
        <div class="card-title"><span class="card-title-dot" style="background:var(--purple);box-shadow:0 0 8px var(--purple);"></span>AI DECISION ENGINE
          <span style="margin-left:auto;font-size:9px;color:var(--purple);">ACTIVE</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${AI_ACTIONS.map((a,i) => `
          <div class="ai-action">
            <div class="ai-action-num">${i+1}</div>
            <div class="ai-action-body">
              <div class="ai-action-title">${a.title}</div>
              <div class="ai-action-meta">
                <div class="ai-action-field"><div class="ai-action-field-label">Unit</div><div class="ai-action-field-val">${a.unit}</div></div>
                <div class="ai-action-field"><div class="ai-action-field-label">Est. Loss Avoided</div><div class="ai-action-field-val">${a.loss}</div></div>
                <div class="ai-action-field"><div class="ai-action-field-label">Status</div><div class="ai-action-field-val"><span class="badge ${a.status}">${a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></div></div>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function renderAlertPanel() {
    return `
    <div class="card fill" style="display:flex;flex-direction:column;min-height:0;padding:10px 12px;">
      <div class="card-title">
        <span class="card-title-dot" style="background:var(--red);box-shadow:var(--glow-red);"></span>
        LIVE ALERT
        <span style="margin-left:auto;display:flex;gap:4px;">
          <span class="badge critical"><span class="badge-dot critical"></span>3 Critical</span>
          <span class="badge warning"><span class="badge-dot warning"></span>7 Warning</span>
        </span>
      </div>
      <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:5px;" id="alert-list">
        ${ALERTS.map(a => `
        <div class="alert-item ${a.level}">
          <div class="alert-icon">${a.icon}</div>
          <div class="alert-body">
            <div class="alert-title">
              <span ${a.level==='critical'?'class="blink"':''} style="color:${a.level==='critical'?'var(--red)':a.level==='warning'?'var(--yellow)':'var(--green)'};">●</span>
              ${a.title}
            </div>
            <div class="alert-meta"><span>${a.loc}</span> · Severity: <strong>${a.severity}</strong></div>
            <div class="alert-meta" style="margin-top:3px;display:flex;align-items:center;gap:6px;">
              Est. Loss Avoided: <strong>${a.loss}</strong>
              <span class="badge ${a.status.toLowerCase()}">${a.status}</span>
              <span style="margin-left:auto;color:var(--text3);">${a.time}</span>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
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
