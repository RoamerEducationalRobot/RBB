// layout.js — Sidebar, tab switching, file operations, workspace management
// Phase 2: extracted from index_integrate_275.html
'use strict';
function buildSidebar(cats, ws) {
  var sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  cats.forEach(function(cat) {
    var btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat.label;
    btn.style.backgroundColor = cat.btnColour || cat.colour;
    btn.addEventListener('click', function() {
      sb.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var toolbox = ws.getToolbox();
      if (toolbox) {
        var items = toolbox.getToolboxItems();
        for (var i = 0; i < items.length; i++) {
          if (items[i].getName && items[i].getName() === cat.cat) {
            toolbox.selectItemByPosition(i); break;
          }
        }
      }
    });
    sb.appendChild(btn);
  });
}

// ── Tab switching ─────────────────────────────
function showTab(name, btn) {
  // If leaving RoamerWorld while paused — reset run state so GO works on return
  var rwWasActive = document.getElementById('panel-rw').classList.contains('active');
  if (rwWasActive && name !== 'rw' && rw.running && rw.paused) {
    rw.stopFlag = true; rw.running = false; rw.paused = false;
    rw.stepMode = false; rw.stepsAllowed = 0;
    rwSetCmd('— (reset after leaving while paused)');
  }
  document.querySelectorAll('.tabPanel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tabBtn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('panel-' + name).classList.add('active');
  btn.classList.add('active');
  var sidebar  = document.getElementById('sidebar');
  var mgmt     = document.getElementById('mgmtIcons');
  var modeBar  = document.getElementById('modeBar');
  if (name === 'go') {
    sidebar.style.display  = 'flex'; mgmt.style.display = 'flex';
    modeBar.style.display  = 'flex';
    buildSidebar(CATS_GO, wsGO);
    setTimeout(function() { Blockly.svgResize(wsGO); patchFlyout(wsGO); }, 10);
  } else if (name === 'proc') {
    sidebar.style.display  = 'flex'; mgmt.style.display = 'flex';
    modeBar.style.display  = 'flex';
    buildSidebar(CATS_PROC, wsProc);
    setTimeout(function() { Blockly.svgResize(wsProc); patchFlyout(wsProc); }, 10);
  } else {
    sidebar.style.display  = 'none'; mgmt.style.display = 'none';
    modeBar.style.display  = 'none';
    if (name === 'scripts')  generateScripts();
    if (name === 'rw')       rwOnShow();
    if (name === 'settings') {
      // Always show background panel when switching to Settings
      var bgBtn = document.querySelector('.settings-nav-btn[onclick*="background"]');
      if (bgBtn) showSettingsPanel('background', bgBtn);
    }
  }
}

buildSidebar(CATS_GO, wsGO);


// ── File operations ───────────────────────────
function fileNew() {
  if (confirm('Clear both workspaces?')) { wsGO.clear(); wsProc.clear(); }
}

function fileSave() {
  // Save disabled in this version
}
function fileLoad() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = function(ev) {
    var r = new FileReader();
    r.onload = function(e2) {
      try {
        var st = JSON.parse(e2.target.result);
        if (st.go)   Blockly.serialization.workspaces.load(st.go,   wsGO);
        if (st.proc) Blockly.serialization.workspaces.load(st.proc, wsProc);
      } catch(ex) { alert('Could not load: ' + ex.message); }
    };
    r.readAsText(ev.target.files[0]);
  };
  inp.click();
}
function copyText(id) {
  navigator.clipboard.writeText(document.getElementById(id).value).then(function() {
    var m = document.getElementById('copyMsg');
    m.style.display = 'inline';
    setTimeout(function() { m.style.display = 'none'; }, 1500);
  });
}

// ── Workspace management ──────────────────────
function currentWs() {
  return document.getElementById('panel-proc').classList.contains('active') ? wsProc : wsGO;
}
function centreWorkspace() { currentWs().scrollCenter(); }
function zoomIn()          { currentWs().zoomCenter(1); }
function zoomOut()         { currentWs().zoomCenter(-1); }
function clearWorkspace() {
  var ws = currentWs();
  var label = ws === wsProc ? 'Procedures' : 'GO Program';
  if (!confirm('Clear ' + label + '?')) return;
  ws.clear();
  if (ws === wsGO) {
    if (confirm('Clear RoamerWorld too?\n\nOK = Clear\nCancel = Keep')) {
      rw.stamps = [];
  rw.props  = [];
      if (rwOffCtx) rwOffCtx.clearRect(0, 0, rwOff.width, rwOff.height);
      rw.stopFlag = true; rw.running = false; rw.paused = false;
      rw.stepMode = false; rw.stepsAllowed = 0;
      rw.x = rw.startX; rw.y = rw.startY; rw.heading = rw.startHeading;
      rw.penDown = false; rw.speed = 5;
      if (typeof rwRender === 'function') rwRender();
      rwSetCmd('—');
    }
  }
}

window.addEventListener('resize', function() {
  Blockly.svgResize(wsGO); Blockly.svgResize(wsProc);
  rwFitCanvas();
});
setTimeout(function() { Blockly.svgResize(wsGO); }, 50);

// ══════════════════════════════════════════════
// ROAMERWORLD ENGINE
// ══════════════════════════════════════════════

