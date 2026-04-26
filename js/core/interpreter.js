// interpreter.js — RSL generation and GO block execution bridge
// Phase 2: extracted from index_integrate_275.html
'use strict';
function rwGetRSL() {
  Blockly.JavaScript.INFINITE_LOOP_TRAP = null;

  // Compile procedure definitions from wsProc
  rw.procDefs = {};
  var topProc = wsProc.getTopBlocks(true);
  topProc.forEach(function(b) {
    if (b.type !== 'block_proc_def') return;
    var num   = parseInt(b.getFieldValue('value1')) || 0;
    var name  = b.getFieldValue('value2') || '';
    var inner = Blockly.JavaScript.statementToCode(b,'DO');
    rw.procDefs[num] = { name: name, rsl: inner };
  });

  // Find GO program stack containing block_go
  var topBlocks = wsGO.getTopBlocks(true);
  for (var i = 0; i < topBlocks.length; i++) {
    var b = topBlocks[i];
    var hasGo = false;
    var scan = b;
    while (scan) {
      if (scan.type === 'block_go') { hasGo = true; break; }
      scan = scan.getNextBlock();
    }
    if (!hasGo) continue;
    var rsl = '';
    var cur = b;
    while (cur) {
      var gen = Blockly.JavaScript[cur.type];
      if (gen) rsl += gen.call(cur, cur);
      cur = cur.getNextBlock();
    }
    return rsl;
  }
  return '';
}

// ── GO block click detection ──────────────────
function rwRegisterGOClick() {
  wsGO.getAllBlocks(false).forEach(function(block) {
    if (block.type !== 'block_go') return;
    if (block._goClickRegistered) return;
    block._goClickRegistered = true;
    var svg = block.getSvgRoot ? block.getSvgRoot() : null;
    if (!svg) return;

    var lastFire = 0;
    function fireGO() {
      if (rw.running) return;
      var now = Date.now();
      if (now - lastFire < 500) return; // guard against double-fire
      lastFire = now;
      if (document.getElementById('panel-rw').classList.contains('active')) {
        rwGO();
      } else {
        rwLaunchFromGO();
      }
    }

    // Register in both capture and bubble phases for click and mouseup
    svg.addEventListener('click',   fireGO, true);
    svg.addEventListener('click',   fireGO, false);
    svg.addEventListener('mouseup', fireGO, true);
    svg.addEventListener('mouseup', fireGO, false);
  });
}

// Re-register whenever workspace changes (blocks added/removed)
// Called after wsGO is initialised
function rwInitGOClick() {
  wsGO.addChangeListener(function(ev) {
    if (ev.type === Blockly.Events.BLOCK_CREATE ||
        ev.type === Blockly.Events.FINISHED_LOADING ||
        ev.type === 'create' || ev.type === 'finished_loading') {
      setTimeout(rwRegisterGOClick, 50);
    }
  });
  setTimeout(rwRegisterGOClick, 500); // initial registration
}

// ── Sidebar ───────────────────────────────────

function generateScripts() {
  var errors = rwValidateProcs();
  rwShowValidationErrors(errors);
  Blockly.JavaScript.INFINITE_LOOP_TRAP = null;
  var rslProc = Blockly.JavaScript.workspaceToCode(wsProc);
  var rslGO   = Blockly.JavaScript.workspaceToCode(wsGO);
  document.getElementById('rslArea').value     = rslGO;
  document.getElementById('rslProcArea').value = rslProc;
  document.getElementById('jsonArea').value    = rslToJson(rslGO, rslProc);
}
function rslToJson(go, proc) {
  function parse(text) {
    var cmds = [];
    text.split('\r\n').forEach(function(line) {
      line = line.trim();
      if (!line || line.startsWith(';')) return;
      var p = line.split(',');
      var obj = { token: p[0].trim() };
      for (var i = 1; i < p.length; i++) if (p[i].trim()) obj['p'+i] = p[i].trim();
      cmds.push(obj);
    });
    return cmds;
  }
  return JSON.stringify({ behaviour:'Integrate', version:'1.0',
    go_program:parse(go), procedures:parse(proc) }, null, 2);
}

