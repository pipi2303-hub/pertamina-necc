/* ============================================================
   Dashboard 5 — Logistics Control Dashboard
   ============================================================ */

window.DashLogistics = (() => {
  const u = () => App.utils;
  let charts = {};
  let maps = {};
  let intervals = [];

  const VESSELS = [
    { name:'Cargo Vessel 01', type:'Tanker', vol:'500,000 KL', cargo:'Cargo XK', eta:'29 hrs', update:'25 hrs', pressure:'78 Bar', status:'normal' },
    { name:'Cargo Vessel 02', type:'LNG Carrier', vol:'300,000 KL', cargo:'Cargo YL', eta:'35 hrs', update:'2 hrs', pressure:'78 Bar', status:'normal' },
    { name:'Cargo Vessel 03 (Alert)', type:'Product Tanker', vol:'Depots', cargo:'Cargo ZB', eta:'38 mnt', update:'36 mnt', pressure:'78 Bar', status:'critical' },
  ];

  const RECON_TABLE = [
    { status:'Received', dispatch:'300,000 KL', delivery:'500,000 KL' },
    { status:'In-Transit', dispatch:'200,000 KL', delivery:'200,000 KL' },
    { status:'Delivered', dispatch:'300,000 KL', delivery:'495,000 KL' },
    { status:'Received', dispatch:'0 KL', delivery:'0 KL' },
    { status:'Total', dispatch:'495,000 KL', delivery:'495,000 KL' },
  ];

  function init() {
    const c = document.getElementById('dash-logistics');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => { initCharts(); initMap(); startUpdates(); }, 80);
  }

  function render() {
    return `
    <div style="display:grid;grid-template-rows:56px 1fr 96px;padding:10px;gap:10px;height:100%;">

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'Active Shipments',  val:'450',   unit:'',    delta:'▲ +5%',    color:'blue',   id:'as' },
          { label:'On-Time Delivery',  val:'95.2',  unit:'%',   delta:'▲ +1.1%',  color:'green',  id:'otd' },
          { label:'Route Deviation',   val:'8',     unit:'',    delta:'⚠ -3 fixed', color:'yellow', id:'rd' },
          { label:'Pipeline Pressure', val:'78',    unit:'Bar', delta:'▲ Normal', color:'cyan',   id:'pp' },
          { label:'Delivery Variance', val:'0.5',   unit:'%',   delta:'✓ Within limit', color:'green', id:'dv' },
          { label:'Critical Alerts',   val:'3',     unit:'',    delta:'⚠ Requires action', color:'red', id:'ca' },
        ].map(k => `
        <div class="kpi-card ${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit">${k.unit}</span></div>
          <div class="kpi-delta ${k.delta.startsWith('▲')||k.delta.startsWith('✓')?'up':k.delta.startsWith('▼')?'down':'warn'}">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="log-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- Body -->
      <div style="display:grid;grid-template-columns:220px 1fr 260px;gap:10px;min-height:0;">

        <!-- Truck GPS & Status -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot"></span>TRUCK GPS & E-SEAL STATUS</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;">
            ${[
              { label:'CAM 01', color:'var(--blue)' },
              { label:'CAM 02', color:'var(--green)' },
              { label:'CCTV', color:'var(--cyan)' },
              { label:'CCTV', color:'var(--yellow)' },
            ].map(c => `
            <div class="cctv-cell" style="height:50px;border-radius:4px;border:1px solid var(--border);background:var(--bg0);position:relative;overflow:hidden;">
              <div class="cctv-scanline"></div>
              <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,255,0.01) 2px,rgba(0,200,255,0.01) 4px);"></div>
              <div style="position:absolute;top:3px;left:4px;font-size:7px;color:${c.color};font-family:'JetBrains Mono',monospace;">● ${c.label}</div>
              <div style="position:absolute;bottom:3px;right:4px;font-size:7px;color:var(--text3);font-family:'JetBrains Mono',monospace;" id="cctv-t-${c.label.replace(' ','')}"></div>
            </div>`).join('')}
          </div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--green);"></span>ROUTE COMPLIANCE</div>
          <div style="height:50px;position:relative;margin-bottom:8px;"><canvas id="log-route-chart"></canvas></div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--yellow);"></span>DISPATCH vs DELIVERY</div>
          <table class="data-table" style="font-size:10px;">
            <thead><tr><th>Volume</th><th>Dispatch</th><th>Delivery</th></tr></thead>
            <tbody>
              ${RECON_TABLE.map(r => `<tr>
                <td class="${r.status==='Total'?'highlight':''}">${r.status}</td>
                <td>${r.dispatch}</td>
                <td>${r.delivery}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <!-- Logistics Map -->
        <div class="card" style="padding:0;overflow:hidden;position:relative;border-radius:var(--radius-lg);">
          <div style="position:absolute;top:8px;left:8px;z-index:500;font-size:10px;font-weight:600;color:var(--text1);background:rgba(7,13,27,0.85);padding:4px 10px;border-radius:4px;border:1px solid var(--border);">🗺 LOGISTICS TRACKING MAP</div>
          <div id="log-map" style="height:100%;width:100%;"></div>
          <div class="map-legend">
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--blue)"></div>Pipeline Route</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--green)"></div>Pipeline Depot</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--yellow)"></div>Delivery Point</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--red)"></div>GPS Trail</div>
          </div>
        </div>

        <!-- Vessel & Pipeline Monitoring -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot" style="background:var(--cyan);"></span>VESSEL & PIPELINE MONITORING</div>
          <div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:5px;display:flex;align-items:center;gap:6px;">
            VESSEL AIS POSITIONS
            <span class="badge normal" style="font-size:8px;padding:1px 5px;"><span class="badge-dot online"></span> AIS tracking</span>
          </div>
          <div style="flex:1;overflow-y:auto;">
            ${VESSELS.map(v => `
            <div class="vessel-card">
              <div class="vessel-icon">🚢</div>
              <div class="vessel-body">
                <div class="vessel-name" style="${v.status==='critical'?'color:var(--red);':''}">${v.name}</div>
                <div class="vessel-meta">
                  Cargo Vol: <span>${v.vol}</span>
                  · ETA: <span>${v.eta}</span>
                  · Update: <span>${v.update}</span>
                </div>
              </div>
              <span class="badge ${v.status==='critical'?'critical':'normal'}">${v.status==='critical'?'Alert':'Active'}</span>
            </div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--blue);"></span>PIPELINE PRESSURE</div>
          <div style="height:55px;position:relative;"><canvas id="log-pressure-chart"></canvas></div>
          <div style="margin-top:5px;display:flex;align-items:center;gap:6px;padding:5px 8px;background:rgba(255,64,85,0.05);border:1px solid rgba(255,64,85,0.2);border-radius:var(--radius);">
            <span style="color:var(--red);font-size:11px;">⚠</span>
            <span style="font-size:10px;color:var(--text2);">Pipeline Pressure Alert</span>
            <span style="margin-left:auto;font-size:10px;color:var(--red);">Leak Detection</span>
          </div>
        </div>

      </div>

      <!-- Bottom: Reconciliation Engine -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;min-height:0;">
        ${[
          { label:'Dispatched Volume', val:'500,000 KL', delta:'▼ Variance', color:'var(--yellow)' },
          { label:'In-Transit Volume', val:'200,000 KL', delta:'▲ Variance', color:'var(--blue)' },
          { label:'Received Volume',   val:'495,000 KL', delta:'▲ Normal',  color:'var(--green)' },
        ].map(s => `
        <div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:14px;">
          <div style="flex:1;">
            <div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:4px;">${s.label}</div>
            <div style="font-size:20px;font-weight:700;color:${s.color};">${s.val}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-size:10px;font-weight:600;color:${s.delta.startsWith('▲')?'var(--green)':'var(--yellow)'};">${s.delta}</div>
            <div style="width:36px;height:36px;border-radius:50%;border:3px solid ${s.color};display:flex;align-items:center;justify-content:center;font-size:14px;">${s.delta.startsWith('▲')?'↑':'↓'}</div>
          </div>
        </div>`).join('')}
      </div>

    </div>`;
  }

  function initCharts() {
    const u2 = u();
    const ks = ['as','otd','rd','pp','dv','ca'];
    const cls = ['#1a7fe8','#00d4a0','#f5a623','#00c8ff','#00d4a0','#ff4055'];
    ks.forEach((k,i) => { charts[`spk${k}`] = u2.sparkline(`log-spk-${k}`, u2.timeSeries(18, 50+i*4, 0.05), cls[i]); });

    const labels = u2.timeLabels(16, 5);
    charts.route = u2.lineChart('log-route-chart', labels, [
      { data: u2.timeSeries(16, 95, 0.02), borderColor:'#00d4a0', borderWidth:1.5, fill:false, tension:0.4, pointRadius:0, label:'Route Compliance' },
    ], { legend: { display: false } });

    charts.pressure = u2.lineChart('log-pressure-chart', u2.timeLabels(16, 5), [
      { data: u2.timeSeries(16, 78, 0.04), borderColor:'#00c8ff', borderWidth:1.5, fill: true, backgroundColor:'rgba(0,200,255,0.05)', tension:0.4, pointRadius:0, label:'Pipeline Pressure (Bar)' },
    ], { legend: { display: false } });

    // CCTV timestamps
    const iid = setInterval(() => {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      ['CAM01','CAM02','CCTV','CCTV'].forEach(id => {
        const el = document.getElementById(`cctv-t-${id}`);
        if (el) el.textContent = t;
      });
    }, 1000);
    intervals.push(iid);
  }

  function initMap() {
    if (maps.main) return;
    maps.main = L.map('log-map', { zoomControl: false, attributionControl: true })
      .setView([-2.5, 117], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:19 }).addTo(maps.main);

    // Pipeline routes — 3-layer: glow + solid bright + animated dash
    const pipelines = [
      [[-6.21,106.85],[-7.72,109.01],[-7.25,112.75]],
      [[-2.99,104.76],[1.67,101.44],[3.58,98.67]],
      [[-1.27,116.83],[0.13,117.50],[-5.14,119.43]],
    ];
    pipelines.forEach((route, idx) => {
      // Layer 1: glow halo lebar
      L.polyline(route, {
        color: '#00d4ff', weight: 22, opacity: 0.12,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(maps.main);

      // Layer 2: outer glow medium
      L.polyline(route, {
        color: '#00d4ff', weight: 12, opacity: 0.25,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(maps.main);

      // Layer 3: solid bright line utama
      L.polyline(route, {
        color: '#00d4ff', weight: 6, opacity: 1,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(maps.main);

      // Layer 4: animated flowing dash putih
      const flowLine = L.polyline(route, {
        color: '#ffffff', weight: 4, opacity: 0.85,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(maps.main);

      const el = flowLine.getElement();
      if (el) {
        el.classList.add('log-pipeline-dash');
        el.style.animationDelay = `${idx * 0.45}s`;
      }

      // Layer 5: pulse dot bergerak
      const pulseEl = L.polyline(route, {
        color: '#00ffff', weight: 10, opacity: 0.9,
        lineCap: 'round'
      }).addTo(maps.main);
      const pel = pulseEl.getElement();
      if (pel) {
        pel.classList.add('log-pipeline-pulse');
        pel.style.animationDelay = `${idx * 0.7}s`;
      }
    });

    // Depots
    const depots = [
      { name:'Jakarta Depot', lat:-6.21, lng:106.85 },
      { name:'Surabaya Depot', lat:-7.25, lng:112.75 },
      { name:'Balikpapan Depot', lat:-1.27, lng:116.83 },
      { name:'Medan Depot', lat:3.58, lng:98.67 },
      { name:'Makassar Depot', lat:-5.14, lng:119.43 },
    ];
    depots.forEach(d => {
      const html = `<div style="background:#00d4a020;border:2px solid #00d4a0;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 0 8px #00d4a060;">🏪</div>`;
      L.marker([d.lat,d.lng], { icon: L.divIcon({ className:'', html, iconSize:[22,22], iconAnchor:[11,11] }) })
        .addTo(maps.main).bindPopup(`<div style="background:#111c35;border:1px solid #2a5298;border-radius:6px;padding:8px;color:#eef2ff;font-size:11px;font-family:Inter,sans-serif;">${d.name}</div>`);
    });

    // GPS Truck trails
    const trucks = [
      { pts: [[-6.4,107.1],[-6.35,107.4],[-6.3,107.7]] },
      { pts: [[-7.5,110.2],[-7.4,110.6],[-7.3,111.0]] },
    ];
    trucks.forEach(t => {
      L.polyline(t.pts, { color:'#ff4055', weight:3, opacity:0.9, dashArray:'5,5', lineCap:'round' }).addTo(maps.main);
      const last = t.pts[t.pts.length-1];
      const html = `<div style="background:#ff405520;border:2px solid #ff4055;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:9px;">🚛</div>`;
      L.marker(last, { icon: L.divIcon({ className:'', html, iconSize:[18,18], iconAnchor:[9,9] }) }).addTo(maps.main);
    });

    // Vessel positions
    const vessels = [
      { lat: 0.5, lng: 104.2, name:'Tanker Alpha' },
      { lat: -4.0, lng: 108.0, name:'LNG Carrier Beta' },
    ];
    vessels.forEach(v => {
      const html = `<div style="background:#00c8ff20;border:2px solid #00c8ff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 0 8px #00c8ff50;">🚢</div>`;
      L.marker([v.lat,v.lng], { icon: L.divIcon({ className:'', html, iconSize:[22,22], iconAnchor:[11,11] }) })
        .addTo(maps.main).bindPopup(`<div style="background:#111c35;border:1px solid #2a5298;border-radius:6px;padding:8px;color:#eef2ff;font-size:11px;font-family:Inter,sans-serif;">${v.name}</div>`);
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
