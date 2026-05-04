/* ============================================================
   Dashboard 3 — Refinery Performance Dashboard
   ============================================================ */

window.DashRefinery = (() => {
  const u = () => App.utils;
  let charts = {};
  let intervals = [];

  const UNITS = [
    { name:'CDU', full:'Crude Distillation Unit', status:'running', pct:'96% Eff.', color:'var(--green)' },
    { name:'RFCC', full:'Residue Fluid Cat. Cracking', status:'running', pct:'92% Eff.', color:'var(--green)' },
    { name:'HYDROCRACKER', full:'Hydrocracker Unit', status:'offline', pct:'Maintenance', color:'var(--red)' },
    { name:'BLENDING', full:'Product Blending Unit', status:'stable', pct:'Optimized', color:'var(--blue)' },
    { name:'UTILITIES', full:'Utility Systems', status:'stable', pct:'Stable', color:'var(--blue)' },
  ];

  const ALERTS = [
    { level:'warning', icon:'⚠️', title:'Yield Drop: AVTUR', desc:'3.5% below target' },
    { level:'warning', icon:'⏱', title:'Downtime: Hydrocracker', desc:'12h 30m offline' },
    { level:'warning', icon:'⚡', title:'Abnormal Energy: RFCC', desc:'Consumption spike +8%' },
    { level:'critical', icon:'🔴', title:'Product Mismatch: LPG', desc:'Variance −2.1%' },
  ];

  const FLOW_NODES = [
    { id:'crude-in',  label:'CRUDE OIL', val:'120,000 BPD', icon:'🛢️', x:50, y:200 },
    { id:'cdu',       label:'DISTILLATION UNIT (CDU)', val:'120,000 BPD', icon:'🏭', x:200, y:200 },
    { id:'vdu',       label:'VACUUM UNIT (VDU)', val:'40,000 BPD', icon:'🏭', x:200, y:300 },
    { id:'fcc',       label:'FLUID CAT. CRACKING', val:'10,000 BPD', icon:'⚗️', x:360, y:150 },
    { id:'hydro',     label:'HYDROCRACKER', val:'24,000 BPD', icon:'⚙️', x:360, y:290 },
    { id:'blending',  label:'BLENDING & STORAGE', val:'34,000 BPD', icon:'🔄', x:510, y:220 },
    { id:'storage',   label:'PRODUCT STORAGE', val:'54,000 BPD', icon:'🛢️', x:640, y:160 },
    { id:'storage2',  label:'STORAGE', val:'36,000 BPD', icon:'🛢️', x:640, y:280 },
  ];

  const PRODUCTS = [
    { label:'Gasoline', val:14000, color:'#1a7fe8', pct:'14%' },
    { label:'Diesel',   val:36800, color:'#00d4a0', pct:'31%' },
    { label:'AVTUR',    val:14400, color:'#f5a623', pct:'12%' },
    { label:'LPG',      val:3600,  color:'#ff7b00', pct:'3%' },
    { label:'Petrochem',val:9600,  color:'#a855f7', pct:'8%' },
    { label:'Others',   val:42000, color:'#4a5f82', pct:'32%' },
  ];

  function init() {
    const c = document.getElementById('dash-refinery');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => { initCharts(); startUpdates(); }, 80);
  }

  function render() {
    return `
    <div style="display:grid;grid-template-rows:56px 1fr 98px;padding:10px;gap:10px;height:100%;">

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'Crude Intake',        val:'120,000', unit:'BPD', delta:'▲ +1.5%', color:'blue',   id:'ci' },
          { label:'Refinery Utilization',val:'94.2',    unit:'%',   delta:'Target: 95%', color:'cyan', id:'ru' },
          { label:'Product Yield',       val:'91.8',    unit:'%',   delta:'▲ +0.4%', color:'green', id:'py' },
          { label:'Downtime Hours',      val:'12.5',    unit:'hrs', delta:'⚠ Target <24h', color:'yellow', id:'dt' },
          { label:'Energy Consumption',  val:'580',     unit:'MJ/bbl', delta:'▼ −2.1%', color:'green', id:'ec' },
          { label:'Output Deviation',    val:'+1.2',    unit:'%',   delta:'▲ Above plan', color:'orange', id:'od' },
        ].map(k => `
        <div class="kpi-card ${k.color} dd-clickable" data-dd-title="${k.label}" data-dd-domain="refinery" data-dd-value="${(k.val||'').toString().replace(/<[^>]*>/g,'')}" data-dd-unit="${k.unit||''}" data-dd-delta="${k.delta||''}" data-dd-color="${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit">${k.unit}</span></div>
          <div class="kpi-delta ${k.delta.startsWith('▲')?'up':k.delta.startsWith('▼')?'down':'warn'}">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="ref-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- Body -->
      <div style="display:grid;grid-template-columns:200px 1fr 230px;gap:10px;min-height:0;">

        <!-- Process Unit Status -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot"></span>PROCESS UNIT STATUS</div>
          <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
            ${UNITS.map(u => `
            <div class="process-unit">
              <div class="process-unit-indicator ${u.status}"></div>
              <div class="process-unit-body">
                <div class="process-unit-name">${u.name}</div>
                <div class="process-unit-status">${u.pct}</div>
              </div>
              <span class="badge ${u.status==='running'?'running':u.status==='offline'?'critical':'initiated'}">${u.status==='running'?'RUNNING':u.status==='offline'?'MAINT':'STABLE'}</span>
            </div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin-top:4px;"><span class="card-title-dot" style="background:var(--cyan);"></span>LIVE CAMERA FEED</div>
          <div class="cctv-feed" style="height:80px;flex-shrink:0;">
            <div style="width:100%;height:100%;background:linear-gradient(135deg,#0a1428,#0d1e3a);position:relative;overflow:hidden;border-radius:var(--radius);">
              <div class="cctv-scanline"></div>
              <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,255,0.015) 2px,rgba(0,200,255,0.015) 4px);"></div>
              <div style="position:absolute;top:4px;left:6px;font-size:8px;color:var(--green);font-family:'JetBrains Mono',monospace;">● REC</div>
              <div style="position:absolute;top:4px;right:6px;font-size:8px;color:var(--cyan);font-family:'JetBrains Mono',monospace;" id="ref-cctv-time">--:--:--</div>
              <div style="position:absolute;bottom:4px;left:6px;font-size:8px;color:var(--text2);font-family:'JetBrains Mono',monospace;">CAM-CILACAP-01</div>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.15;">
                <svg viewBox="0 0 60 40" style="width:100%;height:60%;fill:var(--blue2);">
                  <rect x="5" y="25" width="8" height="12"/><rect x="18" y="18" width="8" height="19"/><rect x="31" y="10" width="8" height="27"/>
                  <rect x="44" y="15" width="8" height="22"/>
                  <path d="M5 24 L13 17 Q22 10 31 9 L44 14" stroke="var(--cyan)" stroke-width="1" fill="none" opacity="0.6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Flow Diagram -->
        <div class="card" style="padding:10px 12px;display:flex;flex-direction:column;min-height:0;">
          <div class="card-title"><span class="card-title-dot" style="background:var(--cyan);"></span>FLUID CATALYTIC CRACKING — PROCESS FLOW</div>
          <div style="flex:1;position:relative;min-height:0;display:flex;align-items:center;justify-content:center;">
            <style>
              @keyframes rf-flow-a { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -13; } }
              @keyframes rf-flow-b { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -12; } }
              @keyframes rf-flow-c { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -10; } }
              @keyframes rf-flow-d { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -8;  } }
              @keyframes rf-flow-e { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -11; } }
            </style>
            <svg id="ref-flow-svg" viewBox="0 0 720 300" style="width:100%;height:100%;max-height:260px;">
              <defs>
                <marker id="arrow-blue" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 Z" fill="#1a7fe8"/>
                </marker>
                <marker id="arrow-orange" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 Z" fill="#f5a623"/>
                </marker>
                <marker id="arrow-cyan" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 Z" fill="#00c8ff"/>
                </marker>
                <marker id="arrow-green" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 Z" fill="#00d4a0"/>
                </marker>
                <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow-orange" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              <!-- Pipes with CSS animated flow -->

              <!-- 1. Crude Oil → CDU -->
              <path d="M80,100 L148,100" stroke="#1a7fe8" stroke-width="2" fill="none" opacity="0.9"
                stroke-dasharray="8,5" marker-end="url(#arrow-blue)" filter="url(#glow-blue)"
                style="animation: rf-flow-a 0.9s linear infinite"/>

              <!-- 2. CDU → FCC top -->
              <path d="M240,90 L290,70" stroke="#1a7fe8" stroke-width="2" fill="none" opacity="0.9"
                stroke-dasharray="7,5" marker-end="url(#arrow-blue)" filter="url(#glow-blue)"
                style="animation: rf-flow-b 1.3s linear infinite"/>

              <!-- 3. CDU → Hydrocracker -->
              <path d="M240,110 L290,185" stroke="#f5a623" stroke-width="2" fill="none" opacity="0.9"
                stroke-dasharray="8,5" marker-end="url(#arrow-orange)" filter="url(#glow-orange)"
                style="animation: rf-flow-a 1.6s linear infinite"/>

              <!-- 4. CDU bypass -->
              <path d="M240,100 L290,130" stroke="#00c8ff" stroke-width="1.5" fill="none" opacity="0.7"
                stroke-dasharray="6,4"
                style="animation: rf-flow-c 2.0s linear infinite"/>

              <!-- 5. FCC → Blending -->
              <path d="M380,65 L440,100" stroke="#1a7fe8" stroke-width="2" fill="none" opacity="0.9"
                stroke-dasharray="8,5" marker-end="url(#arrow-blue)" filter="url(#glow-blue)"
                style="animation: rf-flow-a 1.1s linear infinite"/>

              <!-- 6. Hydrocracker → Blending -->
              <path d="M380,190 L440,140" stroke="#f5a623" stroke-width="2" fill="none" opacity="0.9"
                stroke-dasharray="8,5" marker-end="url(#arrow-orange)" filter="url(#glow-orange)"
                style="animation: rf-flow-a 1.5s linear infinite"/>

              <!-- 7. Blending → Diesel -->
              <path d="M530,115 L575,85" stroke="#00d4a0" stroke-width="2" fill="none" opacity="0.9"
                stroke-dasharray="7,4" marker-end="url(#arrow-green)"
                style="animation: rf-flow-e 1.0s linear infinite"/>

              <!-- 8. Blending → Storage -->
              <path d="M530,130 L575,185" stroke="#00d4a0" stroke-width="1.5" fill="none" opacity="0.75"
                stroke-dasharray="7,4" marker-end="url(#arrow-green)"
                style="animation: rf-flow-e 1.4s linear infinite"/>

              <!-- 9. CDU → VDU vertical -->
              <path d="M192,130 L192,160" stroke="#00c8ff" stroke-width="1.5" fill="none" opacity="0.7"
                stroke-dasharray="5,3" marker-end="url(#arrow-cyan)"
                style="animation: rf-flow-d 1.8s linear infinite"/>

              <!-- Labels on pipes -->
              <text x="100" y="93" font-size="8" fill="#8095be">120k BPD</text>
              <text x="249" y="55" font-size="7" fill="#1a7fe8">10,000</text>
              <text x="249" y="180" font-size="7" fill="#f5a623">6,500</text>

              <!-- Nodes -->
              ${[
                { x:10,  y:75,  w:70, h:50, label:'CRUDE OIL',              val:'120,000 BPD',      color:'#1a7fe8' },
                { x:148, y:55,  w:92, h:90, label:'DISTILLATION UNIT (CDU)', val:'120,000 BPD\n326.1°F', color:'#1a7fe8' },
                { x:148, y:160, w:88, h:50, label:'VACUUM UNIT (VDU)',       val:'40,000 BPD',       color:'#00c8ff' },
                { x:290, y:35,  w:90, h:60, label:'FLUID CAT. CRACKING',    val:'10,500 BPD',       color:'#f5a623' },
                { x:290, y:155, w:90, h:60, label:'HYDROCRACKER',            val:'24,000 BPD',       color:'#a855f7' },
                { x:440, y:85,  w:90, h:70, label:'BLENDING &\nSTORAGE',    val:'34,000 BPD',       color:'#00d4a0' },
                { x:575, y:55,  w:75, h:50, label:'DIESEL',                  val:'36,000 BPD',       color:'#00d4a0' },
                { x:575, y:160, w:75, h:50, label:'STORAGE',                 val:'+ 6,000 BPD',      color:'#4a5f82' },
              ].map(n => `
              <g>
                <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6"
                  fill="${n.color}15" stroke="${n.color}" stroke-width="1.5" opacity="0.9"/>
                <text x="${n.x+n.w/2}" y="${n.y+14}" font-size="7.5" fill="${n.color}" text-anchor="middle" font-weight="700">${n.label.split('\n')[0]}</text>
                ${n.label.includes('\n') ? `<text x="${n.x+n.w/2}" y="${n.y+24}" font-size="7" fill="${n.color}" text-anchor="middle" opacity="0.8">${n.label.split('\n')[1]}</text>` : ''}
                <text x="${n.x+n.w/2}" y="${n.y+n.h-10}" font-size="8" fill="#c5d0e8" text-anchor="middle">${n.val}</text>
              </g>`).join('')}
            </svg>
          </div>
        </div>

        <!-- Alerts -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot" style="background:var(--yellow);"></span>ALERTS & DEVIATIONS</div>
          <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:5px;">
            ${ALERTS.map(a => `
            <div class="alert-item ${a.level}">
              <div class="alert-icon">${a.icon}</div>
              <div class="alert-body">
                <div class="alert-title">${a.title}</div>
                <div class="alert-meta">${a.desc}</div>
              </div>
            </div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin-top:4px;"><span class="card-title-dot" style="background:var(--blue);"></span>ENERGY MONITORING</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${[
              { label:'Steam Consumption', val:'82%', color:'blue' },
              { label:'Power Usage', val:'76%', color:'cyan' },
              { label:'Cooling Water', val:'91%', color:'green' },
            ].map(m => `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:10px;">
                <span style="color:var(--text2);">${m.label}</span>
                <span style="color:var(--text0);font-weight:600;">${m.val}</span>
              </div>
              <div class="progress-bar"><div class="progress-bar-fill ${m.color}" style="width:${m.val}"></div></div>
            </div>`).join('')}
          </div>
        </div>

      </div>

      <!-- Bottom: Product Output -->
      <div style="display:grid;grid-template-columns:1fr 340px;gap:10px;min-height:0;">
        <div class="card" style="padding:10px 12px;display:flex;flex-direction:column;">
          <div class="card-title"><span class="card-title-dot"></span>PRODUCT OUTPUT BREAKDOWN</div>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;flex:1;align-items:center;">
            ${PRODUCTS.map(p => `
            <div style="text-align:center;">
              <div style="font-size:14px;font-weight:700;color:${p.color};">${p.pct}</div>
              <div style="font-size:9px;color:var(--text2);margin:2px 0;">${p.label}</div>
              <div style="font-size:10px;font-weight:600;color:var(--text1);">${p.val.toLocaleString()} BPD</div>
              <div class="progress-bar" style="margin-top:4px;"><div class="progress-bar-fill" style="width:${p.pct};background:${p.color};"></div></div>
            </div>`).join('')}
          </div>
        </div>
        <div class="card" style="padding:10px 12px;display:flex;flex-direction:column;">
          <div class="card-title"><span class="card-title-dot"></span>PRODUCT MIX</div>
          <div style="flex:1;position:relative;min-height:0;"><canvas id="ref-pie"></canvas></div>
        </div>
      </div>

    </div>`;
  }

  function initCharts() {
    const u2 = u();
    ['ci','ru','py','dt','ec','od'].forEach((k,i) => {
      charts[`spk${k}`] = u2.sparkline(`ref-spk-${k}`, u2.timeSeries(18, 50+i*4, 0.04), ['#1a7fe8','#00c8ff','#00d4a0','#f5a623','#00d4a0','#f5a623'][i]);
    });

    charts.pie = u2.pieChart('ref-pie',
      PRODUCTS.map(p => p.label),
      PRODUCTS.map(p => p.val),
      PRODUCTS.map(p => p.color)
    );

    // CCTV time
    const cctv = setInterval(() => {
      const el = document.getElementById('ref-cctv-time');
      if (!el) { clearInterval(cctv); return; }
      const now = new Date();
      el.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    }, 1000);
    intervals.push(cctv);
  }

  function startUpdates() {}

  function destroy() {
    intervals.forEach(clearInterval);
    intervals = [];
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
    charts = {};
  }

  return { init, destroy };
})();
