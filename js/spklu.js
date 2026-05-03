/* ============================================================
   Dashboard 7 — SPKLU EV Charging Dashboard
   ============================================================ */

window.DashSPKLU = (() => {
  const u = () => App.utils;
  let charts = {};
  let maps = {};
  let intervals = [];

  const STATIONS = [
    { loc:'Jakarta SPKLU 01',  type:'DC Fast 50kW', avail:'3/4', sessions:120, kwh:4500, revenue:'IDR 1,200,000', status:'online' },
    { loc:'Jakarta SPKLU 02',  type:'DC Fast 50kW', avail:'3/4', sessions:120, kwh:4500, revenue:'IDR 1,200,000', status:'online' },
    { loc:'Jakarta SPKLU 03',  type:'DC Fast 50kW', avail:'3/4', sessions:120, kwh:4500, revenue:'IDR 100,000',   status:'online' },
    { loc:'Surabaya SPKLU 04', type:'AC 22kW',      avail:'2/4', sessions:99,  kwh:4500, revenue:'IDR 100,000',   status:'maintenance' },
    { loc:'Surabaya SPKLU 05', type:'AC 22kW',      avail:'2/4', sessions:80,  kwh:4500, revenue:'IDR 150,000',   status:'online' },
  ];

  const HOURLY = Array.from({length:24},(_,i) => {
    const peak = i >= 7 && i <= 9 || i >= 17 && i <= 20;
    return peak ? App.utils.rand(140, 200) : App.utils.rand(20, 80);
  });

  function init() {
    const c = document.getElementById('dash-spklu');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => { initCharts(); initMap(); startUpdates(); }, 80);
  }

  function render() {
    return `
    <div style="display:grid;grid-template-rows:56px 1fr 118px;padding:10px;gap:10px;height:100%;">

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'Active Stations',      val:'342 / 360', unit:'', delta:'▲ Online', color:'green',  id:'ast' },
          { label:'Charging Sessions',    val:'1,245',     unit:'', delta:'▲ Today',  color:'blue',   id:'cs' },
          { label:'Energy Delivered',     val:'45,600',    unit:'kWh', delta:'▲ +12.3%', color:'cyan', id:'ed' },
          { label:'Avg Utilization',      val:'78',        unit:'%',   delta:'▲ +5%',  color:'yellow', id:'au' },
          { label:'Station Downtime',     val:'5%',        unit:'',    delta:'⚠ 18 Stations', color:'red', id:'sd' },
          { label:'Revenue Today',        val:'IDR 15.5',  unit:'M',   delta:'▲ +8.2%', color:'purple', id:'rv' },
        ].map(k => `
        <div class="kpi-card ${k.color} dd-clickable" data-dd-title="${k.label}" data-dd-domain="spklu" data-dd-value="${(k.val||'').toString().replace(/<[^>]*>/g,'')}" data-dd-unit="${k.unit||''}" data-dd-delta="${k.delta||''}" data-dd-color="${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit">${k.unit}</span></div>
          <div class="kpi-delta ${k.delta.startsWith('▲')?'up':k.delta.startsWith('▼')?'down':'warn'}">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="spklu-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- Body -->
      <div style="display:grid;grid-template-columns:200px 1fr 240px;gap:10px;min-height:0;">

        <!-- Charger Utilization Panel -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot"></span>CHARGER UTILIZATION</div>
          <div style="font-size:9.5px;color:var(--text2);margin-bottom:5px;">Usage Per Hour</div>
          <div style="height:60px;position:relative;margin-bottom:8px;"><canvas id="spklu-hourly"></canvas></div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-bottom:10px;"><span>6AM</span><span>12AM</span><span>6PM</span></div>
          <div class="card-title" style="margin:0 0 5px;"><span class="card-title-dot" style="background:var(--red);box-shadow:var(--glow-red);"></span>PEAK DEMAND</div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">
            <div style="position:relative;width:100px;height:60px;overflow:hidden;">
              <canvas id="spklu-peak-gauge" style="position:absolute;top:0;left:0;width:100px;height:100px;"></canvas>
              <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);text-align:center;">
                <div style="font-size:18px;font-weight:700;color:var(--red);">85%</div>
                <div style="font-size:8px;color:var(--text3);">of max</div>
              </div>
            </div>
          </div>
          <div class="card-title" style="margin:0 0 5px;"><span class="card-title-dot" style="background:var(--yellow);"></span>CHARGING DURATION</div>
          <div style="height:44px;position:relative;margin-bottom:4px;"><canvas id="spklu-duration"></canvas></div>
          <div style="font-size:9px;color:var(--text3);text-align:center;">Average: 45 minutes</div>
          <div class="divider"></div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--purple);"></span>QUEUE ESTIMATION</div>
          <div style="height:40px;position:relative;"><canvas id="spklu-queue"></canvas></div>
        </div>

        <!-- Live Map -->
        <div class="card" style="padding:0;overflow:hidden;position:relative;border-radius:var(--radius-lg);">
          <div style="position:absolute;top:8px;left:8px;z-index:500;font-size:10px;font-weight:600;color:var(--text1);background:rgba(7,13,27,0.85);padding:4px 10px;border-radius:4px;border:1px solid var(--border);">⚡ SPKLU EV LIVE MAP</div>
          <div style="position:absolute;top:8px;right:8px;z-index:500;display:flex;gap:4px;flex-wrap:wrap;max-width:200px;">
            <span style="font-size:8.5px;display:flex;align-items:center;gap:3px;color:var(--green);background:rgba(7,13,27,0.8);padding:2px 5px;border-radius:3px;border:1px solid var(--border);">
              <div style="width:6px;height:6px;border-radius:50%;background:var(--green);"></div>Available 210
            </span>
            <span style="font-size:8.5px;display:flex;align-items:center;gap:3px;color:var(--yellow);background:rgba(7,13,27,0.8);padding:2px 5px;border-radius:3px;border:1px solid var(--border);">
              <div style="width:6px;height:6px;border-radius:50%;background:var(--yellow);"></div>Occupied 115
            </span>
            <span style="font-size:8.5px;display:flex;align-items:center;gap:3px;color:var(--red);background:rgba(7,13,27,0.8);padding:2px 5px;border-radius:3px;border:1px solid var(--border);">
              <div style="width:6px;height:6px;border-radius:50%;background:var(--red);"></div>Offline 17
            </span>
          </div>
          <div id="spklu-map" style="height:100%;width:100%;"></div>
          <div class="map-legend">
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--green)"></div>Available</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--yellow)"></div>Occupied</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--red)"></div>Offline</div>
            <div class="map-legend-item"><div class="legend-dot" style="background:var(--orange)"></div>High Demand</div>
          </div>
          <!-- Live camera feed -->
          <div style="position:absolute;bottom:10px;right:10px;z-index:500;background:rgba(7,13,27,0.92);border:1px solid var(--border);border-radius:var(--radius);padding:6px 8px;width:160px;">
            <div style="font-size:8.5px;color:var(--cyan);font-family:'JetBrains Mono',monospace;margin-bottom:3px;">● LIVE CAMERA FEED</div>
            <div style="background:var(--bg0);height:60px;border-radius:4px;overflow:hidden;position:relative;">
              <div class="cctv-scanline"></div>
              <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,255,0.01) 2px,rgba(0,200,255,0.01) 4px);"></div>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.15;font-size:28px;">⚡</div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:8px;color:var(--text3);font-family:'JetBrains Mono',monospace;">
              <span>SPKLU_SPK 03</span>
              <span id="spklu-cctv-pwr">2261 kW</span>
            </div>
          </div>
        </div>

        <!-- Energy & Grid Panel -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot" style="background:var(--cyan);"></span>ENERGY & GRID PANEL</div>
          <div style="font-size:9.5px;color:var(--text2);margin-bottom:4px;">kWh Delivered</div>
          <div style="height:70px;position:relative;margin-bottom:6px;"><canvas id="spklu-grid-bar"></canvas></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            ${[['Total kWh','45,600 kWh','var(--green)'],['Peak Load','322 kW','var(--red)'],['CO₂ Saved','18.2 ton','var(--cyan)'],['Cost/kWh','IDR 2,500','var(--yellow)']].map(([l,v,c]) => `
            <div class="stat-box"><div class="stat-box-val" style="color:${c};font-size:13px;">${v}</div><div class="stat-box-label">${l}</div></div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--blue);"></span>GRID LOADING</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div style="position:relative;width:76px;height:44px;overflow:hidden;flex-shrink:0;">
              <canvas id="spklu-grid-gauge" style="position:absolute;top:0;left:0;width:76px;height:76px;"></canvas>
              <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);text-align:center;">
                <div style="font-size:15px;font-weight:700;color:var(--blue);">60%</div>
              </div>
            </div>
            <div style="flex:1;font-size:9.5px;color:var(--text2);">
              Grid loading at 60% of capacity.<br>
              <span style="color:var(--green);">✓ Within safe operating range</span>
            </div>
          </div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--yellow);"></span>PEAK DEMAND TREND</div>
          <div style="height:50px;position:relative;"><canvas id="spklu-peak-trend"></canvas></div>
          <div class="divider"></div>
          <div class="card-title" style="margin:4px 0;"><span class="card-title-dot" style="background:var(--green);"></span>ENERGY COST ESTIMATE</div>
          <div style="padding:6px 8px;background:var(--bg3);border:1px solid var(--border-bright);border-radius:var(--radius);">
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;">
              <span style="color:var(--text2);">Cost Calculation</span>
              <span style="color:var(--text0);font-weight:600;">IDR 1,000,000</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;">
              <span style="color:var(--text2);">→ IDR 5,244.30</span>
              <span style="color:var(--green);">IDR 15,500,000</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom: Station Performance Table -->
      <div style="grid-column:1/-1;">
        <div class="card" style="padding:10px 12px;height:100%;">
          <div class="card-title"><span class="card-title-dot"></span>STATION PERFORMANCE TABLE</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Charger Type</th>
                <th>Availability</th>
                <th>Sessions Today</th>
                <th>kWh Delivered</th>
                <th>Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${STATIONS.map(s => `<tr>
                <td class="highlight">${s.loc}</td>
                <td>${s.type}</td>
                <td>${s.avail}</td>
                <td>${s.sessions}</td>
                <td>${s.kwh.toLocaleString()}</td>
                <td>${s.revenue}</td>
                <td><span class="badge ${s.status==='online'?'online':s.status==='maintenance'?'maint':'offline'}">${s.status.charAt(0).toUpperCase()+s.status.slice(1)}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>`;
  }

  function initCharts() {
    const u2 = u();
    const ks = ['ast','cs','ed','au','sd','rv'];
    const cls = ['#00d4a0','#1a7fe8','#00c8ff','#f5a623','#ff4055','#a855f7'];
    ks.forEach((k,i) => { charts[`spk${k}`] = u2.sparkline(`spklu-spk-${k}`, u2.timeSeries(18, 50+i*3, 0.05), cls[i]); });

    // Hourly usage bar chart
    charts.hourly = u2.miniBar('spklu-hourly',
      Array.from({length:24},(_,i) => `${i}h`),
      HOURLY,
      HOURLY.map((v,i) => {
        if (i >= 7 && i <= 9 || i >= 17 && i <= 20) return '#ff4055';
        return v > 80 ? '#f5a623' : '#1a7fe8';
      })
    );

    // Peak gauge
    charts.peakGauge = u2.gauge('spklu-peak-gauge', 85, 100, '#ff4055');

    // Duration histogram
    charts.duration = u2.miniBar('spklu-duration',
      ['<15','15-30','30-45','45-60','60-90','>90'],
      [15, 28, 35, 42, 20, 10],
      ['#1a7fe8','#1a7fe8','#00c8ff','#00d4a0','#f5a623','#f5a623']
    );

    // Queue estimation
    charts.queue = u2.miniBar('spklu-queue',
      ['Tue','Wed','Thu','Mon','Fri'],
      [2.5, 3.2, 2.8, 3.5, 4.1],
      '#a855f7'
    );

    // Grid bar chart (monthly)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    charts.gridBar = u2.miniBar('spklu-grid-bar', months,
      u2.timeSeries(12, 40000, 0.2),
      months.map((_,i) => i === 10 ? '#ff4055' : i === 11 ? '#1a7fe8' : '#1a7fe840')
    );

    // Grid loading gauge
    charts.gridGauge = u2.gauge('spklu-grid-gauge', 60, 100, '#1a7fe8');

    // Peak demand trend
    charts.peakTrend = u2.lineChart('spklu-peak-trend', u2.timeLabels(14, 5), [
      { data: u2.timeSeries(14, 130, 0.08), borderColor:'#f5a623', backgroundColor:'rgba(245,166,35,0.06)', borderWidth:1.5, tension:0.4, fill:true, pointRadius:0, label:'Peak (kW)' },
    ], { legend: { display: false } });

    // CCTV power display
    const iid = setInterval(() => {
      const el = document.getElementById('spklu-cctv-pwr');
      if (!el) { clearInterval(iid); return; }
      el.textContent = `${(2200 + Math.random()*200).toFixed(0)} kW`;
    }, 3000);
    intervals.push(iid);
  }

  function initMap() {
    if (maps.main) return;
    maps.main = L.map('spklu-map', { zoomControl: false, attributionControl: true })
      .setView([-2.5, 118], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:19 }).addTo(maps.main);

    const stationData = [
      { name:'SPKLU Jakarta 01',   lat:-6.21, lng:106.85, status:'available',  load:'45%' },
      { name:'SPKLU Jakarta 02',   lat:-6.18, lng:106.78, status:'occupied',   load:'92%' },
      { name:'SPKLU Jakarta 03',   lat:-6.25, lng:106.92, status:'high-demand',load:'98%' },
      { name:'SPKLU Surabaya 01',  lat:-7.25, lng:112.75, status:'available',  load:'62%' },
      { name:'SPKLU Surabaya 02',  lat:-7.30, lng:112.80, status:'offline',    load:'0%' },
      { name:'SPKLU Bandung 01',   lat:-6.91, lng:107.61, status:'available',  load:'38%' },
      { name:'SPKLU Medan 01',     lat: 3.58, lng: 98.67, status:'available',  load:'41%' },
      { name:'SPKLU Balikpapan 01',lat:-1.27, lng:116.83, status:'occupied',   load:'88%' },
      { name:'SPKLU Makassar 01',  lat:-5.14, lng:119.43, status:'available',  load:'29%' },
      { name:'SPKLU Semarang 01',  lat:-6.97, lng:110.42, status:'available',  load:'55%' },
      { name:'SPKLU Yogyakarta 01',lat:-7.80, lng:110.37, status:'high-demand',load:'95%' },
      { name:'SPKLU Palembang 01', lat:-2.99, lng:104.76, status:'occupied',   load:'80%' },
    ];

    const colorMap = { available:'#00d4a0', occupied:'#f5a623', offline:'#ff4055', 'high-demand':'#ff7b00' };
    const emojiMap = { available:'⚡', occupied:'🔌', offline:'❌', 'high-demand':'🔥' };

    stationData.forEach(s => {
      const c = colorMap[s.status];
      const html = `<div style="background:${c}20;border:2px solid ${c};border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 0 10px ${c}50;">${emojiMap[s.status]}</div>`;
      L.marker([s.lat,s.lng], { icon: L.divIcon({ className:'', html, iconSize:[24,24], iconAnchor:[12,12] }) })
        .addTo(maps.main)
        .bindPopup(`<div style="background:#111c35;border:1px solid #2a5298;border-radius:6px;padding:8px 10px;color:#eef2ff;font-size:11px;font-family:Inter,sans-serif;min-width:160px;"><strong>${s.name}</strong><br><span style="color:${c};">${s.status.toUpperCase()}</span><br>Load: <strong>${s.load}</strong></div>`);
    });

    // High demand zones
    [[-6.22,106.88],[-7.27,112.77]].forEach(p => {
      L.circle(p, { radius:12000, color:'#ff7b00', weight:0, fillColor:'#ff7b00', fillOpacity:0.06 }).addTo(maps.main);
    });
  }

  function startUpdates() {
    const iid = setInterval(() => {
      if (!document.getElementById('spklu-map')) { clearInterval(iid); return; }
    }, 5000);
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
