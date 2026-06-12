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
// Blockly absorbs clicks on FieldImage elements so we can't attach to the
// block SVG directly. Instead we listen at the workspace level and check
// whether the click landed on the GO block.
function rwRegisterGOClick() {
  // No-op — registration now handled at workspace level in rwInitGOClick
}

var _goLastFire = 0;

function rwInitGOClick() {
  // Listen for clicks on the entire GO workspace SVG
  var wsGOSvg = wsGO.getInjectionDiv ? wsGO.getInjectionDiv() : null;
  if (!wsGOSvg) {
    // Fallback: find the blocklyDiv for the GO workspace
    wsGOSvg = document.getElementById('blocklyGO');
  }
  if (!wsGOSvg) return;

  wsGOSvg.addEventListener('click', function(ev) {
    if (rw.running) return;
    var now = Date.now();
    if (now - _goLastFire < 800) return;

    // Walk up from the click target to see if we hit a block_go SVG group
    var el = ev.target;
    var maxWalk = 12;
    while (el && maxWalk-- > 0) {
      // Blockly marks block SVG roots with data-id
      if (el.getAttribute && el.getAttribute('data-id')) {
        var block = wsGO.getBlockById(el.getAttribute('data-id'));
        if (block && block.type === 'block_go') {
          _goLastFire = now;
          if (document.getElementById('panel-rw').classList.contains('active')) {
            rwGO();
          } else {
            rwLaunchFromGO();
          }
          return;
        }
        break; // hit a non-GO block, stop
      }
      el = el.parentElement;
    }
  }, false);
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

