// roamer-engine.js — RSL Compiler, interpreter execution, and drive controls
// Phase 2: extracted from index_integrate_275.html (temporary globals in place)
'use strict';
function rwCompile(rslText) {
  var lines = rslText.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var tokens = [];
  lines.forEach(function(line) {
    if (!line || line.startsWith(';') || line.startsWith('NAME')) return;
    var parts = line.split(',').map(function(p) { return p.trim(); });
    if (parts[0]) tokens.push(parts);
  });
  // Expand repeats recursively
  return rwExpandTokens(tokens, 0, tokens.length);
}

function rwExpandTokens(tokens, start, end, callStack, procCtx) {
  callStack = callStack || [];
  var result = [];
  var i = start;
  while (i < end) {
    var t = tokens[i];
    if (t[0] === 'R') {
      var count = parseInt(t[1]) || 1;
      var depth = 0, rStart = -1, rEnd = -1;
      for (var j = i+1; j < end; j++) {
        if (tokens[j][0] === '[') { if (depth===0) rStart = j+1; depth++; }
        if (tokens[j][0] === ']') { depth--; if (depth===0) { rEnd = j; break; } }
      }
      if (rStart >= 0 && rEnd >= 0) {
        for (var rep = 0; rep < count; rep++) {
          var inner = rwExpandTokens(tokens, rStart, rEnd, callStack, procCtx);
          // tag each inner command with which repeat iteration it is
          inner.forEach(function(cmd) {
            cmd.repeatCtx = count > 1 ? (rep+1) + '/' + count : null;
          });
          result = result.concat(inner);
        }
        i = rEnd + 1; continue;
      }
    } else if (t[0] === 'P' && t[1] && !isNaN(parseInt(t[1]))) {
      var pNum = parseInt(t[1]);
      if (rw.procDefs[pNum] && callStack.indexOf(pNum) === -1) {
        var pRsl = rw.procDefs[pNum].rsl;
        var pName = rw.procDefs[pNum].name || ('P' + pNum);
        var pLines = pRsl.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
        var pTokens = [];
        pLines.forEach(function(line) {
          if (!line || line.startsWith(';')) return;
          var parts = line.split(',').map(function(p){ return p.trim(); });
          if (parts[0]) pTokens.push(parts);
        });
        var newStack = callStack.concat([pNum]);
        var expanded = rwExpandTokens(pTokens, 0, pTokens.length, newStack, pName);
        result = result.concat(expanded);
      } else if (callStack.indexOf(pNum) !== -1) {
        console.warn('RBB: recursive procedure call P' + pNum + ' ignored');
      }
      i++; continue;
    } else if (t[0] === '[' || t[0] === ']' || t[0] === 'GO') {
      i++; continue;
    } else {
      var cmd = { op: t[0], args: t.slice(1) };
      if (procCtx) cmd.procCtx = procCtx;
      result.push(cmd);
    }
    i++;
  }
  return result;
}

// ── Procedure validation ──────────────────────
// Count max nesting depth of repeat/proc blocks in a block tree
function rwMaxNestDepth(block, depth) {
  if (!block) return depth;
  var max = depth;
  // Walk all inputs on this block
  for (var i = 0; i < block.inputList.length; i++) {
    var conn = block.inputList[i].connection;
    if (!conn) continue;
    var child = conn.targetBlock();
    if (!child) continue;
    // Walk the sequence of blocks in this input
    var b = child;
    while (b) {
      var childDepth = depth;
      // These block types add one level of nesting
      if (b.type === 'block_repeat' || b.type === 'block_proc_def' || b.type === 'block_call_proc') {
        childDepth = depth + 1;
      }
      // Recurse into this block's own inputs (e.g. the DO statement inside a repeat)
      var d = rwMaxNestDepth(b, childDepth);
      if (d > max) max = d;
      b = b.getNextBlock();
    }
  }
  return max;
}

function rwValidateProcs() {
  var errors = [], warnings = [];
  var numsSeen = {}, namesSeen = {};

  // Get all proc_def blocks — use getTopBlocks to ensure workspace is walked correctly
  var procBlocks = [];
  wsProc.getTopBlocks(true).forEach(function(top) {
    var b = top;
    while (b) {
      if (b.type === 'block_proc_def') procBlocks.push(b);
      b = b.getNextBlock();
    }
  });


  procBlocks.forEach(function(b) {
    var num  = parseInt(b.getFieldValue('value1')) || 0;
    var name = (b.getFieldValue('value2') || '').trim();
    var label = 'P' + num + (name && name !== 'Name' ? ' (' + name + ')' : '');

    // Duplicate P number
    if (numsSeen[num] !== undefined) {
      errors.push('Duplicate procedure number: P' + num + ' is defined more than once.');
    } else { numsSeen[num] = num; }

    // Duplicate name
    if (name && name !== 'Name') {
      if (namesSeen[name] !== undefined) {
        errors.push('Duplicate name "' + name + '": already used by P' + namesSeen[name] + '.');
      } else { namesSeen[name] = num; }
    }

    // Recursion — check if body calls this procedure
    var inner = Blockly.JavaScript.statementToCode(b, 'DO');
    if (inner.indexOf('P,' + num) !== -1) {
      errors.push('Recursive call in ' + label +
        '. Not allowed unless this is a Sense Procedure.');
    }

    // Nesting depth — proc definition counts as depth 1, contents add to that
    var depth = rwMaxNestDepth(b, 1);
    if (depth > 9) {
      errors.push('Nesting too deep in ' + label + ' (' + depth +
        ' levels). Maximum is 10. Programs this deep could take days to run.');
    } else if (depth > 4) {
      warnings.push('Deep nesting in ' + label + ' (' + depth +
        ' levels). Maximum is 10. Be aware — deeply nested programs can take a very long time to run.');
    }
  });

  // Check GO program nesting depth
  wsGO.getTopBlocks(true).forEach(function(top) {
    var depth = rwMaxNestDepth(top, 0);
    if (depth > 9) {
      errors.push('GO program nesting too deep (' + depth +
        ' levels). Maximum is 10. Programs this deep could take days to run.');
    } else if (depth > 4) {
      warnings.push('GO program nesting is deep (' + depth +
        ' levels). Maximum is 10. Be aware — deeply nested programs can take a very long time to run.');
    }
  });

  return { errors: errors, warnings: warnings };
}

function rwShowValidationErrors(result) {
  // Accept either old array format or new {errors,warnings} format
  var errors   = result.errors   !== undefined ? result.errors   : result;
  var warnings = result.warnings !== undefined ? result.warnings : [];

  var existing = document.getElementById('rwValidationMsg');
  if (existing) existing.remove();
  if (!errors.length && !warnings.length) return true;

  var div = document.createElement('div');
  div.id = 'rwValidationMsg';
  var isErrorOnly = !warnings.length;
  div.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);' +
    'background:' + (errors.length ? '#c00' : '#c07000') + ';color:#fff;' +
    'padding:12px 20px;border-radius:6px;z-index:2000;' +
    'font-size:13px;max-width:480px;box-shadow:0 4px 12px rgba(0,0,0,0.4);';

  var html = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;"><div>';
  if (errors.length) {
    html += '<strong>⚠ Errors</strong><br>' +
      errors.map(function(e) { return '• ' + e; }).join('<br>');
  }
  if (warnings.length) {
    if (errors.length) html += '<br><br>';
    html += '<strong>⚠ Warnings</strong><br>' +
      warnings.map(function(w) { return '• ' + w; }).join('<br>');
  }
  html += '</div><button onclick="document.getElementById(\'rwValidationMsg\').remove()" ' +
    'style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;' +
    'line-height:1;padding:0;flex-shrink:0;">✕</button></div>';

  div.innerHTML = html;
  document.body.appendChild(div);
  // Return false only if there are hard errors — warnings allow execution to continue
  return errors.length === 0;
}
function rwSleep(ms) {
  return new Promise(function(res) { setTimeout(res, ms); });
}

function rwSetCmd(text) {
  // text kept for RSL log only — display is handled by ccUpdateSlots
  ccUpdateSlots();
}

// Wait for resume or step
async function rwWaitIfPaused() {
  while (rw.paused && !rw.stopFlag) {
    if (rw.stepPending) { rw.stepPending = false; return; }
    await rwSleep(30);
  }
}

async function rwAnimMove(units) {
  if (rw.stopFlag) return;   // guard — do not start if already stopped
  var totalCm     = units * rw.linearUnit;
  var speedFactor = rw.speed / 5;
  var cmPerSec    = RW_BASE_CM_PER_SEC * speedFactor;
  var durationMs  = Math.abs(totalCm) / cmPerSec * 1000;
  var FPS         = 60;
  var steps       = Math.max(1, Math.round(durationMs / (1000/FPS)));
  var dx = Math.sin(rw.heading * Math.PI / 180) * units / steps;
  var dy = Math.cos(rw.heading * Math.PI / 180) * units / steps;
  // Workspace bounds in units (origin = centre).
  // The pen hole clamps to the CENTRE of the outermost cell (inset 0.5 from edge).
  // The boundary warning fires only when the move would take the pen hole
  // PAST the set edge (wsW/2 or wsH/2), i.e. out of the last cell entirely.
  // This means FD N where N == half the grid width/height stops cleanly at the
  // last cell centre without a boundary warning; only FD N+1 triggers the stop.
  var clampMaxX =  rw.wsW / 2 - 0.5;
  var clampMinX = -rw.wsW / 2 + 0.5;
  var clampMaxY =  rw.wsH / 2 - 0.5;
  var clampMinY = -rw.wsH / 2 + 0.5;
  var edgeMaxX  =  rw.wsW / 2;
  var edgeMinX  = -rw.wsW / 2;
  var edgeMaxY  =  rw.wsH / 2;
  var edgeMinY  = -rw.wsH / 2;
  // Derive boundary mode from rw.setType (set by Set Builder)
  var setType67 = rw.setType || 'self-contained';

  for (var i = 0; i < steps; i++) {
    if (rw.stopFlag) return;
    while (rw.paused && !rw.stopFlag && !rw.stepPending) { await rwSleep(30); }
    if (rw.stopFlag) return;
    var nx = rw.x + dx;
    var ny = rw.y + dy;

    if (setType67 === 'self-contained') {
      // Stop at edge — if pen hole would exit the last cell, clamp to last
      // cell centre, play boundary message and halt.
      var hitBoundary = (nx > edgeMaxX || nx < edgeMinX || ny > edgeMaxY || ny < edgeMinY);
      nx = Math.max(clampMinX, Math.min(clampMaxX, nx));
      ny = Math.max(clampMinY, Math.min(clampMaxY, ny));
      if (hitBoundary) {
        rw.x = nx; rw.y = ny;
        rwRender();
        rwPlayBoundaryMessage();
        ccShowError('BOUNDARY');
        rw.stopFlag = true;
        return;
      }

    } else if (setType67 === 'wrap') {
      // Wrap — lift pen at boundary, reappear on opposite side
      var wrapped = false;
      if (nx > edgeMaxX) { nx = edgeMinX + (nx - edgeMaxX); wrapped = true; }
      if (nx < edgeMinX) { nx = edgeMaxX - (edgeMinX - nx); wrapped = true; }
      if (ny > edgeMaxY) { ny = edgeMinY + (ny - edgeMaxY); wrapped = true; }
      if (ny < edgeMinY) { ny = edgeMaxY - (edgeMinY - ny); wrapped = true; }
      if (wrapped && rw.penDown) {
        // Draw to edge, then lift, move to new position silently
        var x1 = rwCX(rw.x), y1 = rwCY(rw.y);
        rwOffCtx.beginPath(); rwOffCtx.moveTo(x1, y1);
        rwOffCtx.lineTo(rwCX(nx), rwCY(ny));
        rwOffCtx.strokeStyle = rw.penColor;
        rwOffCtx.lineWidth   = rw.penWidth;
        rwOffCtx.lineCap = 'round'; rwOffCtx.stroke();
        rw.x = nx; rw.y = ny;
        rwRender(); await rwSleep(1000/FPS); continue;
      }

    } else if (setType67 === 'connected') {
      // Wrap — trail connects across boundary
      if (nx > edgeMaxX) { nx = edgeMinX + (nx - edgeMaxX); }
      if (nx < edgeMinX) { nx = edgeMaxX - (edgeMinX - nx); }
      if (ny > edgeMaxY) { ny = edgeMinY + (ny - edgeMaxY); }
      if (ny < edgeMinY) { ny = edgeMaxY - (edgeMinY - ny); }
    }

    // Draw stroke
    if (rw.penDown) {
      var x1 = rwCX(rw.x), y1 = rwCY(rw.y);
      rw.x = nx; rw.y = ny;
      var x2 = rwCX(rw.x), y2 = rwCY(rw.y);
      rwOffCtx.beginPath();
      rwOffCtx.moveTo(x1, y1);
      rwOffCtx.lineTo(x2, y2);
      rwOffCtx.strokeStyle = rw.penColor;
      rwOffCtx.lineWidth   = rw.penWidth;
      rwOffCtx.lineCap = 'round'; rwOffCtx.stroke();
    } else {
      rw.x = nx; rw.y = ny;
    }
    rwRender();
    await rwSleep(1000/FPS);
  }
}

async function rwAnimTurn(degrees) {
  if (rw.stopFlag) return;   // guard — do not start if already stopped (e.g. boundary crash)
  var speedFactor = rw.speed / 5;
  var degPerSec   = RW_BASE_DEG_PER_SEC * speedFactor;
  var durationMs  = Math.abs(degrees) / degPerSec * 1000;
  var FPS         = 60;
  var steps       = Math.max(1, Math.round(durationMs / (1000/FPS)));
  var dh          = degrees / steps;
  for (var i = 0; i < steps; i++) {
    if (rw.stopFlag) return;
    // Pause mid-animation
    while (rw.paused && !rw.stopFlag && !rw.stepPending) {
      await rwSleep(30);
    }
    if (rw.stopFlag) return;
    rw.heading += dh;
    rwRender();
    await rwSleep(1000/FPS);
  }
}

// ── Execute command queue ─────────────────────
async function rwRunQueue() {
  rw.cmdIdx = 0;
  try {
    while (rw.cmdIdx < rw.cmdQueue.length) {
      if (rw.stopFlag) break;

      // Wait if paused — check stepPending to allow one command through
      if (rw.paused) {
        while (rw.paused && !rw.stopFlag && rw.stepsAllowed < 1) {
          await rwSleep(30);
        }
        if (rw.stopFlag) break;
        rw.stepsAllowed = Math.max(0, rw.stepsAllowed - 1);
      }

      var cmd = rw.cmdQueue[rw.cmdIdx];
      var op  = cmd.op.toUpperCase();
      var a   = cmd.args;

      if      (op === 'FD')   { rwSetCmd('FD '  + a[0]); await rwAnimMove( parseFloat(a[0]) || 1); }
      else if (op === 'BK')   { rwSetCmd('BK '  + a[0]); await rwAnimMove(-(parseFloat(a[0]) || 1)); }
      else if (op === 'LT')   { rwSetCmd('LT '  + a[0]); await rwAnimTurn(-(parseFloat(a[0]) || 90) * rw.turnUnit); }
      else if (op === 'RT')   { rwSetCmd('RT '  + a[0]); await rwAnimTurn( (parseFloat(a[0]) || 90) * rw.turnUnit); }
      else if (op === 'W')    { rwSetCmd('W '   + a[0]); await rwSleep((parseFloat(a[0]) || 1) * 1000); }
      else if (op === 'PD')   { rwSetCmd('PD');  rw.penDown = true; if (a[0]) rw.penColor = a[0]; if (a[1]) { var wScale = [0,0.08,0.2,0.4,0.6,0.825]; rw.penWidth = Math.max(1, Math.round((wScale[parseInt(a[1])] || 0.2) * rw.pxPerUnit)); } }
      else if (op === 'PU')   { rwSetCmd('PU');  rw.penDown = false; }
      else if (op === 'SP')   { rwSetCmd('SP '  + a[0]); rw.speed = parseFloat(a[0]) || 5; }
      else if (op === 'SCFD') { rwSetCmd('ScFD '+ a[0]); rw.linearUnit = parseFloat(a[0]) || 20; }
      else if (op === 'SCRT') { rwSetCmd('ScRT '+ a[0]); rw.turnUnit   = parseFloat(a[0]) || 1; }
      else if (op === 'D')    { rwSetCmd('d '   + a[0] + ' ' + a[1]);
                                ccPlayNote(a[1], a[0]);
                                await rwSleep((parseInt(a[0])||4) * 130); }
      else if (op === '𝄞')    { rwSetCmd('𝄞 ' + a[0] + ' ' + a[1]); /* tempo/octave — store for future */ }
      else if (op === 'FX')   { rwSetCmd('Fx '  + a[0]); ccClick(440 + (parseInt(a[0])||1) * 20, 0.3); }
      else if (op === 'VOL')  { rwSetCmd('Vol ' + a[0]); }
      else if (op === 'STOP') { rwSetCmd('STOP'); rw.stopFlag = true; break; }
      else                    { rwSetCmd(op); }

      rw.cmdIdx++;

      // If in step mode, re-pause after each command
      if (rw.stepMode && !rw.stopFlag) {
        rw.paused = true;
        rw.stepsAllowed = 0;
      }
    }
  } finally {
    rw.running  = false;
    rw.stepMode = false;
    rw.penDown  = false;  // Pen Up at end of program (default state)
    document.getElementById('ccGOBtn').classList.remove('rw-active');
    document.getElementById('ccPauseBtn').classList.remove('rw-active');
    if (!rw.stopFlag) ccShowDone();
  }
}

// ── Drive controls ────────────────────────────
async function rwGO() {
  if (rw.running) return;
  var errors = rwValidateProcs();
  if (!rwShowValidationErrors(errors)) return;
  var rsl = rwGetRSL();
  rw.cmdQueue = rwCompile(rsl);
  if (rw.cmdQueue.length === 0) { rwSetCmd('No program connected to GO block'); return; }
  // Switch to Roamer Graphics tab before running
  var rwTabBtn = document.getElementById('rwTabBtn');
  if (rwTabBtn) showTab('rw', rwTabBtn);
  rwFitCanvas();
  ccClick(880, 0.05);
  document.getElementById('ccGOBtn').classList.add('rw-active');
  rw.stopFlag = false; rw.paused = false; rw.stepMode = false;
  rw.stepsAllowed = 0; rw.running = true;
  rw.speed = 5; rw.penDown = false;  // Pen Up at start — PD block sets it down
  rwRunQueue();
}

function rwPause() {
  if (!rw.running) return;
  ccClick(660, 0.04);
  document.getElementById('ccPauseBtn').classList.add('rw-active');
  rw.paused = true; rw.stepsAllowed = 0;
  rwSetCmd('paused');
}

function rwResume() {
  if (!rw.running) return;
  ccClick(770, 0.04);
  document.getElementById('ccPauseBtn').classList.remove('rw-active');
  rw.paused = false; rw.stepMode = false; rw.stepsAllowed = 0;
}

function rwStep() {
  ccClick(990, 0.03);
  if (!rw.running) {
    var errors = rwValidateProcs();
    if (!rwShowValidationErrors(errors)) return;
    var rsl = rwGetRSL();
    rw.cmdQueue = rwCompile(rsl);
    if (rw.cmdQueue.length === 0) return;
    rw.stopFlag = false; rw.paused = false; rw.stepMode = true;
    rw.stepsAllowed = 1; rw.running = true;
    rw.speed = 5; rw.penDown = false;  // Pen Up at start — PD block sets it down
    rwRunQueue();
    return;
  }
  // Already running — allow one more command
  rw.stepsAllowed = 1;
  rw.paused = false;
}

function rwReset() {
  ccClick(440, 0.07);
  document.getElementById('ccGOBtn').classList.remove('rw-active');
  document.getElementById('ccPauseBtn').classList.remove('rw-active');
  rw.stopFlag = true;
  rw.running  = false;
  rw.paused   = false;
  rw.stepMode = false;
  rw.stepPending  = false;
  rw.stepsAllowed = 0;
  rw.x = rw.startX; rw.y = rw.startY; rw.heading = rw.startHeading;
  rw.penDown = false; rw.speed = 5;
  rwOffCtx.clearRect(0, 0, rwOff.width, rwOff.height);
  rwRender();
  ccClearSlots();
}

// ── Launch from GO block click ────────────────
async function rwLaunchFromGO() {
  var errors = rwValidateProcs();
  if (!rwShowValidationErrors(errors)) return;
  showTab('rw', document.getElementById('rwTabBtn'));
  await rwSleep(100);
  rwFitCanvas();
  var cd = document.getElementById('rwCountdown');
  for (var n = 3; n >= 1; n--) {
    cd.textContent = n; cd.style.opacity = '1';
    await rwSleep(800);
    cd.style.opacity = '0';
    await rwSleep(200);
  }
  rwGO();
}

// ── Strip toggle ──────────────────────────────
function rwToggleController() {
  rwControllerVisible = !rwControllerVisible;
  document.getElementById('rwController').style.display   = rwControllerVisible ? 'flex' : 'none';
  document.getElementById('rwControllerTab').style.display = rwControllerVisible ? 'none' : 'block';
  rwFitCanvas();
}

// ── Fullscreen / Maximised Workspace ──────────────────────────────────────
var rwFullscreenMode = false;
var rwHasAutoExpanded = false;

function rwToggleFullscreen() {
  rwFullscreenMode = !rwFullscreenMode;
  document.body.classList.toggle('rw-fullscreen', rwFullscreenMode);

  // Update button icon — always driven by rwFullscreenMode, never by browser API state
  var btn = document.getElementById('ccFullscreenBtn');
  if (btn) btn.title = rwFullscreenMode ? 'Collapse' : 'Expand';
  var expand  = document.getElementById('fsExpandIcon');
  var collapse = document.getElementById('fsCollapseIcon');
  if (expand)  expand.style.display  = rwFullscreenMode ? 'none'   : 'inline';
  if (collapse) collapse.style.display = rwFullscreenMode ? 'inline' : 'none';

  // Refit canvas after layout shift
  setTimeout(function() { rwFitCanvas && rwFitCanvas(); rwRender && rwRender(); }, 250);
}

// Note: browser fullscreen API removed — RBB uses CSS-only workspace maximise.
// Icon state is fully controlled by rwToggleFullscreen() and never drifts.

function rwToggleRulers() { rwShowRulers = !rwShowRulers; rwRender(); }
function rwToggleGrid()   { rwShowGrid = !rwShowGrid; rwRender();
  var chk = document.getElementById('ccGridChk');
  if (chk) chk.checked = rwShowGrid;
}
function rwToggleGridFromConsole(on) {
  rwShowGrid = on; rwRender();
}

// ── Boundary voice message ─────────────────────────────────────────────────
// Plays one of 3 random synthesised "can't go that far" tones using Web Audio.
// Placeholder until real Roamer voice files are available.
// Pattern: descending two-note phrase (like a negative/error sound on the keypad).
function rwPlayBoundaryMessage() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var variant = Math.floor(Math.random() * 3);
    // Three variants: each is a pair of tones with slightly different pitches/rhythm
    var sequences = [
      // Variant 0: descending minor third
      [{f:440, t:0,    d:0.18}, {f:370, t:0.20, d:0.25}],
      // Variant 1: short double blip downward
      [{f:500, t:0,    d:0.10}, {f:350, t:0.13, d:0.18}, {f:300, t:0.33, d:0.14}],
      // Variant 2: low falling tone
      [{f:380, t:0,    d:0.12}, {f:280, t:0.15, d:0.30}]
    ];
    var seq = sequences[variant];
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.connect(ctx.destination);
    seq.forEach(function(note) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, ctx.currentTime + note.t);
      // Slide frequency down slightly for a "negative" feel
      osc.frequency.linearRampToValueAtTime(note.f * 0.85, ctx.currentTime + note.t + note.d);
      osc.connect(gain);
      osc.start(ctx.currentTime + note.t);
      osc.stop(ctx.currentTime + note.t + note.d);
    });
    // Close context after sound completes
    setTimeout(function() { try { ctx.close(); } catch(e) {} }, 800);
  } catch(e) { /* Web Audio not available — silent */ }
}

