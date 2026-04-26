// sets-panel.js — Set (grid world) builder: dimensions, boundary type, scene list
// Phase 2: extracted from index_integrate_275.html
'use strict';
// ══════════════════════════════════════════════════════════════════════
// SCENE BUILDER
// ══════════════════════════════════════════════════════════════════════

var sbScenes = [];
var sbCurrentIdx = 0;
var sbCellPx = 48;
var sbTool = 'passage';
var sbDrawing = false;

function sbMakeScene(name) {
  // Always odd dimensions so (0,0) is a cell centre not a grid intersection
  return { name: name || 'Set 1', cellPx: 48, gridW: 10, gridH: 10,
           grid: null, mode: 'fill', setType: 'self-contained' };
}
function sbCurrentScene() { return sbScenes[sbCurrentIdx]; }

// ── Grid mode — driven by setType, not a separate mode radio ─────────
function sbGetMode() {
  // Legacy compatibility — return 'fixed' for self-contained, 'fill' for wrap/connected
  var sc = sbCurrentScene();
  var st = (sc && sc.setType) || 'self-contained';
  return st === 'self-contained' ? 'fixed' : 'fill';
}

function sbUpdateDialogueForSetType() {
  var sc = sbCurrentScene();
  var st = (sc && sc.setType) || 'self-contained';
  var isContained = (st === 'self-contained');
  var dimsRow = document.getElementById('sbGridDimsRow');
  if (dimsRow) dimsRow.style.display = isContained ? 'block' : 'none';
  var lbl = document.getElementById('sbSliderLabel');
  if (lbl) lbl.textContent = isContained ? 'Cell Size' : 'Cell Size (determines cell count)';
}

function sbGetMaxCellPx() {
  var area = document.getElementById('sbCanvasArea');
  var cols = Math.max(1, parseInt(document.getElementById('sbGridW').value) || 10);
  var rows = Math.max(1, parseInt(document.getElementById('sbGridH').value) || 10);
  var maxPxW = Math.floor((area.clientWidth  - 4) / cols);
  var maxPxH = Math.floor((area.clientHeight - 4) / rows);
  return Math.max(8, Math.min(maxPxW, maxPxH));
}

function sbApplyFixedGrid() {
  var maxPx = sbGetMaxCellPx();
  sbCellPx = maxPx;
  var slider = document.getElementById('sbCellSlider');
  slider.max = maxPx;
  slider.value = maxPx;
  document.getElementById('sbCellSliderVal').textContent = maxPx + 'px';
  var sc = sbCurrentScene();
  if (sc) {
    sc.cellPx = maxPx;
    sc.gridW = parseInt(document.getElementById('sbGridW').value) || 10;
    sc.gridH = parseInt(document.getElementById('sbGridH').value) || 10;
    sbEnsureGrid(sc);
  }
  sbRedraw();
}

function sbOnModeChange() {
  // No-op — mode is now derived from setType. Kept for compatibility.
}

function sbOnGridInput() {
  if (sbGetMode() !== 'fixed') return;
  sbApplyFixedGrid();
}

// ── Dimensions ────────────────────────────────
function sbGetCols() {
  if (sbGetMode() === 'fixed') {
    return Math.max(2, Math.round(parseFloat(document.getElementById('sbGridW').value) || 10));
  } else {
    var area = document.getElementById('sbCanvasArea');
    return Math.max(1, Math.floor((area.clientWidth  - 4) / sbCellPx));
  }
}
function sbGetRows() {
  if (sbGetMode() === 'fixed') {
    return Math.max(2, Math.round(parseFloat(document.getElementById('sbGridH').value) || 10));
  } else {
    var area = document.getElementById('sbCanvasArea');
    return Math.max(1, Math.floor((area.clientHeight - 4) / sbCellPx));
  }
}

// ── Slider ────────────────────────────────────
function sbOnCellSlider() {
  var newPx = parseInt(document.getElementById('sbCellSlider').value);
  var sc = sbCurrentScene();
  sbCellPx = newPx;
  document.getElementById('sbCellSliderVal').textContent = newPx + 'px';

  if (sbGetMode() === 'fixed') {
    // Self-contained — slider adjusts cell size within the fixed grid
    if (sc) sc.cellPx = newPx;
    sbRedraw();
  } else {
    // Wrap/Connected — cell count fills canvas, driven by cell size
    var area = document.getElementById('sbCanvasArea');
    var areaW = area ? area.clientWidth  : 0;
    var areaH = area ? area.clientHeight : 0;
    // Guard: if panel is hidden or not yet laid out, clientWidth/Height return 0.
    // Fall back to the canvas element's own dimensions, then to last-known grid values.
    if (areaW < 16 || areaH < 16) {
      var cv = document.getElementById('sbCanvas');
      areaW = (cv && cv.width  > 16) ? cv.width  : areaW;
      areaH = (cv && cv.height > 16) ? cv.height : areaH;
    }
    var cols = (areaW >= 16) ? Math.max(1, Math.floor((areaW - 4) / newPx))
                              : (sc ? (sc.gridW || 10) : 10);
    var rows = (areaH >= 16) ? Math.max(1, Math.floor((areaH - 4) / newPx))
                              : (sc ? (sc.gridH || 10) : 10);
    document.getElementById('sbGridW').value = cols;
    document.getElementById('sbGridH').value = rows;
    if (sc) { sc.cellPx = newPx; sbEnsureGrid(sc); }
    sbRedraw();
  }
}

// ── Scene list ────────────────────────────────
function sbAddScene() {
  var idx = sbScenes.length + 1;
  sbScenes.push(sbMakeScene('Set ' + idx));
  sbCurrentIdx = sbScenes.length - 1;
  sbRenderSceneList();
}

function sbLoadSet() {
  // Placeholder — activity library integration pending
  alert('Load Set: activity library integration coming soon.');
}

function sbSetTypeChange(val) {
  var sc = sbCurrentScene();
  if (sc) sc.setType = val;
  sbUpdateDialogueForSetType();
  // For wrap/connected — recalculate cell count from current cell size
  if (val !== 'self-contained') {
    document.getElementById('sbCellSlider').max = 96;
    sbOnCellSlider();
  } else {
    sbApplyFixedGrid();
  }
}

function sbSelectScene(idx) {
  sbCurrentIdx = idx;
  sbRenderSceneList();
  sbOpenBuilder();
}

function sbRenderSceneList() {
  var list = document.getElementById('sceneList');
  list.innerHTML = '';
  sbScenes.forEach(function(sc, i) {
    var isActive = (i === sbCurrentIdx);
    var typeLabel = sc.setType === 'wrap' ? 'Wrap' : sc.setType === 'connected' ? 'Connected' : 'Self-contained';
    var row = document.createElement('div');
    row.style.cssText =
      'display:flex;align-items:center;padding:8px 12px;gap:8px;' +
      'border-bottom:1px solid #eee;cursor:pointer;' +
      'background:' + (isActive ? '#f0f6ff' : '#fff') + ';' +
      'border-left:3px solid ' + (isActive ? '#00A0E3' : 'transparent') + ';';
    row.innerHTML =
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:12px;font-weight:bold;color:#1E2E53;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + sc.name + '</div>' +
        '<div style="font-size:10px;color:#888;margin-top:1px;">' +
          (sc.mode === 'fixed' ? sc.gridW + ' × ' + sc.gridH + ' · ' : 'Full Screen · ') + typeLabel +
        '</div>' +
      '</div>' +
      '<button onclick="sbSelectScene(' + i + ')" ' +
        'style="padding:3px 8px;font-size:10px;font-weight:bold;' +
        'background:#1E2E53;color:#fff;border:none;border-radius:3px;cursor:pointer;">Edit</button>' +
      '<button onclick="sbDeleteScene(' + i + ')" ' +
        'style="padding:3px 6px;font-size:10px;' +
        'background:transparent;color:#cc3030;border:1px solid #cc3030;' +
        'border-radius:3px;cursor:pointer;">✕</button>';
    list.appendChild(row);
  });
  if (sbScenes.length === 0) {
    list.innerHTML =
      '<div style="padding:14px;font-size:12px;color:#999;text-align:center;">' +
      'No sets yet. Click + New Set to begin.</div>';
  }
}

function sbDeleteScene(idx) {
  if (!confirm('Delete set "' + sbScenes[idx].name + '"?')) return;
  sbScenes.splice(idx, 1);
  if (sbCurrentIdx >= sbScenes.length) sbCurrentIdx = Math.max(0, sbScenes.length - 1);
  sbRenderSceneList();
  // If no sets left, revert RG to standard 10×10 default
  if (sbScenes.length === 0) {
    rwInitDefaultSet();
  }
}

function rwInitDefaultSet() {
  // Standard 10×10 self-contained set — always available as fallback
  rw.wsW = 10; rw.wsH = 10;
  rw.setType = 'self-contained';
  rwFitCanvas();
  rwRender();
  // Show message in RG
  rwSetCmd('Standard 10×10 Set — go to Settings > Sets to customise');
}

// Make dialogue draggable
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var dlg = document.getElementById('sbDialogue');
    var hdr = document.getElementById('sbDlgHeader');
    if (!dlg || !hdr) return;
    var dragging = false, ox = 0, oy = 0;
    hdr.style.cursor = 'move';
    hdr.addEventListener('mousedown', function(e) {

      dragging = true;
      var r = dlg.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      dlg.style.left = (e.clientX - ox) + 'px';
      dlg.style.top  = (e.clientY - oy) + 'px';
      dlg.style.right = 'auto';
      dlg.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', function() { dragging = false; });
  });
})();

// ── Builder open/close ────────────────────────
function sbOpenBuilderFromSettings() {
  // Open Set Builder directly from Settings > Sets
  sbOpenBuilder();
}

function sbSyncSetTypeRadios(val) {
  // Keep old Settings panel radios in sync (they may be hidden but keep state)
  document.querySelectorAll('input[name="sbSetType"]').forEach(function(r) {
    r.checked = (r.value === val);
  });
  // Keep bottom bar radios in sync
  document.querySelectorAll('input[name="sbSetTypeBar"]').forEach(function(r) {
    r.checked = (r.value === val);
  });
}

function sbOpenBuilder() {
  if (sbScenes.length === 0) sbAddScene();
  document.getElementById('sceneBuilderOverlay').classList.add('active');
  document.getElementById('sbRecallArrow').classList.add('visible');
  sbInitBuilder();
  // Redraw after layout settles to fix first-open sizing
  setTimeout(function() { sbRedraw(); }, 50);
}

function sbCloseBuilder() {
  document.getElementById('sceneBuilderOverlay').classList.remove('active');
  document.getElementById('sbRecallArrow').classList.remove('visible');
  document.getElementById('sbDialogue').classList.remove('open');
}

function sbCancelBuilder() {
  sbCloseBuilder();
  var settingsBtn = Array.from(document.querySelectorAll('.tabBtn')).find(function(b) {
    return b.textContent.indexOf('Settings') >= 0;
  });
  if (settingsBtn) showTab('settings', settingsBtn);
}

function sbSaveScene() {
  var sc = sbCurrentScene();
  if (!sc) return;
  // Close and navigate FIRST — nothing can stop this
  sbCloseBuilder();
  var settingsBtn = Array.from(document.querySelectorAll('.tabBtn')).find(function(b) {
    return b.textContent.indexOf('Settings') >= 0;
  });
  if (settingsBtn) showTab('settings', settingsBtn);
  // Then transfer settings
  rw.wsW = sbGetCols();
  rw.wsH = sbGetRows();
  rw.setType  = sc.setType || 'self-contained';
  rw.sceneGrid = sc.grid ? sc.grid.map(function(r) { return r.slice(); }) : null;
  rwShowRulers = document.getElementById('sbRulersToggle').checked;
  try { rwFitCanvas(); } catch(e) {}
  try { rwRender(); } catch(e) {}
  sbRenderSceneList();
}

function sbRecallSidebar() {
  sbCloseBuilder();
  showTab('settings', document.querySelector('.tabBtn[onclick*="settings"]'));
}

// ── Builder init ──────────────────────────────
function sbInitBuilder() {
  var sc = sbCurrentScene();
  document.getElementById('sbSceneNameInput').value = sc.name;
  sbCellPx = sc.cellPx || 48;
  // Restore mode radio
  var mode = sc.mode || 'fill';
  document.querySelectorAll('input[name="sbMode"]').forEach(function(r) {
    r.checked = (r.value === mode);
  });
  // Set grid W/H inputs
  document.getElementById('sbGridW').value = sc.gridW || 10;
  document.getElementById('sbGridH').value = sc.gridH || 10;
  // Reset slider range for fill mode default
  document.getElementById('sbCellSlider').max = 96;
  document.getElementById('sbCellSlider').value = sbCellPx;
  document.getElementById('sbCellSliderVal').textContent = sbCellPx + 'px';
  sbTool = 'mark';
  document.querySelectorAll('.sb-tool-btn').forEach(function(b) { b.classList.remove('active'); });
  var markBtn = document.getElementById('sbtool-mark');
  if (markBtn) markBtn.classList.add('active');
  sbEnsureGrid(sc);
  // Apply dialogue controls for current setType
  sbUpdateDialogueForSetType();
  sbOnCellSlider();
  sbAttachCanvasEvents();
  // Open dialogue automatically
  document.getElementById('sbDialogue').classList.add('open');
}

function sbEnsureGrid(sc) {
  if (!sc) return;
  var cols = sbGetCols();
  var rows = sbGetRows();
  sc.gridW = cols; sc.gridH = rows;
  if (!sc.grid || sc.grid.length !== rows || (sc.grid[0] && sc.grid[0].length !== cols)) {
    var old = sc.grid || [];
    sc.grid = [];
    for (var r = 0; r < rows; r++) {
      sc.grid[r] = [];
      for (var c = 0; c < cols; c++) {
        sc.grid[r][c] = (old[r] && old[r][c] !== undefined) ? old[r][c] : 0;
      }
    }
  }
}

// ── Tool selection ────────────────────────────
function sbSetTool(tool, btn) {
  sbTool = tool;
  document.querySelectorAll('.sb-tool-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
}

// ── Drawing ───────────────────────────────────
function sbCellFromXY(x, y) {
  var canvas = document.getElementById('sbCanvas');
  var cols = sbGetCols();
  var rows = sbGetRows();
  var offX = Math.floor((canvas.width  - cols * sbCellPx) / 2);
  var offY = Math.floor((canvas.height - rows * sbCellPx) / 2);
  var col = Math.floor((x - offX) / sbCellPx);
  var row = Math.floor((y - offY) / sbCellPx);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { col: col, row: row };
}

function sbPaintCell(col, row) {
  var sc = sbCurrentScene();
  if (!sc || !sc.grid) return;
  var rows = sbGetRows(); var cols = sbGetCols();
  if (row < 0 || row >= rows || col < 0 || col >= cols) return;
  sc.grid[row][col] = sbTool === 'mark' ? 1 : 0;
}

function sbAttachCanvasEvents() {
  var canvas = document.getElementById('sbCanvas');
  // Cell painting disabled — canvas is preview only.
  // Painting will be available in Settings > Scene.
  canvas.style.cursor = 'default';
  canvas.onmousemove = function(ev) {
    var rect = canvas.getBoundingClientRect();
    var cell = sbCellFromXY(ev.clientX - rect.left, ev.clientY - rect.top);
    if (cell) {
      document.getElementById('sbDragInfo').textContent =
        'Col ' + (cell.col+1) + ' × Row ' + (cell.row+1);
    }
  };
  canvas.onmousedown = null;
  canvas.onmouseup   = null;
  canvas.onmouseleave = null;
  canvas.ontouchstart = null;
  canvas.ontouchmove = function(ev) {
    ev.preventDefault();
    var t = ev.touches[0]; var rect = canvas.getBoundingClientRect();
    var cell = sbCellFromXY(t.clientX - rect.left, t.clientY - rect.top);
    if (cell) { sbPaintCell(cell.col, cell.row); sbRedraw(); }
  };
  canvas.ontouchend = function() { sbDrawing = false; };
}

// ── Redraw ────────────────────────────────────
function sbRedraw() {
  var canvas = document.getElementById('sbCanvas');
  var area   = document.getElementById('sbCanvasArea');
  var cols   = sbGetCols();
  var rows   = sbGetRows();
  // Always fit within available area
  if (area.clientWidth > 0 && area.clientHeight > 0) {
    var maxPxW = Math.floor((area.clientWidth  - 4) / cols);
    var maxPxH = Math.floor((area.clientHeight - 4) / rows);
    var maxFit = Math.max(8, Math.min(maxPxW, maxPxH));
    if (sbCellPx > maxFit) sbCellPx = maxFit;
  }
  var w = cols * sbCellPx;
  var h = rows * sbCellPx;
  canvas.width  = w;
  canvas.height = h;
  canvas.style.position = 'absolute';
  canvas.style.left = Math.max(0, Math.floor((area.clientWidth  - w) / 2)) + 'px';
  canvas.style.top  = Math.max(0, Math.floor((area.clientHeight - h) / 2)) + 'px';

  var ctx = canvas.getContext('2d');
  var sc  = sbCurrentScene();

  // 1. Background — white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  if (!sc || !sc.grid) return;

  // 2. Grid lines
  // Grid always shown in Set Builder
  ctx.strokeStyle = 'rgba(150,180,220,0.6)';
  ctx.lineWidth = 1;
  for (var c2 = 0; c2 <= cols; c2++) {
    ctx.beginPath(); ctx.moveTo(c2*sbCellPx, 0); ctx.lineTo(c2*sbCellPx, h); ctx.stroke();
  }
  for (var r2 = 0; r2 <= rows; r2++) {
    ctx.beginPath(); ctx.moveTo(0, r2*sbCellPx); ctx.lineTo(w, r2*sbCellPx); ctx.stroke();
  }

  // 3. Cells
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var val = (sc.grid[r] && sc.grid[r][c]) || 0;
      var x = c * sbCellPx; var y = r * sbCellPx;
      if (val === 1) {
        ctx.fillStyle = '#c8a96e';
        ctx.fillRect(x + 1, y + 1, sbCellPx - 1, sbCellPx - 1);
      }
    }
  }

  // 4. Border
  ctx.strokeStyle = '#00A0E3';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w-2, h-2);

  // 5. Rulers — unobtrusive tick marks around the edge if enabled
  if (document.getElementById('sbRulersToggle') && document.getElementById('sbRulersToggle').checked) {
    ctx.strokeStyle = 'rgba(80,120,180,0.5)';
    ctx.lineWidth = 1;
    var tickLen = Math.max(4, sbCellPx * 0.15);
    for (var tc = 0; tc <= cols; tc++) {
      var tx = tc * sbCellPx;
      // top ticks
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, tickLen); ctx.stroke();
      // bottom ticks
      ctx.beginPath(); ctx.moveTo(tx, h); ctx.lineTo(tx, h - tickLen); ctx.stroke();
    }
    for (var tr = 0; tr <= rows; tr++) {
      var ty = tr * sbCellPx;
      // left ticks
      ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(tickLen, ty); ctx.stroke();
      // right ticks
      ctx.beginPath(); ctx.moveTo(w, ty); ctx.lineTo(w - tickLen, ty); ctx.stroke();
    }
  }

  // Roamer start indicator — R3 ellipse body (heading 0°, pointing up)
  var pxHoleX = (cols / 2) * sbCellPx;
  var pxHoleY = (rows / 2) * sbCellPx;
  var r  = sbCellPx * 0.5;   // half major axis
  var ry = r * 0.81;         // half minor axis
  ctx.save();
  ctx.translate(pxHoleX, pxHoleY);
  // Body ellipse (major axis vertical = heading up)
  ctx.beginPath();
  ctx.ellipse(0, 0, ry, r, 0, 0, Math.PI * 2);
  ctx.fillStyle   = '#CCD4D9';
  ctx.strokeStyle = '#7ab8d4';
  ctx.lineWidth   = 1.5;
  ctx.fill();
  ctx.stroke();
  // Spigot
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  ctx.fillStyle   = '#bdd8e8';
  ctx.strokeStyle = '#7ab8d4';
  ctx.lineWidth   = 0.8;
  ctx.fill();
  ctx.stroke();
  // Keypad recess
  var kh = r * 0.37, kw = ry * 0.457, kr = 1;  // essentially square corners
  ctx.beginPath();
  ctx.roundRect(-kw, -kh, kw * 2, kh * 2, kr);
  ctx.fillStyle   = '#a8c8dc';
  ctx.strokeStyle = '#7ab8d4';
  ctx.lineWidth   = 0.8;
  ctx.fill();
  ctx.stroke();
  // Forward direction triangle — always visible, at centre, points up (heading 0)
  var tS = Math.max(1.5, r * 0.10);
  ctx.beginPath();
  ctx.moveTo(0, -tS * 1.8);
  ctx.lineTo(-tS * 0.7, tS * 0.5);
  ctx.lineTo( tS * 0.7, tS * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#E86F61';
  ctx.fill();
  ctx.restore();
}

// ── Clear all ─────────────────────────────────
function sbClearAll() {
  if (!confirm('Clear all cells in this set?')) return;
  var sc = sbCurrentScene();
  if (!sc) return;
  var rows = sbGetRows(); var cols = sbGetCols();
  sc.grid = [];
  for (var r = 0; r < rows; r++) {
    sc.grid[r] = [];
    for (var c = 0; c < cols; c++) sc.grid[r][c] = 0;
  }
  sbRedraw();
}

// ── Floating dialogue drag ────────────────────
(function() {
  var dlg, hdr, ox = 0, oy = 0, dragging = false;
  document.addEventListener('DOMContentLoaded', function() {
    dlg = document.getElementById('sbDialogue');
    hdr = document.getElementById('sbDlgHeader');
    if (!hdr) return;
    hdr.addEventListener('mousedown', function(ev) {
      dragging = true;
      var rect = dlg.getBoundingClientRect();
      ox = ev.clientX - rect.left; oy = ev.clientY - rect.top;
      ev.preventDefault();
    });
    document.addEventListener('mousemove', function(ev) {
      if (!dragging) return;
      var dlgW = dlg.offsetWidth;
      var dlgH = dlg.offsetHeight;
      var newLeft = ev.clientX - ox;
      var newTop  = ev.clientY - oy;
      // Clamp to viewport
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - dlgW));
      newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - dlgH));
      dlg.style.left  = newLeft + 'px';
      dlg.style.top   = newTop  + 'px';
      dlg.style.right = 'auto';
    });
    document.addEventListener('mouseup', function() { dragging = false; });
  });
})();

function sbToggleDialogue() {
  document.getElementById('sbDialogue').classList.toggle('open');
}

function sbUpdateSceneName(val) {
  var sc = sbCurrentScene();
  if (sc) { sc.name = val; sbRenderSceneList(); }
}

window.addEventListener('resize', function() {
  if (document.getElementById('sceneBuilderOverlay').classList.contains('active')) {
    var sc = sbCurrentScene();
    if (sc) sbEnsureGrid(sc);
    sbRedraw();
  }
});

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  sbScenes.push(sbMakeScene('Set 1'));
  sbRenderSceneList();
});

