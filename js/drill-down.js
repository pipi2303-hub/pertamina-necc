/* ============================================================
   Drill-Down Modal Engine
   Usage: window.DrillDown.open({ title, domain, value, unit,
            delta, color, data, labels, events, type })
   ============================================================ */

window.DrillDown = (() => {
  let _chart = null;

  /* ── Domain color map ──────────────────────────────────────── */
  const DCOL = {
    command:      '#1a7fe8',
    upstream:     '#00d4a0',
    refinery:     '#f5a623',
    storage:      '#00c8ff',
    logistics:    '#a855f7',
    distribution: '#ff7b00',
    spklu:        '#00d4a0',
    hse:          '#ff4055',
    financial:    '#f5a623',
    ai:           '#00c8ff',
  };

  /* ── Helpers ───────────────────────────────────────────────── */
  function fmtNum(n) {
    const v = Math.abs(n);
    if (v >= 1e9)  return (n/1e9).toFixed(2)  + 'B';
    if (v >= 1e6)  return (n/1e6).toFixed(2)  + 'M';
    if (v >= 1e3)  return (n/1e3).toFixed(1)  + 'K';
    return n.toFixed(2);
  }

  function day30Labels() {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  /* Build 5 event rows from peaks/troughs in data */
  function makeEvents(data, labels, title) {
    const events = [];
    const step = Math.floor(data.length / 5);
    for (let k = 0; k < 5; k++) {
      const i   = Math.min(k * step + Math.floor(step / 2), data.length - 1);
      const cur = data[i];
      const ref = data[Math.max(i - 1, 0)];
      const pct = ref !== 0 ? ((cur - ref) / Math.abs(ref) * 100) : 0;
      const up  = pct >= 0;
      events.push({
        time:   labels[i],
        event:  up
          ? `${title} naik — kondisi operasional dalam batas normal`
          : `${title} turun — sistem monitoring diaktifkan`,
        impact: (up ? '+' : '') + pct.toFixed(1) + '%',
        sts:    Math.abs(pct) > 8 ? 'Monitor' : 'Normal',
      });
    }
    return events;
  }

  /* ── KPI body renderer ─────────────────────────────────────── */
  function renderKPI(cfg, color) {
    const data   = cfg.data   || App.utils.timeSeries(30, 100, 0.06);
    const labels = cfg.labels || day30Labels();
    const min    = Math.min(...data);
    const max    = Math.max(...data);
    const avg    = data.reduce((a, b) => a + b, 0) / data.length;
    const unit   = cfg.unit || '';
    const events = cfg.events || makeEvents(data, labels, cfg.title);

    return `
    <div class="dd-stat-row">
      ${[
        { label:'MINIMUM 30H',  val: fmtNum(min) + (unit ? ' ' + unit : ''), color:'#ff4055' },
        { label:'MAKSIMUM 30H', val: fmtNum(max) + (unit ? ' ' + unit : ''), color:'#00d4a0' },
        { label:'RATA-RATA 30H',val: fmtNum(avg) + (unit ? ' ' + unit : ''), color:'#1a7fe8' },
        { label:'VOLATILITAS',  val: (((max - min) / avg) * 100).toFixed(1) + '%', color:'#f5a623' },
      ].map(s => `
      <div class="dd-stat-card">
        <div class="dd-stat-label">${s.label}</div>
        <div class="dd-stat-val" style="color:${s.color};">${s.val}</div>
      </div>`).join('')}
    </div>

    <div class="dd-chart-wrap">
      <div class="dd-chart-label">TREN 30 HARI — ${cfg.title.toUpperCase()}${unit ? ' (' + unit + ')' : ''}</div>
      <div style="height:190px;position:relative;">
        <canvas id="dd-chart"></canvas>
      </div>
    </div>

    <div class="dd-events-section">
      <div class="dd-events-label">RIWAYAT KEJADIAN — 5 TITIK SIGNIFIKAN</div>
      <table class="dd-table">
        <thead>
          <tr>
            <th>TANGGAL</th>
            <th>KEJADIAN</th>
            <th>PERUBAHAN</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(e => `
          <tr>
            <td style="color:var(--text3);white-space:nowrap;">${e.time}</td>
            <td style="color:var(--text1);">${e.event}</td>
            <td style="font-weight:700;white-space:nowrap;color:${e.impact.startsWith('-') ? '#ff4055' : '#00d4a0'};">${e.impact}</td>
            <td><span class="dd-sts-badge" style="background:${e.sts === 'Normal' ? 'rgba(0,212,160,.15)' : 'rgba(245,166,35,.15)'};color:${e.sts === 'Normal' ? '#00d4a0' : '#f5a623'};">${e.sts}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  /* ── Init chart (called after DOM is ready) ─────────────────── */
  function initChart(cfg, color) {
    const canvas = document.getElementById('dd-chart');
    if (!canvas) return;
    const data   = cfg.data   || App.utils.timeSeries(30, 100, 0.06);
    const labels = cfg.labels || day30Labels();
    const ctx    = canvas.getContext('2d');
    const grad   = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 190);
    grad.addColorStop(0, color + '50');
    grad.addColorStop(1, color + '08');

    _chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: cfg.title,
          data,
          borderColor: color,
          backgroundColor: grad,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#111c35',
            borderColor: '#2a5298', borderWidth: 1,
            titleColor: '#eef2ff', bodyColor: '#8095be',
            titleFont: { size: 11 }, bodyFont: { size: 10 },
            callbacks: {
              label: (ctx) => ` ${cfg.title}: ${fmtNum(ctx.parsed.y)}${cfg.unit ? ' ' + cfg.unit : ''}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(42,82,152,0.1)', drawBorder: false },
            ticks: { color: '#4a5f82', font: { size: 9 }, maxTicksLimit: 10 },
          },
          y: {
            grid: { color: 'rgba(42,82,152,0.1)', drawBorder: false },
            ticks: { color: '#4a5f82', font: { size: 9 } },
          },
        },
      },
    });
  }

  /* ── Close ─────────────────────────────────────────────────── */
  function close() {
    if (_chart) { try { _chart.destroy(); } catch (e) {} _chart = null; }
    const overlay = document.getElementById('dd-overlay');
    if (!overlay) return;
    overlay.classList.remove('dd-open');
    setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 220);
  }

  /* ── Open ──────────────────────────────────────────────────── */
  function open(cfg) {
    /* destroy any existing modal */
    const prev = document.getElementById('dd-overlay');
    if (prev) { if (_chart) { try { _chart.destroy(); } catch(e){} _chart = null; } prev.remove(); }

    const color   = cfg.color || DCOL[cfg.domain] || '#1a7fe8';
    const domLbl  = (cfg.domain || 'system').toUpperCase();
    const type    = cfg.type || 'kpi';
    const deltaUp = cfg.delta && (cfg.delta.startsWith('▲') || cfg.delta.startsWith('+'));

    const overlay = document.createElement('div');
    overlay.id    = 'dd-overlay';
    overlay.className = 'dd-overlay';

    overlay.innerHTML = `
      <div class="dd-modal" id="dd-modal" role="dialog" aria-modal="true">

        <div class="dd-header">
          <span class="dd-domain-badge" style="background:${color}20;color:${color};border-color:${color}50;">${domLbl}</span>
          <div class="dd-header-mid">
            <div class="dd-title">${cfg.title}</div>
            ${cfg.subtitle ? `<div class="dd-subtitle">${cfg.subtitle}</div>` : ''}
          </div>
          <div class="dd-header-kpi">
            ${cfg.value !== undefined ? `<span class="dd-hero-val" style="color:${color};">${cfg.value}<span class="dd-hero-unit">${cfg.unit || ''}</span></span>` : ''}
            ${cfg.delta ? `<span class="dd-hero-delta" style="color:${deltaUp ? '#00d4a0' : '#ff4055'};">${cfg.delta}</span>` : ''}
          </div>
          <button class="dd-close" id="dd-close-btn" title="Tutup (ESC)">✕</button>
        </div>

        <div class="dd-body" id="dd-body">
          ${type === 'kpi' ? renderKPI(cfg, color) : `<div class="dd-loading">Memuat data...</div>`}
        </div>

      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('dd-open'));

    /* chart init after paint */
    if (type === 'kpi') setTimeout(() => initChart(cfg, color), 60);

    /* close handlers */
    document.getElementById('dd-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  /* ESC to close */
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  return { open, close };
})();
