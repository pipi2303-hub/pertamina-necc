# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

This is a static web app — no build step required.

```bash
# Serve locally (required — file:// won't work due to Leaflet/CDN)
python3 -m http.server 8080
# then open http://localhost:8080

# Alternative
npx serve .
```

## Architecture

**Single-page app, vanilla JS, no bundler.**

`index.html` is the shell. Seven empty `<div id="dash-*" class="dash">` containers are pre-rendered. Each dashboard module writes its own HTML into its container via `innerHTML` when activated, then destroys it when navigating away.

### Execution flow

1. `js/app.js` runs first — defines `window.App` (IIFE) with:
   - `navigate(name)` — calls `destroy()` on the outgoing module, swaps `.active` class, calls `init()` on the incoming module via `setTimeout(..., 30)`
   - `utils` — shared chart factories (`sparkline`, `gauge`, `lineChart`, `miniBar`, `pieChart`), formatters (`fmtIDR`, `fmt`, `fmtN`), and data generators (`timeSeries`, `timeLabels`)
2. Dashboard scripts (`js/cmd-center.js` through `js/spklu.js`) each define a global `window.Dash*` object with `{ init, destroy }`. They are loaded but **not executed** until `navigate()` activates them.
3. On `DOMContentLoaded`, `app.js` binds nav tabs and calls `DashCommand.init()` to boot the first dashboard.

### Dashboard module pattern

Every dashboard module follows this structure:

```js
window.DashXxx = (() => {
  let charts = {};   // Chart.js instances — keyed by name
  let maps = {};     // Leaflet instances
  let intervals = [];

  function init() {
    const c = document.getElementById('dash-xxx');
    c.innerHTML = render();            // inject HTML
    setTimeout(() => {
      initCharts();                    // create Chart.js instances
      initMap();                       // create Leaflet map (if any)
      startUpdates();                  // setIntervals for live data
    }, 80);
  }

  function destroy() {
    intervals.forEach(clearInterval);
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
    if (maps.main) { maps.main.remove(); maps.main = null; }
    charts = {}; maps = {}; intervals = [];
  }

  return { init, destroy };
})();
```

**Critical:** `destroy()` must clean up all Chart.js and Leaflet instances before `init()` is called again — otherwise canvas reuse throws errors and maps stack.

### Shared utilities (`App.utils`)

All chart creation goes through `App.utils.*` factory functions, not raw `new Chart()`. This keeps Chart.js config consistent (dark theme colors, no legends on sparklines, etc.).

| Factory | Purpose |
|---|---|
| `sparkline(id, data, color, fill)` | 28px tall trend line in KPI cards |
| `gauge(id, value, max, color)` | Semicircle doughnut (circumference 180°) |
| `lineChart(id, labels, datasets, opts)` | Full line chart with grid |
| `miniBar(id, labels, data, colors)` | No-axis bar chart |
| `pieChart(id, labels, data, colors)` | Doughnut with right-side legend |

### CSS architecture

All styles live in `css/style.css`. Dashboard-specific grid layouts use **ID selectors** (`#dash-command`, `#dash-upstream`, etc.) defined at the bottom of the file. Component styles (`.kpi-card`, `.alert-item`, `.badge`, `.card`, etc.) are reused across dashboards.

The `.dash` / `.dash.active` toggle (`display:none` → `display:block`) controls visibility. Dashboard content divs set their own `display:grid` via inline style — do **not** rely on the CSS `#dash-*` grid rules for layout (they are present but superseded by the child wrapper divs created in `render()`).

### External dependencies (CDN only)

- **Leaflet 1.9.4** — interactive maps, tiles from CartoDB Dark Matter
- **Chart.js 4.4.1** — all charts
- **Google Fonts** — Inter + JetBrains Mono

All map tiles are inverted via CSS (`filter: invert(1) hue-rotate(200deg) brightness(0.5)`) to match the dark theme.

## Adding a New Dashboard

1. Add a `<div id="dash-newname" class="dash"></div>` in `index.html`
2. Add a `<button class="nav-tab" data-dash="newname">` in the navbar
3. Register in `app.js` `dashModules` map: `newname: () => window.DashNewname`
4. Create `js/newname.js` following the module pattern above
5. Add `<script src="js/newname.js"></script>` to `index.html` (before `</body>`)

## Data

All data is **simulated** — `App.utils.timeSeries()` generates random walk arrays, and `App.utils.rand()` / `App.utils.vary()` add noise. There is no backend. To connect real data, replace the mock values inside each dashboard's `render()` and `startUpdates()` functions.
