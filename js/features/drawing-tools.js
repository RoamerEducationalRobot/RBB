// drawing-tools.js — SVG drawing tools and HSV colour picker
// Phase 2: extracted from index_integrate_275.html
'use strict';
// ── Shared drawing state ──────────────────────────────────────────────────────
var cdActiveTool    = null;        // 'select' | 'rect' | null
var cdStrokeColour  = '#000000';   // current stroke / line colour
var cdStrokeWidth   = 2;           // 1–5
var cdLineType      = 'solid';     // 'solid' | 'dashed' | 'dotted'
var cdMyColours     = [];          // saved colours (session)

// ── Tool selection ────────────────────────────────────────────────────────────
function cdSetTool(tool) {
  cdActiveTool = (cdActiveTool === tool) ? null : tool;
  ['select','rect'].forEach(function(t) {
    var btn = document.getElementById('cdTool' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('active', cdActiveTool === t);
  });
  cdUpdateCanvasCursor();
}

function cdClosePicker() {
  var dlg = document.getElementById('cdPickerDlg');
  if (dlg) dlg.classList.remove('visible');
  var btn = document.getElementById('cdToolColourWheel');
  if (btn) btn.classList.remove('active');
}

// Colour wheel button — toggles the unified dialogue independently of tool state
function cdTogglePickerFromWheel() {
  var dlg = document.getElementById('cdPickerDlg');
  var btn = document.getElementById('cdToolColourWheel');
  if (!dlg) return;
  if (dlg.classList.contains('visible')) {
    dlg.classList.remove('visible');
    if (btn) btn.classList.remove('active');
  } else {
    cdOpenPicker();
    if (btn) btn.classList.add('active');
  }
}

// Close picker when clicking outside it
document.addEventListener('mousedown', function(e) {
  var dlg = document.getElementById('cdPickerDlg');
  if (!dlg || !dlg.classList.contains('visible')) return;
  if (dlg.contains(e.target)) return;
  var strip = document.getElementById('cdToolsStrip');
  if (strip && strip.contains(e.target)) return;
  dlg.classList.remove('visible');
  var btn = document.getElementById('cdToolColourWheel');
  if (btn) btn.classList.remove('active');
});

function cdUpdateCanvasCursor() {
  var bg = document.getElementById('cdCanvasBg');
  if (!bg) return;
  if (cdMode === 'default') { bg.style.cursor = 'not-allowed'; return; }
  if (cdActiveTool === 'rect')   { bg.style.cursor = 'crosshair'; return; }
  if (cdActiveTool === 'select') { bg.style.cursor = 'default'; return; }
  bg.style.cursor = 'default';
}

// ── Stroke width ─────────────────────────────────────────────────────────────
function cdSetWidth(w) {
  cdStrokeWidth = w;
  document.querySelectorAll('#cdThicknessBtns .cd-visual-btn').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.w) === w);
  });
}

// ── Line type ─────────────────────────────────────────────────────────────────
function cdSetLineType(type) {
  cdLineType = type;
  document.querySelectorAll('#cdLineTypeBtns .cd-visual-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.lt === type);
  });
}

function cdGetDashArray(type, width) {
  if (type === 'dashed') return (width * 4) + ' ' + (width * 2);
  if (type === 'dotted') return '0.1 ' + (width * 3);
  return 'none';
}

function cdGetLineCap(type) {
  return (type === 'dotted') ? 'round' : 'butt';
}

// ── Custom / HSV panel toggle ─────────────────────────────────────────────────
function cdToggleHsvPanel() {
  var panel = document.getElementById('cdPickerHsvPanel');
  var btn   = document.getElementById('cdPickerCustomBtn');
  if (!panel) return;
  var showing = panel.classList.toggle('visible');
  if (btn) btn.textContent = showing ? 'Simple' : 'Custom…';
  if (showing) {
    cdPickerRenderSquare();
    cdPickerRenderHue();
  }
}

// ── Colour swatch sync ────────────────────────────────────────────────────────
function cdSyncSwatch() {
  var swatch = document.getElementById('cdColourSwatch');
  if (!swatch) return;
  if (cdStrokeColour === 'none') {
    swatch.style.background = '';
    swatch.style.backgroundImage =
      'linear-gradient(45deg,#ccc 25%,transparent 25%),' +
      'linear-gradient(-45deg,#ccc 25%,transparent 25%),' +
      'linear-gradient(45deg,transparent 75%,#ccc 75%),' +
      'linear-gradient(-45deg,transparent 75%,#ccc 75%)';
    swatch.style.backgroundSize = '8px 8px';
    swatch.style.backgroundPosition = '0 0,0 4px,4px -4px,-4px 0';
  } else {
    swatch.style.backgroundImage = '';
    swatch.style.background = cdStrokeColour;
  }
}

// ── Rectangle tool — mouse interaction ───────────────────────────────────────
var cdRectDraw = null;   // { startX, startY, previewEl }

(function() {
  // We attach listeners once the DOM is ready, via a small init called on charDesigner open
})();

function cdDrawToolInit() {
  var canvasBg = document.getElementById('cdCanvasBg');
  if (!canvasBg || canvasBg._drawToolsBound) return;
  canvasBg._drawToolsBound = true;

  canvasBg.addEventListener('mousedown', function(e) {
    if (cdMode === 'default') return;
    if (cdActiveTool !== 'rect') return;
    e.preventDefault();
    var pt = cdSvgPoint(e);
    cdRectDraw = { x0: pt.x, y0: pt.y, previewEl: null };
  });

  document.addEventListener('mousemove', function(e) {
    if (!cdRectDraw) return;
    var pt = cdSvgPoint(e);
    var x = Math.min(cdRectDraw.x0, pt.x);
    var y = Math.min(cdRectDraw.y0, pt.y);
    var w = Math.abs(pt.x - cdRectDraw.x0);
    var h = Math.abs(pt.y - cdRectDraw.y0);

    var svg = document.getElementById('cdCanvas');
    if (!cdRectDraw.previewEl) {
      var ns = 'http://www.w3.org/2000/svg';
      cdRectDraw.previewEl = document.createElementNS(ns, 'rect');
      cdRectDraw.previewEl.setAttribute('class', 'cd-preview-rect');
      cdRectDraw.previewEl.setAttribute('fill', 'none');
      cdRectDraw.previewEl.setAttribute('stroke', cdStrokeColour === 'none' ? 'transparent' : cdStrokeColour);
      cdRectDraw.previewEl.setAttribute('stroke-width', cdStrokeWidth);
      cdRectDraw.previewEl.setAttribute('stroke-dasharray', '4 2');  // always dashed for preview
      cdRectDraw.previewEl.setAttribute('pointer-events', 'none');
      // Insert before pen hole dot so dot stays on top
      var dot = svg.querySelector('.cd-pen-hole-dot');
      if (dot) svg.insertBefore(cdRectDraw.previewEl, dot);
      else svg.appendChild(cdRectDraw.previewEl);
    }
    cdRectDraw.previewEl.setAttribute('x', x);
    cdRectDraw.previewEl.setAttribute('y', y);
    cdRectDraw.previewEl.setAttribute('width', w);
    cdRectDraw.previewEl.setAttribute('height', h);
  });

  document.addEventListener('mouseup', function(e) {
    if (!cdRectDraw) return;
    var pt = cdSvgPoint(e);
    var x = Math.min(cdRectDraw.x0, pt.x);
    var y = Math.min(cdRectDraw.y0, pt.y);
    var w = Math.abs(pt.x - cdRectDraw.x0);
    var h = Math.abs(pt.y - cdRectDraw.y0);

    // Remove preview
    if (cdRectDraw.previewEl && cdRectDraw.previewEl.parentNode) {
      cdRectDraw.previewEl.parentNode.removeChild(cdRectDraw.previewEl);
    }
    cdRectDraw = null;

    // Only commit if meaningful size
    if (w < 2 && h < 2) return;

    var ns  = 'http://www.w3.org/2000/svg';
    var svg = document.getElementById('cdCanvas');
    var rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', cdStrokeColour === 'none' ? 'transparent' : cdStrokeColour);
    rect.setAttribute('stroke-width', cdStrokeWidth);
    var da = cdGetDashArray(cdLineType, cdStrokeWidth);
    if (da !== 'none') rect.setAttribute('stroke-dasharray', da);
    rect.setAttribute('stroke-linecap', cdGetLineCap(cdLineType));
    rect.setAttribute('class', 'cd-drawn-shape');

    // Insert before pen hole dot
    var dot = svg.querySelector('.cd-pen-hole-dot');
    if (dot) svg.insertBefore(rect, dot);
    else svg.appendChild(rect);

    cdUpdatePreview();
  });
}

// Convert mouse event to SVG coordinate space
function cdSvgPoint(e) {
  var svg = document.getElementById('cdCanvas');
  var pt  = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  var matrix = svg.getScreenCTM();
  if (matrix) pt = pt.matrixTransform(matrix.inverse());
  return pt;
}

// ── HSV Colour Picker ─────────────────────────────────────────────────────────

var cdPickerHsv    = { h: 0, s: 0, v: 0 };   // current colour in HSV
var cdPickerMode   = 'hex';                    // 'hex' | 'rgb'
var cdPickerTarget = 'stroke';                 // future: 'fill' when fill tool added

// ── Custom / HSV panel toggle — no longer needed, HSV always visible ──────────
// (retained as no-op to avoid errors from any lingering references)
function cdToggleHsvPanel() {}

function cdOpenPicker() {
  var dlg = document.getElementById('cdPickerDlg');
  dlg.classList.add('visible');
  cdPickerFromHex(cdStrokeColour === 'none' ? '#000000' : cdStrokeColour);
  cdPickerRenderSquare();
  cdPickerRenderHue();
  cdPickerRenderMyColours();
  // Sync visual buttons
  cdSetWidth(cdStrokeWidth);
  cdSetLineType(cdLineType);
}

// HSV ↔ RGB ↔ Hex helpers
function cdHsvToRgb(h, s, v) {
  var r, g, b;
  var i = Math.floor(h / 60) % 6;
  var f = h / 60 - Math.floor(h / 60);
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);
  switch (i) {
    case 0: r=v; g=t; b=p; break;
    case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;
    case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;
    default:r=v; g=p; b=q; break;
  }
  return {
    r: Math.round(r*255),
    g: Math.round(g*255),
    b: Math.round(b*255)
  };
}

function cdRgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r,g,b), min = Math.min(r,g,b);
  var d = max - min;
  var h = 0, s = (max === 0 ? 0 : d / max), v = max;
  if (d !== 0) {
    switch(max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s, v: v };
}

function cdHexToRgb(hex) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return {r:r, g:g, b:b};
}

function cdRgbToHex(r,g,b) {
  return '#' + [r,g,b].map(function(v) {
    return ('0' + Math.round(v).toString(16)).slice(-2);
  }).join('');
}

function cdPickerCurrentHex() {
  var rgb = cdHsvToRgb(cdPickerHsv.h, cdPickerHsv.s, cdPickerHsv.v);
  return cdRgbToHex(rgb.r, rgb.g, rgb.b);
}

function cdPickerFromHex(hex) {
  if (!hex || hex === 'none' || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    cdPickerHsv = {h:0, s:0, v:0};
  } else {
    var rgb = cdHexToRgb(hex);
    cdPickerHsv = cdRgbToHsv(rgb.r, rgb.g, rgb.b);
  }
  cdPickerUpdateInputs();
  cdPickerUpdateCursors();
}

function cdPickerSetHex(hex) {
  if (hex === 'none') {
    cdStrokeColour = 'none';
    cdSyncSwatch();
    cdClosePicker();
    return;
  }
  cdPickerFromHex(hex);
  cdPickerCommit();
  cdPickerRenderSquare();
  cdPickerRenderHue();
}

function cdPickerCommit() {
  var hex = cdPickerCurrentHex();
  cdStrokeColour = hex;
  cdSyncSwatch();
  cdPickerUpdateInputs();
}

function cdPickerUpdateInputs() {
  var hex = cdPickerCurrentHex();
  var inp = document.getElementById('cdPickerHexInput');
  if (inp) inp.value = hex;
}

// Render the HSV square for current hue
function cdPickerRenderSquare() {
  var canvas = document.getElementById('cdPickerSquareCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 180, H = 140;
  canvas.width = W; canvas.height = H;

  // Hue gradient (left=white, right=pure hue)
  var hueRgb = cdHsvToRgb(cdPickerHsv.h, 1, 1);
  var hueHex = cdRgbToHex(hueRgb.r, hueRgb.g, hueRgb.b);
  var gradH = ctx.createLinearGradient(0,0,W,0);
  gradH.addColorStop(0, '#ffffff');
  gradH.addColorStop(1, hueHex);
  ctx.fillStyle = gradH;
  ctx.fillRect(0,0,W,H);

  // Dark-to-transparent gradient (top=transparent, bottom=black)
  var gradV = ctx.createLinearGradient(0,0,0,H);
  gradV.addColorStop(0, 'rgba(0,0,0,0)');
  gradV.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = gradV;
  ctx.fillRect(0,0,W,H);

  cdPickerUpdateCursors();
}

// Render the hue strip
function cdPickerRenderHue() {
  var canvas = document.getElementById('cdPickerHueCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var H = canvas.height;
  var grad = ctx.createLinearGradient(0,0,0,H);
  var stops = [0,60,120,180,240,300,360];
  stops.forEach(function(deg) {
    var rgb = cdHsvToRgb(deg, 1, 1);
    grad.addColorStop(deg/360, cdRgbToHex(rgb.r, rgb.g, rgb.b));
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,H);
  cdPickerUpdateCursors();
}

// Position the cursors based on current HSV
function cdPickerUpdateCursors() {
  var sq = document.getElementById('cdPickerSquare');
  var cur = document.getElementById('cdPickerCursor');
  if (sq && cur) {
    cur.style.left = (cdPickerHsv.s * 180) + 'px';
    cur.style.top  = ((1 - cdPickerHsv.v) * 140) + 'px';
  }
  var hc = document.getElementById('cdPickerHueCursor');
  if (hc) {
    hc.style.top = (cdPickerHsv.h / 360 * 140) + 'px';
  }
}

// HSV square drag
(function() {
  var draggingSq = false;
  document.addEventListener('DOMContentLoaded', function() {
    var sq = document.getElementById('cdPickerSquareCanvas');
    if (!sq) return;
    function updateFromSqEvent(e) {
      var rect = sq.getBoundingClientRect();
      var x = Math.max(0, Math.min(180, e.clientX - rect.left));
      var y = Math.max(0, Math.min(140, e.clientY - rect.top));
      cdPickerHsv.s = x / 180;
      cdPickerHsv.v = 1 - y / 140;
      cdPickerCommit();
      cdPickerUpdateCursors();
    }
    sq.addEventListener('mousedown', function(e) { draggingSq = true; updateFromSqEvent(e); });
    document.addEventListener('mousemove', function(e) { if (draggingSq) updateFromSqEvent(e); });
    document.addEventListener('mouseup',   function()  { draggingSq = false; });
  });
})();

// Hue slider drag
(function() {
  var draggingHue = false;
  document.addEventListener('DOMContentLoaded', function() {
    var hc = document.getElementById('cdPickerHueCanvas');
    if (!hc) return;
    function updateFromHueEvent(e) {
      var rect = hc.getBoundingClientRect();
      var y = Math.max(0, Math.min(140, e.clientY - rect.top));
      cdPickerHsv.h = y / 140 * 360;
      cdPickerRenderSquare();
      cdPickerCommit();
      cdPickerUpdateCursors();
    }
    hc.addEventListener('mousedown', function(e) { draggingHue = true; updateFromHueEvent(e); });
    document.addEventListener('mousemove', function(e) { if (draggingHue) updateFromHueEvent(e); });
    document.addEventListener('mouseup',   function()  { draggingHue = false; });
  });
})();

// Hex input change
function cdPickerHexChanged() {
  var inp = document.getElementById('cdPickerHexInput');
  if (!inp) return;
  var val = inp.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    cdPickerFromHex(val);
    cdPickerRenderSquare();
    cdPickerRenderHue();
    cdPickerCommit();
  }
}

// Mode toggle (Hex / RGB) — display only, hex is the working format
function cdPickerToggleMode() {
  cdPickerMode = (cdPickerMode === 'hex') ? 'rgb' : 'hex';
  var btn = document.getElementById('cdPickerModeBtn');
  var lbl = document.getElementById('cdPickerHexLabel');
  var inp = document.getElementById('cdPickerHexInput');
  if (!btn || !lbl || !inp) return;
  if (cdPickerMode === 'rgb') {
    btn.textContent = 'RGB';
    lbl.textContent = 'RGB:';
    var hex = cdPickerCurrentHex();
    var rgb = cdHexToRgb(hex);
    inp.value = rgb.r + ',' + rgb.g + ',' + rgb.b;
    inp.maxLength = 11;
  } else {
    btn.textContent = 'Hex';
    lbl.textContent = 'Hex:';
    inp.value = cdPickerCurrentHex();
    inp.maxLength = 7;
  }
}

// My Colours
function cdPickerAddMyColour() {
  var hex = cdPickerCurrentHex();
  if (cdMyColours.indexOf(hex) === -1) cdMyColours.push(hex);
  cdPickerRenderMyColours();
}

function cdPickerRenderMyColours() {
  var row = document.getElementById('cdPickerMyColoursRow');
  if (!row) return;
  var btn = document.getElementById('cdPickerAddBtn');
  while (row.firstChild) row.removeChild(row.firstChild);
  cdMyColours.forEach(function(hex, idx) {
    var wrap = document.createElement('div');
    wrap.className = 'cd-my-colour-wrap';

    var sw = document.createElement('div');
    sw.className = 'cd-my-colour-swatch';
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener('click', function() { cdPickerSetHex(hex); });
    wrap.appendChild(sw);

    var x = document.createElement('div');
    x.className = 'cd-my-colour-remove';
    x.textContent = '✕';
    x.title = 'Remove';
    x.addEventListener('click', function(e) {
      e.stopPropagation();
      cdMyColours.splice(idx, 1);
      cdPickerRenderMyColours();
    });
    wrap.appendChild(x);
    row.appendChild(wrap);
  });
  row.appendChild(btn);
}

// ── Hook drawing tool init into Character Designer open ───────────────────────
// Patch openCharDesignerFromNav to also init drawing tools
var _cdOrigOpenCharDesigner = openCharDesignerFromNav;
openCharDesignerFromNav = function(btn) {
  _cdOrigOpenCharDesigner(btn);
  cdDrawToolInit();
  cdSyncSwatch();
  cdUpdateCanvasCursor();
};

// Also initialise swatch on page load
(function() {
  window.addEventListener('load', function() { cdSyncSwatch(); });
})();

