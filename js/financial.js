/* ============================================================
   Dashboard 10 — Financial Performance
   ============================================================ */

window.DashFinancial = (() => {
  const u = () => App.utils;
  let charts    = {};
  let intervals = [];

  /* ── DATA ──────────────────────────────────────────────────── */
  const SEGS = [
    { name:'Upstream',    rev:21.3, bgt:23.5, color:'#1a7fe8' },
    { name:'Hilir',       rev:14.6, bgt:16.8, color:'#00d4a0' },
    { name:'Retail BBM',  rev:12.9, bgt:11.9, color:'#f5a623' },
    { name:'Gas & Power', rev:5.1,  bgt:5.5,  color:'#a855f7' },
    { name:'New Energy',  rev:2.3,  bgt:2.8,  color:'#00c8ff' },
  ];

  const COSTS = [
    { cat:'Procurement',  val:24.3, color:'#ff4055' },
    { cat:'Operasional',  val:11.2, color:'#f5a623' },
    { cat:'D&A',          val:4.8,  color:'#1a7fe8' },
    { cat:'G&A',          val:3.1,  color:'#a855f7' },
    { cat:'Lainnya',      val:2.5,  color:'#4a5f82' },
  ];

  const EBITDA_BY_SEG = [4.1, 2.8, 2.2, 0.9, 0.3];

  /* ── HELPERS ───────────────────────────────────────────────── */
  function achColor(p) {
    return p >= 100 ? '#00d4a0' : p >= 90 ? '#00c8ff' : p >= 80 ? '#f5a623' : '#ff4055';
  }

  function day30Labels() {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 29 + i);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  /* ── RENDER ────────────────────────────────────────────────── */
  function render() {
    const totalRev = SEGS.reduce((a, s) => a + s.rev, 0);
    const totalBgt = SEGS.reduce((a, s) => a + s.bgt, 0);
    const overallAch = ((totalRev / totalBgt) * 100).toFixed(0);

    return `
    <div style="display:grid;grid-template-rows:56px 1fr 110px;padding:10px;gap:10px;height:100%;">

      <!-- ── KPI Row ─────────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
        ${[
          { label:'Revenue Today',   val:'IDR 2.8',  unit:'T', delta:'▲ +3.2% vs yesterday',  color:'green',  id:'rtd'  },
          { label:'Revenue MTD',     val:'IDR 56.2', unit:'T', delta:'▲ +7.1% vs last month',  color:'blue',   id:'rmtd' },
          { label:'Gross Margin',    val:'18.4',     unit:'%', delta:'▼ -0.3% vs last month',  color:'cyan',   id:'gm'   },
          { label:'Op. Cost MTD',    val:'IDR 45.9', unit:'T', delta:'▼ -1.2% vs target',      color:'orange', id:'oc'   },
          { label:'EBITDA MTD',      val:'IDR 10.3', unit:'T', delta:'▲ +5.4% vs last month',  color:'purple', id:'ebd'  },
          { label:'Free Cash Flow',  val:'IDR 3.2',  unit:'T', delta:'▲ +2.1% YTD',            color:'yellow', id:'fcf'  },
        ].map(k => `
        <div class="kpi-card ${k.color}">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.val}<span class="unit"> ${k.unit}</span></div>
          <div class="kpi-delta ${k.delta.startsWith('▲')?'up':k.delta.startsWith('▼')?'down':'warn'}">${k.delta}</div>
          <div class="kpi-sparkline"><canvas id="fin-spk-${k.id}" height="28"></canvas></div>
        </div>`).join('')}
      </div>

      <!-- ── Body ────────────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:1fr 248px 262px;gap:10px;min-height:0;">

        <!-- Revenue Trend -->
        <div class="card" style="display:flex;flex-direction:column;overflow:hidden;padding:12px;">
          <div class="card-title" style="margin-bottom:8px;">
            <span class="card-title-dot"></span>REVENUE TREND — 30 HARI (IDR TRILIUN)
            <span style="margin-left:auto;font-size:10px;color:var(--text3);font-weight:400;letter-spacing:0;">Total MTD: <b style="color:var(--text1);">IDR ${totalRev.toFixed(1)}T</b></span>
          </div>
          <div style="flex:1;min-height:0;position:relative;"><canvas id="fin-rev-trend"></canvas></div>
        </div>

        <!-- Segment Revenue -->
        <div class="card" style="display:flex;flex-direction:column;overflow:hidden;padding:12px;">
          <div class="card-title" style="margin-bottom:6px;">
            <span class="card-title-dot" style="background:#a855f7;box-shadow:0 0 8px rgba(168,85,247,.4);"></span>
            REVENUE PER SEGMEN
          </div>
          <div style="height:110px;position:relative;flex-shrink:0;"><canvas id="fin-seg-pie"></canvas></div>
          <div style="flex:1;overflow-y:auto;margin-top:6px;">
            <div style="font-size:9px;color:var(--text3);padding-bottom:4px;border-bottom:1px solid var(--border);margin-bottom:6px;display:flex;justify-content:space-between;">
              <span>SEGMEN</span><span>MTD · vs BUDGET</span>
            </div>
            ${SEGS.map(s => {
              const achPct = (s.rev / s.bgt) * 100;
              return `
              <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);">
                <span style="width:8px;height:8px;border-radius:2px;background:${s.color};flex-shrink:0;display:inline-block;"></span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:10.5px;font-weight:600;color:var(--text1);">${s.name}</div>
                  <div style="font-size:9.5px;color:var(--text3);">IDR ${s.rev}T</div>
                </div>
                <span style="font-size:10.5px;font-weight:700;color:${achColor(achPct)};white-space:nowrap;">${achPct.toFixed(0)}%</span>
              </div>`;
            }).join('')}
            <div style="margin-top:6px;display:flex;justify-content:space-between;font-size:10px;">
              <span style="color:var(--text2);">Overall Achievement</span>
              <span style="font-weight:700;color:${achColor(Number(overallAch))};">${overallAch}%</span>
            </div>
          </div>
        </div>

        <!-- Budget vs Actuals + Cost Structure -->
        <div class="card" style="display:flex;flex-direction:column;overflow:hidden;padding:12px;">
          <div class="card-title" style="margin-bottom:10px;">
            <span class="card-title-dot" style="background:#f5a623;"></span>
            BUDGET vs ACTUALS — MTD
          </div>
          <div style="flex:1;overflow-y:auto;">
            ${SEGS.map(s => {
              const achPct = (s.rev / s.bgt) * 100;
              const barW   = Math.min(100, achPct);
              const over   = s.rev > s.bgt;
              return `
              <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">
                  <span style="font-weight:600;color:var(--text1);">${s.name}</span>
                  <span style="color:var(--text2);">IDR ${s.rev}T <span style="color:var(--text3);">/</span> ${s.bgt}T</span>
                </div>
                <div style="height:9px;background:var(--bg3);border-radius:4px;overflow:hidden;position:relative;">
                  <div style="height:100%;width:${barW.toFixed(0)}%;background:${achColor(achPct)};border-radius:4px;position:relative;">
                    ${over ? `<div style="position:absolute;right:0;top:0;bottom:0;width:3px;background:var(--green2);border-radius:0 4px 4px 0;"></div>` : ''}
                  </div>
                  <span style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:8.5px;font-weight:700;color:${achColor(achPct)};">${achPct.toFixed(0)}%</span>
                </div>
              </div>`;
            }).join('')}

            <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px;">
              <div class="card-title" style="margin-bottom:8px;font-size:9.5px;">
                <span class="card-title-dot" style="background:#ff4055;box-shadow:var(--glow-red);width:5px;height:5px;"></span>
                STRUKTUR BIAYA — MTD
              </div>
              ${COSTS.map(c => `
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;">
                <span style="width:7px;height:7px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block;"></span>
                <div style="flex:1;font-size:10px;color:var(--text2);">${c.cat}</div>
                <div style="font-size:10.5px;font-weight:700;color:var(--text1);">IDR ${c.val}T</div>
                <div style="width:50px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
                  <div style="height:100%;width:${((c.val/45.9)*100).toFixed(0)}%;background:${c.color};border-radius:2px;"></div>
                </div>
              </div>`).join('')}
              <div style="border-top:1px solid var(--border);padding-top:6px;margin-top:2px;display:flex;justify-content:space-between;font-size:10px;">
                <span style="color:var(--text2);">Total Op. Cost</span>
                <span style="font-weight:700;color:var(--text0);">IDR 45.9T</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Bottom Charts ────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;height:110px;">
        <div class="card" style="padding:10px;overflow:hidden;">
          <div class="card-title" style="margin-bottom:5px;"><span class="card-title-dot"></span>ARUS KAS HARIAN (IDR T) — 14 HARI</div>
          <div style="height:72px;position:relative;"><canvas id="fin-cf-chart"></canvas></div>
        </div>
        <div class="card" style="padding:10px;overflow:hidden;">
          <div class="card-title" style="margin-bottom:5px;">
            <span class="card-title-dot" style="background:#a855f7;"></span>EBITDA PER SEGMEN MTD (IDR T)
          </div>
          <div style="height:72px;position:relative;"><canvas id="fin-ebd-chart"></canvas></div>
        </div>
        <div class="card" style="padding:10px;overflow:hidden;">
          <div class="card-title" style="margin-bottom:5px;">
            <span class="card-title-dot" style="background:#f5a623;"></span>PROFITABILITAS — GROSS MARGIN TREND
          </div>
          <div style="height:72px;position:relative;"><canvas id="fin-gm-chart"></canvas></div>
        </div>
      </div>
    </div>
    `;
  }

  /* ── CHARTS ────────────────────────────────────────────────── */
  function initCharts() {
    // Sparklines
    [
      { id:'rtd',  base:2.8,  v:0.06, c:'#00d4a0' },
      { id:'rmtd', base:56.2, v:0.02, c:'#1a7fe8' },
      { id:'gm',   base:18.4, v:0.02, c:'#00c8ff' },
      { id:'oc',   base:45.9, v:0.02, c:'#ff7b00' },
      { id:'ebd',  base:10.3, v:0.04, c:'#a855f7' },
      { id:'fcf',  base:3.2,  v:0.07, c:'#f5a623' },
    ].forEach(s => {
      charts[`spk_${s.id}`] = u().sparkline(`fin-spk-${s.id}`, u().timeSeries(20, s.base, s.v), s.c);
    });

    // Revenue Trend — 30 days, 4 series
    charts.revTrend = u().lineChart('fin-rev-trend', day30Labels(), [
      { label:'Upstream',    data:u().timeSeries(30,1.07,0.07), borderColor:'#1a7fe8', backgroundColor:'rgba(26,127,232,0.06)', fill:false, tension:0.35, pointRadius:0, borderWidth:1.5 },
      { label:'Hilir',       data:u().timeSeries(30,0.73,0.06), borderColor:'#00d4a0', backgroundColor:'transparent',            fill:false, tension:0.35, pointRadius:0, borderWidth:1.5 },
      { label:'Retail BBM',  data:u().timeSeries(30,0.64,0.07), borderColor:'#f5a623', backgroundColor:'transparent',            fill:false, tension:0.35, pointRadius:0, borderWidth:1.5 },
      { label:'Gas & Power', data:u().timeSeries(30,0.26,0.05), borderColor:'#a855f7', backgroundColor:'transparent',            fill:false, tension:0.35, pointRadius:0, borderWidth:1.5 },
    ], {
      legend: { display:true, position:'top', labels:{ color:'#8095be', font:{ size:9 }, boxWidth:14, padding:8 } },
    });

    // Segment Pie — hide legend, custom list handles labeling
    charts.segPie = u().pieChart('fin-seg-pie',
      SEGS.map(s => s.name),
      SEGS.map(s => s.rev),
      SEGS.map(s => s.color)
    );
    if (charts.segPie) {
      charts.segPie.options.plugins.legend.display = false;
      charts.segPie.update();
    }

    // Cash Flow — 14-day bar
    const cfDays = Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);return`${d.getDate()}/${d.getMonth()+1}`;});
    charts.cf = u().miniBar('fin-cf-chart', cfDays,
      Array.from({length:14}, () => u().rand(1.8, 4.2)),
      Array.from({length:14}, (_,i) => i < 10 ? '#1a7fe8' : '#00d4a0')
    );

    // EBITDA by segment
    charts.ebd = u().miniBar('fin-ebd-chart',
      SEGS.map(s => s.name.split(' ')[0]),
      EBITDA_BY_SEG,
      SEGS.map(s => s.color)
    );

    // Gross Margin Trend — 12 months
    const gmMonths = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','Mei'];
    charts.gm = u().lineChart('fin-gm-chart', gmMonths, [{
      label:'Gross Margin %',
      data: [17.1,17.8,17.5,18.2,17.9,18.5,18.1,18.7,18.3,18.6,18.5,18.4],
      borderColor:'#00c8ff',
      backgroundColor:'rgba(0,200,255,0.08)',
      fill:true, tension:0.4, pointRadius:0, borderWidth:1.5,
    }], { beginAtZero:false, legend:{ display:false } });
  }

  /* ── LIFECYCLE ─────────────────────────────────────────────── */
  function init() {
    const c = document.getElementById('dash-financial');
    if (!c) return;
    c.innerHTML = render();
    setTimeout(() => { initCharts(); }, 80);
  }

  function destroy() {
    intervals.forEach(clearInterval);
    intervals = [];
    Object.values(charts).forEach(ch => { try { ch.destroy(); } catch(e){} });
    charts = {};
  }

  return { init, destroy };
})();
