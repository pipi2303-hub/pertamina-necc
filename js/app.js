/* ============================================================
   PERTAMINA NECC — App Core
   ============================================================ */

window.App = (() => {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  /* ── Clock ─────────────────────────────────────────────── */
  function startClock() {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2,'0');
      const m = String(now.getMinutes()).padStart(2,'0');
      const s = String(now.getSeconds()).padStart(2,'0');
      const el1 = document.getElementById('clock-time');
      const el2 = document.getElementById('clock-date');
      if (el1) el1.textContent = `${h}:${m}:${s}`;
      if (el2) el2.textContent = `${DAYS[now.getDay()].slice(0,3)}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── Navigation ─────────────────────────────────────────── */
  let currentDash = 'command';
  const dashModules = {
    command:      () => window.DashCommand,
    upstream:     () => window.DashUpstream,
    refinery:     () => window.DashRefinery,
    storage:      () => window.DashStorage,
    logistics:    () => window.DashLogistics,
    distribution: () => window.DashDistribution,
    spklu:        () => window.DashSPKLU,
    hse:          () => window.DashHSE,
    financial:    () => window.DashFinancial,
    ai:           () => window.DashAI,
  };

  function navigate(name) {
    if (name === currentDash) return;
    // destroy old
    const old = dashModules[currentDash]?.();
    if (old && old.destroy) old.destroy();
    // hide old
    document.querySelectorAll('.dash').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    // show new
    const el = document.getElementById(`dash-${name}`);
    if (el) el.classList.add('active');
    const tab = document.querySelector(`[data-dash="${name}"]`);
    if (tab) tab.classList.add('active');
    currentDash = name;
    // init new
    const mod = dashModules[name]?.();
    if (mod && mod.init) {
      setTimeout(() => mod.init(), 30);
    }
  }

  /* ── Utils ──────────────────────────────────────────────── */
  const utils = {
    rand: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    vary: (base, pct) => base * (1 + (Math.random() - 0.5) * 2 * pct),

    fmt: (n, d = 0) => {
      if (Math.abs(n) >= 1e12) return (n/1e12).toFixed(d) + 'T';
      if (Math.abs(n) >= 1e9)  return (n/1e9).toFixed(d) + 'B';
      if (Math.abs(n) >= 1e6)  return (n/1e6).toFixed(d) + 'M';
      if (Math.abs(n) >= 1e3)  return (n/1e3).toFixed(d) + 'K';
      return n.toFixed(d);
    },

    fmtN: (n, d = 0) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }),

    fmtIDR: (n) => {
      if (Math.abs(n) >= 1e12) return 'IDR ' + (n/1e12).toFixed(1) + ' T';
      if (Math.abs(n) >= 1e9)  return 'IDR ' + (n/1e9).toFixed(1) + ' B';
      if (Math.abs(n) >= 1e6)  return 'IDR ' + (n/1e6).toFixed(1) + ' M';
      return 'IDR ' + n.toLocaleString('id-ID');
    },

    timeSeries: (pts, base, variance = 0.05) => {
      const arr = [];
      let v = base;
      for (let i = 0; i < pts; i++) {
        v = v * (1 + (Math.random() - 0.5) * 2 * variance);
        arr.push(Math.max(0, v));
      }
      return arr;
    },

    timeLabels: (pts, interval = 5) => {
      const now = new Date();
      const labels = [];
      for (let i = pts - 1; i >= 0; i--) {
        const d = new Date(now - i * interval * 60000);
        labels.push(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
      }
      return labels;
    },

    countUp: (el, target, duration = 1200, suffix = '') => {
      if (!el) return;
      const start = parseFloat(el.textContent) || 0;
      const startTime = performance.now();
      function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        const val = start + (target - start) * ease;
        el.textContent = val.toFixed(typeof target === 'string' ? 0 : (String(target).includes('.') ? 1 : 0)) + suffix;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(step);
    },

    sparkline: (canvasId, data, color = '#1a7fe8', fill = true) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 28);
      grad.addColorStop(0, color + '60');
      grad.addColorStop(1, color + '00');
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map((_,i) => i),
          datasets: [{
            data,
            borderColor: color,
            borderWidth: 1.5,
            tension: 0.4,
            pointRadius: 0,
            fill: fill,
            backgroundColor: fill ? grad : 'transparent',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
        }
      });
    },

    gauge: (canvasId, value, max, color) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      return new Chart(canvas, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [value, max - value],
            backgroundColor: [color, '#1a2540'],
            borderWidth: 0,
            circumference: 180,
            rotation: -90,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          animation: { duration: 800 },
        }
      });
    },

    miniBar: (canvasId, labels, data, colors) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      return new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: colors || '#1a7fe8', borderRadius: 3, borderSkipped: false }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          animation: { duration: 600 },
        }
      });
    },

    lineChart: (canvasId, labels, datasets, opts = {}) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      return new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: opts.legend ?? { display: true, position: 'top', labels: { color: '#8095be', font: { size: 10 }, boxWidth: 20, padding: 10 } },
            tooltip: { mode: 'index', intersect: false, backgroundColor: '#111c35', borderColor: '#2a5298', borderWidth: 1, titleColor: '#eef2ff', bodyColor: '#8095be', titleFont: { size: 11 }, bodyFont: { size: 10 } },
          },
          scales: {
            x: { grid: { color: 'rgba(42,82,152,0.15)', drawBorder: false }, ticks: { color: '#4a5f82', font: { size: 9 }, maxTicksLimit: 8 } },
            y: { grid: { color: 'rgba(42,82,152,0.15)', drawBorder: false }, ticks: { color: '#4a5f82', font: { size: 9 } }, beginAtZero: opts.beginAtZero ?? false },
          },
          animation: { duration: 500 },
          interaction: { mode: 'index', intersect: false },
          ...(opts.extra || {}),
        }
      });
    },

    pieChart: (canvasId, labels, data, colors) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      return new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#101e36', borderWidth: 2 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '55%',
          plugins: {
            legend: { display: true, position: 'right', labels: { color: '#8095be', font: { size: 10 }, boxWidth: 12, padding: 8 } },
            tooltip: { backgroundColor: '#111c35', borderColor: '#2a5298', borderWidth: 1, titleColor: '#eef2ff', bodyColor: '#8095be' },
          },
          animation: { duration: 800 },
        }
      });
    },
  };

  /* ── Chart.js Global Defaults ──────────────────────────── */
  function setChartDefaults() {
    Chart.defaults.color = '#8095be';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = 'rgba(42,82,152,0.2)';
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    setChartDefaults();
    startClock();
    // bind nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => navigate(tab.dataset.dash));
    });
    // add vendor label
    const vendor = document.createElement('div');
    vendor.className = 'footer-vendor';
    vendor.style.cssText = 'position:fixed;bottom:4px;right:10px;z-index:9999;font-size:9px;color:#4a5f82;';
    vendor.textContent = 'PT Limabelapusat Inovasi Informatika';
    document.body.appendChild(vendor);
    // init global HUD (notification bell)
    window.GlobalHUD?.init();
    // init first dashboard
    setTimeout(() => {
      const mod = dashModules['command']?.();
      if (mod && mod.init) mod.init();
    }, 100);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, utils };
})();
