/* ============================================================
   Dashboard 4 — Storage & Terminal Control Dashboard
   ============================================================ */

window.DashStorage = (() => {
  const u = () => App.utils;
  let charts = {};
  let intervals = [];

  const RECON = [
    { label:'Refinery Inflow', meter:'5,000 KL', actual:'5,010 KL', diff:'+10', pos:true },
    { label:'Vessel Inflow',   meter:'7,000 KL', actual:'6,980 KL', diff:'−20', pos:false },
    { label:'Terminal Transfer', meter:'3,000 KL', actual:'2,995 KL', diff:'−5', pos:false },
    { label:'Truck Loading Outflow', meter:'12,500 KL', actual:'12,520 KL', diff:'+20', pos:true },
  ];

  const TRANSFERS = [
    { op:'OP001', src:'T05', dst:'T05', ts:'2024-08-15 14:00:00', status:'completed' },
    { op:'OP002', src:'T02', dst:'T02', ts:'2024-08-15 14:00:00', status:'authorized' },
    { op:'OP003', src:'T03', dst:'T07', ts:'2024-08-15 14:00:00', status:'failed' },
  ];

  const ALERTS = [
    { id:'01', level:'critical', title:'Unauthorized Movement Detected @ Tank 04', time:'14:32:05' },
    { id:'02', level:'warning',  title:'Volume Variance > 0.5% @ Tank 02 Outflow', time:'14:15:30' },
    { id:'03', level:'warning',  title:'Temp Anomaly @ Tank 03', time:'13:45:12' },
  ];

  const TANKS = [
    { id:'T01', type:'MOGAS',  pct:96, level:91, temp:'35.2', density:'0.870', cap:'12,500 KL' },
    { id:'T02', type:'DIESEL', pct:75, level:71, temp:'31.5', density:'0.835', cap:'13,500 KL' },
    { id:'T03', type:'JET A-1',pct:85, level:82, temp:'28.8', density:'0.790', cap:'12,500 KL' },
  ];

  function init() {
    const c = document.getElementById('dash-storage');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => { initCharts(); startUpdates(); }, 80);
  }

  function render() {
    return `
    <div style="display:grid;grid-template-rows:56px 1fr 108px;padding:10px;gap:10px;height:100%;">

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'Total Stock',       val:'1,250,000', unit:'KL',    delta:'▲ +0.5%',  color:'blue',   id:'ts' },
          { label:'Tank Utilization',  val:'85',        unit:'%',     delta:'▲ +1.2%',  color:'green',  id:'tu' },
          { label:'Inflow Volume',     val:'15,000',    unit:'KL',    delta:'▲ Normal', color:'cyan',   id:'iv' },
          { label:'Outflow Volume',    val:'12,500',    unit:'KL',    delta:'▲ Normal', color:'yellow', id:'ov' },
          { label:'Volume Variance',   val:'+1,200',    unit:'KL',    delta:'✓ Within tolerance', color:'green', id:'vv' },
          { label:'Unauthorized Move', val:'0',         unit:'',      delta:'✓ No alerts', color:'green', id:'um' },
        ].map(k => `
        <div class="kpi-card ${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit">${k.unit}</span></div>
          <div class="kpi-delta ${k.delta.startsWith('▲')||k.delta.startsWith('✓')?'up':'warn'}">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="sto-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- Body -->
      <div style="display:grid;grid-template-columns:220px 1fr 250px;gap:10px;min-height:0;">

        <!-- Reconciliation Panel -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot"></span>RECONCILIATION PANEL</div>
          <div style="flex:1;overflow-y:auto;">
            <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;margin-bottom:4px;padding:0 4px;">
              <div style="font-size:9px;font-weight:600;color:var(--text3);letter-spacing:0.5px;">SOURCE</div>
              <div style="font-size:9px;font-weight:600;color:var(--blue2);letter-spacing:0.5px;">METER</div>
              <div style="font-size:9px;font-weight:600;color:var(--green);letter-spacing:0.5px;">ACTUAL</div>
            </div>
            ${RECON.map(r => `
            <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;padding:6px 4px;border-bottom:1px solid rgba(30,58,95,0.25);">
              <div style="font-size:10px;color:var(--text2);">${r.label}</div>
              <div style="font-size:11px;color:var(--blue2);font-weight:600;font-variant-numeric:tabular-nums;">${r.meter}</div>
              <div style="font-size:11px;color:var(--green);font-weight:600;font-variant-numeric:tabular-nums;">${r.actual}</div>
            </div>
            <div style="padding:2px 4px 6px;font-size:9.5px;color:${r.pos?'var(--green)':'var(--red)'};border-bottom:1px solid rgba(30,58,95,0.15);">
              Variance: <strong>${r.diff}</strong>
            </div>`).join('')}
          </div>
          <div style="margin-top:8px;padding:8px;background:var(--bg3);border:1px solid var(--border-bright);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10.5px;color:var(--text2);">TOTAL VARIANCE</span>
            <span style="font-size:16px;font-weight:700;color:var(--green);">+15 KL</span>
          </div>
        </div>

        <!-- Tank Farm Visualization -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 12px;">
          <div class="card-title">
            <span class="card-title-dot" style="background:var(--cyan);"></span>
            TANK FARM VISUALIZATION
            <div style="margin-left:auto;display:flex;gap:6px;">
              <span style="font-size:9px;color:var(--text3);">TANK FARM A</span>
              <span class="badge running" style="font-size:9px;padding:1px 6px;">LIVE</span>
            </div>
          </div>

          <!-- Tank visual -->
          <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:20px;">
            ${TANKS.map(t => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
              <!-- Tank body -->
              <div style="position:relative;">
                <!-- Tank dome -->
                <div style="width:80px;height:16px;background:var(--bg4);border:2px solid var(--border-bright);border-radius:50% 50% 0 0;margin-bottom:-1px;"></div>
                <!-- Tank cylinder -->
                <div style="width:80px;height:110px;background:var(--bg3);border:2px solid var(--border-bright);border-top:none;position:relative;overflow:hidden;">
                  <!-- Fill level -->
                  <div style="position:absolute;bottom:0;left:0;right:0;height:${t.pct}%;
                    background:linear-gradient(180deg,
                      ${t.type==='MOGAS'?'rgba(26,127,232,0.5)':t.type==='DIESEL'?'rgba(245,166,35,0.5)':'rgba(0,200,255,0.5)'} 0%,
                      ${t.type==='MOGAS'?'rgba(0,80,200,0.85)':t.type==='DIESEL'?'rgba(200,100,0,0.85)':'rgba(0,120,200,0.85)'} 100%);
                    border-top:1px solid ${t.type==='MOGAS'?'rgba(100,200,255,0.5)':t.type==='DIESEL'?'rgba(255,200,80,0.5)':'rgba(80,220,255,0.5)'};
                    transition:height 2s ease;">
                  </div>
                  <!-- Level markers -->
                  ${[25,50,75].map(m => `
                  <div style="position:absolute;left:0;right:0;bottom:${m}%;height:1px;background:rgba(255,255,255,0.08);"></div>
                  <div style="position:absolute;right:3px;bottom:${m}%;font-size:7px;color:rgba(255,255,255,0.25);">${m}%</div>`).join('')}
                  <!-- Level text -->
                  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
                    <div style="font-size:17px;font-weight:700;color:#fff;text-shadow:0 0 10px rgba(0,0,0,0.8);">${t.pct}%</div>
                    <div style="font-size:8px;color:rgba(255,255,255,0.6);">Level</div>
                  </div>
                </div>
                <!-- Bottom base -->
                <div style="width:80px;height:8px;background:var(--bg4);border:2px solid var(--border-bright);border-top:none;border-radius:0 0 4px 4px;"></div>
              </div>
              <!-- Tank info -->
              <div style="text-align:center;">
                <div style="font-size:12px;font-weight:700;color:var(--text0);">${t.id}</div>
                <div style="font-size:10px;color:var(--text2);">${t.type}</div>
                <div style="font-size:9.5px;color:var(--text3);margin-top:2px;">Temp: ${t.temp}°C</div>
                <div style="font-size:9.5px;color:var(--text3);">Density: ${t.density}</div>
                <div style="font-size:9.5px;color:var(--text3);">CAP: ${t.cap}</div>
              </div>
            </div>`).join('')}
          </div>

          <!-- CCTV Feed below tanks -->
          <div style="margin-top:8px;display:flex;gap:8px;height:60px;">
            <div style="flex:1;background:var(--bg0);border-radius:var(--radius);overflow:hidden;position:relative;border:1px solid var(--border);">
              <div class="cctv-scanline"></div>
              <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,255,0.012) 2px,rgba(0,200,255,0.012) 4px);"></div>
              <div style="position:absolute;top:4px;left:6px;font-size:7px;color:var(--green);font-family:'JetBrains Mono',monospace;">● REC</div>
              <div style="position:absolute;bottom:3px;left:6px;font-size:7px;color:var(--cyan);font-family:'JetBrains Mono',monospace;">CCTV FEED: TANK FARM A</div>
            </div>
          </div>
        </div>

        <!-- Alerts & Variance -->
        <div class="card" style="display:flex;flex-direction:column;min-height:0;padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot" style="background:var(--red);box-shadow:var(--glow-red);"></span>ALERTS & VARIANCE</div>
          <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:5px;">
            ${ALERTS.map(a => `
            <div class="alert-item ${a.level}" style="padding:8px 9px;">
              <div class="alert-icon" style="width:24px;height:24px;font-size:13px;">${a.level==='critical'?'🔴':'⚠️'}</div>
              <div class="alert-body">
                <div style="font-size:9.5px;font-weight:700;color:var(--yellow);letter-spacing:0.5px;">ALERT ${a.id}</div>
                <div class="alert-title" style="font-size:11px;">${a.title}</div>
                <div class="alert-meta">Time: ${a.time}</div>
              </div>
            </div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="card-title" style="margin-top:4px;"><span class="card-title-dot" style="background:var(--blue);"></span>TANK TREND</div>
          <div style="height:70px;position:relative;"><canvas id="sto-trend"></canvas></div>
        </div>

      </div>

      <!-- Bottom: Transfer Log -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;min-height:0;">
        <div class="card" style="padding:10px 10px;">
          <div class="card-title"><span class="card-title-dot"></span>TRANSFER LOG</div>
          <table class="data-table">
            <thead>
              <tr><th>Operator ID</th><th>Source Tank</th><th>Dest Tank</th><th>Timestamp</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${TRANSFERS.map(t => `<tr>
                <td class="highlight">${t.op}</td>
                <td>${t.src}</td>
                <td>${t.dst}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:10px;">${t.ts}</td>
                <td><span class="badge ${t.status}">${t.status.charAt(0).toUpperCase()+t.status.slice(1)}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card" style="padding:10px 10px;display:flex;flex-direction:column;">
          <div class="card-title"><span class="card-title-dot"></span>INFLOW vs OUTFLOW TREND</div>
          <div style="flex:1;position:relative;min-height:0;"><canvas id="sto-io-chart"></canvas></div>
        </div>
      </div>

    </div>`;
  }

  function initCharts() {
    const u2 = u();
    ['ts','tu','iv','ov','vv','um'].forEach((k,i) => {
      charts[`spk${k}`] = u2.sparkline(`sto-spk-${k}`, u2.timeSeries(18, 50+i*3, 0.04), ['#1a7fe8','#00d4a0','#00c8ff','#f5a623','#00d4a0','#00d4a0'][i]);
    });

    const labels = u2.timeLabels(12, 30);
    charts.trend = u2.lineChart('sto-trend', labels, [
      { data: u2.timeSeries(12, 85, 0.03), borderColor:'#1a7fe8', borderWidth:1.5, tension:0.4, pointRadius:0, fill:false, label:'T01' },
      { data: u2.timeSeries(12, 75, 0.03), borderColor:'#f5a623', borderWidth:1.5, tension:0.4, pointRadius:0, fill:false, label:'T02' },
      { data: u2.timeSeries(12, 82, 0.03), borderColor:'#00c8ff', borderWidth:1.5, tension:0.4, pointRadius:0, fill:false, label:'T03' },
    ], { legend: { display: true, position: 'top', labels: { color:'#4a5f82', font:{size:9}, boxWidth:14, padding:6 } } });

    const labels2 = u2.timeLabels(20, 15);
    charts.io = u2.lineChart('sto-io-chart', labels2, [
      { label:'Inflow',  data: u2.timeSeries(20, 15000, 0.06), borderColor:'#00d4a0', backgroundColor:'rgba(0,212,160,0.08)', borderWidth:2, tension:0.4, fill:true, pointRadius:0 },
      { label:'Outflow', data: u2.timeSeries(20, 12500, 0.05), borderColor:'#f5a623', backgroundColor:'rgba(245,166,35,0.08)', borderWidth:2, tension:0.4, fill:true, pointRadius:0 },
    ], { beginAtZero: false });
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
