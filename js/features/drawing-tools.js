// drawing-tools.js — SVG drawing tools and HSV colour picker
// Phase 2: extracted from index_integrate_275.html
'use strict';
// ── Shared drawing state ──────────────────────────────────────────────────────
var cdActiveTool    = null;        // active tool name
var cdPolyPoints    = [];          // in-progress polygon points [[x,y],...]
var cdPolyPreview   = null;        // preview polyline element
var cdSprayTimer    = null;        // spray interval timer
var cdStrokeColour  = '#000000';   // current stroke / line colour
var cdStrokeWidth   = 2;           // 1–5
var cdLineType      = 'solid';     // 'solid' | 'dashed' | 'dotted'
var cdMyColours     = [];          // saved colours (session)

// ── Tool selection ────────────────────────────────────────────────────────────
var CD_ALL_TOOLS = ['select','rect','circle','line','pencil','fill','eraser','polygon','brush','spray','load'];

function cdSetTool(tool) {
  cdActiveTool = (cdActiveTool === tool) ? null : tool;
  // Cancel any in-progress polygon
  if (tool !== 'polygon') cdPolyPoints = [];
  CD_ALL_TOOLS.forEach(function(t) {
    var id = 'cdTool' + t.charAt(0).toUpperCase() + t.slice(1);
    var btn = document.getElementById(id);
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
  var cursors = {
    select: 'default', rect: 'crosshair', circle: 'crosshair',
    line: 'crosshair', pencil: 'crosshair', brush: 'crosshair',
    fill: 'cell', eraser: 'cell', polygon: 'crosshair',
    spray: 'crosshair'
  };
  bg.style.cursor = cursors[cdActiveTool] || 'default';
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

// ── Helper: insert shape before pen hole dot ─────────────────────────────────
function cdInsertShape(svg, el) {
  var dot = svg.querySelector('.cd-pen-hole-dot');
  if (dot) svg.insertBefore(el, dot);
  else svg.appendChild(el);
  cdUpdatePreview();
}

// ── Helper: create SVG element with common stroke/fill attributes ─────────────
function cdMakeEl(tag) {
  var ns = 'http://www.w3.org/2000/svg';
  var el = document.createElementNS(ns, tag);
  el.setAttribute('class', 'cd-drawn-shape');
  el.setAttribute('stroke', cdStrokeColour === 'none' ? 'transparent' : cdStrokeColour);
  el.setAttribute('stroke-width', cdStrokeWidth);
  el.setAttribute('fill', 'none');
  var da = cdGetDashArray(cdLineType, cdStrokeWidth);
  if (da !== 'none') el.setAttribute('stroke-dasharray', da);
  el.setAttribute('stroke-linecap', cdGetLineCap(cdLineType));
  return el;
}

// ── Main drawing tool init ────────────────────────────────────────────────────
function cdDrawToolInit() {
  var canvasBg = document.getElementById('cdCanvasBg');
  if (!canvasBg || canvasBg._drawToolsBound) return;
  canvasBg._drawToolsBound = true;

  var svg = document.getElementById('cdCanvas');
  var drag = null;  // { tool, x0, y0, previewEl }
  var pencilPath = null;
  var pencilPoints = [];

  // ── mousedown ──────────────────────────────────────────────────────────────
  canvasBg.addEventListener('mousedown', function(e) {
    if (cdMode === 'default' || !cdActiveTool) return;
    e.preventDefault();
    var pt = cdSvgPoint(e);

    if (cdActiveTool === 'polygon') {
      cdPolyPoints.push([pt.x, pt.y]);
      cdUpdatePolyPreview(svg);
      return;
    }

    if (cdActiveTool === 'fill') {
      cdFillAt(svg, pt);
      return;
    }

    if (cdActiveTool === 'spray') {
      cdSprayAt(svg, pt);
      cdSprayTimer = setInterval(function() {
        var lastPt = drag ? drag.pt : pt;
        cdSprayAt(svg, lastPt);
      }, 40);
      drag = { tool: 'spray', pt: pt };
      return;
    }

    if (cdActiveTool === 'pencil' || cdActiveTool === 'brush') {
      pencilPoints = [[pt.x, pt.y]];
      pencilPath = cdMakeEl('path');
      pencilPath.setAttribute('d', 'M' + pt.x + ',' + pt.y);
      if (cdActiveTool === 'brush') {
        pencilPath.setAttribute('stroke-width', cdStrokeWidth * 3);
        pencilPath.setAttribute('stroke-linecap', 'round');
        pencilPath.setAttribute('stroke-linejoin', 'round');
        pencilPath.setAttribute('opacity', '0.75');
      }
      cdInsertShape(svg, pencilPath);
      return;
    }

    if (cdActiveTool === 'eraser') {
      drag = { tool: 'eraser', x0: pt.x, y0: pt.y, pt: pt };
      return;
    }

    // Drag tools: rect, circle, line
    drag = { tool: cdActiveTool, x0: pt.x, y0: pt.y, previewEl: null };
  });

  // ── mousemove ─────────────────────────────────────────────────────────────
  document.addEventListener('mousemove', function(e) {
    if (cdMode === 'default') return;
    var pt = cdSvgPoint(e);

    // Update spray drag point
    if (drag && drag.tool === 'spray') { drag.pt = pt; return; }

    // Pencil / brush
    if (pencilPath && pencilPoints.length > 0) {
      pencilPoints.push([pt.x, pt.y]);
      var d = 'M' + pencilPoints.map(function(p) { return p[0]+','+p[1]; }).join(' L');
      pencilPath.setAttribute('d', d);
      return;
    }

    // Eraser
    if (drag && drag.tool === 'eraser') {
      cdEraseAt(svg, pt, cdStrokeWidth * 3);
      return;
    }

    if (!drag || !drag.x0) return;
    var x0 = drag.x0, y0 = drag.y0;
    var ns = 'http://www.w3.org/2000/svg';

    if (!drag.previewEl) {
      var tag = drag.tool === 'line' ? 'line' :
                drag.tool === 'circle' ? 'ellipse' : 'rect';
      drag.previewEl = document.createElementNS(ns, tag);
      drag.previewEl.setAttribute('fill', 'none');
      drag.previewEl.setAttribute('stroke', cdStrokeColour === 'none' ? 'transparent' : cdStrokeColour);
      drag.previewEl.setAttribute('stroke-width', cdStrokeWidth);
      drag.previewEl.setAttribute('stroke-dasharray', '4 2');
      drag.previewEl.setAttribute('pointer-events', 'none');
      var dot = svg.querySelector('.cd-pen-hole-dot');
      if (dot) svg.insertBefore(drag.previewEl, dot);
      else svg.appendChild(drag.previewEl);
    }

    if (drag.tool === 'line') {
      drag.previewEl.setAttribute('x1', x0); drag.previewEl.setAttribute('y1', y0);
      drag.previewEl.setAttribute('x2', pt.x); drag.previewEl.setAttribute('y2', pt.y);
    } else if (drag.tool === 'circle') {
      var rx = Math.abs(pt.x - x0) / 2, ry = Math.abs(pt.y - y0) / 2;
      drag.previewEl.setAttribute('cx', (x0 + pt.x) / 2);
      drag.previewEl.setAttribute('cy', (y0 + pt.y) / 2);
      drag.previewEl.setAttribute('rx', rx); drag.previewEl.setAttribute('ry', ry);
    } else {  // rect
      drag.previewEl.setAttribute('x', Math.min(x0, pt.x));
      drag.previewEl.setAttribute('y', Math.min(y0, pt.y));
      drag.previewEl.setAttribute('width',  Math.abs(pt.x - x0));
      drag.previewEl.setAttribute('height', Math.abs(pt.y - y0));
    }
  });

  // ── mouseup ───────────────────────────────────────────────────────────────
  document.addEventListener('mouseup', function(e) {
    if (cdMode === 'default') return;

    // Spray stop
    if (cdSprayTimer) { clearInterval(cdSprayTimer); cdSprayTimer = null; }
    if (drag && drag.tool === 'spray') { drag = null; return; }

    // Pencil / brush commit
    if (pencilPath) {
      if (pencilPoints.length < 2) pencilPath.parentNode && pencilPath.parentNode.removeChild(pencilPath);
      pencilPath = null; pencilPoints = [];
      cdUpdatePreview(); return;
    }

    // Eraser stop
    if (drag && drag.tool === 'eraser') { drag = null; return; }

    if (!drag || !drag.previewEl) { drag = null; return; }
    var pt = cdSvgPoint(e);
    var x0 = drag.x0, y0 = drag.y0;

    // Remove preview
    if (drag.previewEl.parentNode) drag.previewEl.parentNode.removeChild(drag.previewEl);

    var el = cdMakeEl(drag.tool === 'line' ? 'line' : drag.tool === 'circle' ? 'ellipse' : 'rect');

    if (drag.tool === 'line') {
      el.setAttribute('x1', x0); el.setAttribute('y1', y0);
      el.setAttribute('x2', pt.x); el.setAttribute('y2', pt.y);
    } else if (drag.tool === 'circle') {
      var rx = Math.abs(pt.x - x0) / 2, ry = Math.abs(pt.y - y0) / 2;
      if (rx < 1 && ry < 1) { drag = null; return; }
      el.setAttribute('cx', (x0 + pt.x) / 2); el.setAttribute('cy', (y0 + pt.y) / 2);
      el.setAttribute('rx', rx); el.setAttribute('ry', ry);
    } else {
      var w = Math.abs(pt.x - x0), h = Math.abs(pt.y - y0);
      if (w < 2 && h < 2) { drag = null; return; }
      el.setAttribute('x', Math.min(x0, pt.x)); el.setAttribute('y', Math.min(y0, pt.y));
      el.setAttribute('width', w); el.setAttribute('height', h);
    }

    cdInsertShape(svg, el);
    drag = null;
  });

  // ── dblclick: close polygon ───────────────────────────────────────────────
  canvasBg.addEventListener('dblclick', function(e) {
    if (cdActiveTool !== 'polygon' || cdPolyPoints.length < 3) return;
    e.preventDefault();
    // Remove preview
    if (cdPolyPreview && cdPolyPreview.parentNode) cdPolyPreview.parentNode.removeChild(cdPolyPreview);
    cdPolyPreview = null;
    // Commit polygon
    var el = cdMakeEl('polygon');
    el.setAttribute('points', cdPolyPoints.map(function(p){return p[0]+','+p[1];}).join(' '));
    cdInsertShape(svg, el);
    cdPolyPoints = [];
  });
}

// ── Polygon preview ───────────────────────────────────────────────────────────
function cdUpdatePolyPreview(svg) {
  if (!cdPolyPreview) {
    var ns = 'http://www.w3.org/2000/svg';
    cdPolyPreview = document.createElementNS(ns, 'polyline');
    cdPolyPreview.setAttribute('fill', 'none');
    cdPolyPreview.setAttribute('stroke', cdStrokeColour === 'none' ? '#888' : cdStrokeColour);
    cdPolyPreview.setAttribute('stroke-width', cdStrokeWidth);
    cdPolyPreview.setAttribute('stroke-dasharray', '4 2');
    cdPolyPreview.setAttribute('pointer-events', 'none');
    var dot = svg.querySelector('.cd-pen-hole-dot');
    if (dot) svg.insertBefore(cdPolyPreview, dot);
    else svg.appendChild(cdPolyPreview);
  }
  cdPolyPreview.setAttribute('points', cdPolyPoints.map(function(p){return p[0]+','+p[1];}).join(' '));
}

// ── Fill tool (flood fill on SVG — fills clicked shape or adds bg rect) ───────
function cdFillAt(svg, pt) {
  // In SVG, find topmost element at click point and fill it
  var els = svg.elementsFromPoint ? null : null;
  var target = document.elementFromPoint(
    pt.x * svg.getScreenCTM().a + svg.getScreenCTM().e,
    pt.y * svg.getScreenCTM().d + svg.getScreenCTM().f
  );
  if (target && target !== svg && target.classList.contains('cd-drawn-shape')) {
    target.setAttribute('fill', cdStrokeColour);
  } else {
    // Add a background colour rect
    var ns = 'http://www.w3.org/2000/svg';
    var bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
    bg.setAttribute('width', '200'); bg.setAttribute('height', '200');
    bg.setAttribute('fill', cdStrokeColour);
    bg.setAttribute('class', 'cd-drawn-shape');
    bg.setAttribute('pointer-events', 'none');
    svg.insertBefore(bg, svg.firstChild.nextSibling); // after template group
  }
  cdUpdatePreview();
}

// ── Eraser ────────────────────────────────────────────────────────────────────
function cdEraseAt(svg, pt, r) {
  // Erase by converting point to screen coords and checking elements
  var screenX = pt.x * svg.getScreenCTM().a + svg.getScreenCTM().e;
  var screenY = pt.y * svg.getScreenCTM().d + svg.getScreenCTM().f;
  var target = document.elementFromPoint(screenX, screenY);
  if (target && target.classList && target.classList.contains('cd-drawn-shape')) {
    target.parentNode.removeChild(target);
    cdUpdatePreview();
  }
}

// ── Spray ─────────────────────────────────────────────────────────────────────
function cdSprayAt(svg, pt) {
  var ns = 'http://www.w3.org/2000/svg';
  var radius = cdStrokeWidth * 8;
  var density = 6;
  for (var i = 0; i < density; i++) {
    var angle = Math.random() * Math.PI * 2;
    var dist  = Math.random() * radius;
    var cx = pt.x + Math.cos(angle) * dist;
    var cy = pt.y + Math.sin(angle) * dist;
    var dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    dot.setAttribute('r', Math.max(0.5, cdStrokeWidth * 0.4));
    dot.setAttribute('fill', cdStrokeColour);
    dot.setAttribute('class', 'cd-drawn-shape');
    dot.setAttribute('pointer-events', 'none');
    cdInsertShape(svg, dot);
  }
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

