// control-console.js — Control Console UI, clicker audio, command display
// Phase 2: extracted from index_integrate_275.html
'use strict';
// ── Control Console ───────────────────────────────────────────────────────
// Sound engine
var ccAudioCtx = null;
var ccSoundOn  = (localStorage.getItem('ccClicker') !== 'off');

function ccToggleSound(on) {
  ccSoundOn = on;
  localStorage.setItem('ccClicker', on ? 'on' : 'off');
}

// Initialise clicker checkbox from saved preference
function ccInitClicker() {
  var chk = document.getElementById('ccClickerChk');
  if (chk) chk.checked = ccSoundOn;
}

function ccClick(freq, dur) {
  if (!ccSoundOn) return;
  try {
    if (!ccAudioCtx) ccAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var o = ccAudioCtx.createOscillator();
    var g = ccAudioCtx.createGain();
    o.connect(g); g.connect(ccAudioCtx.destination);
    o.type = 'square'; o.frequency.value = freq || 800;
    g.gain.setValueAtTime(0.07, ccAudioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ccAudioCtx.currentTime + (dur || 0.04));
    o.start(); o.stop(ccAudioCtx.currentTime + (dur || 0.04));
  } catch(e) {}
}

// Key image → RSL op mapping
var CC_KEYS = {
  FD:   { key: 'Forward',  cat: 'move',  hasVal: true  },
  BK:   { key: 'Backward', cat: 'move',  hasVal: true  },
  LT:   { key: 'Left',     cat: 'move',  hasVal: true  },
  RT:   { key: 'Right',    cat: 'move',  hasVal: true  },
  W:    { key: 'Wait',     cat: 'time',  hasVal: true  },
  PD:   { key: 'PenDown',  cat: 'pen',   hasVal: false },
  PU:   { key: 'PenUp',    cat: 'pen',   hasVal: false },
  SP:   { key: 'Speed',    cat: 'time',  hasVal: true  },
  SCFD: { key: 'Scale',    cat: 'move',  hasVal: true  },
  SCRT: { key: 'Scale',    cat: 'move',  hasVal: true  },
  D:    { key: 'Music',    cat: 'sound', hasVal: true  },
  '𝄞':    { key: 'Clef',     cat: 'sound', hasVal: true  },
  FX:   { key: 'Volume',   cat: 'sound', hasVal: true  },
  VOL:  { key: 'Volume',   cat: 'sound', hasVal: true  },
  STOP: { key: 'STOP',     cat: 'stop',  hasVal: false },
};

// Build a single yellow value box for a whole value (square corners)
function ccDigits(val) {
  if (val === '' || val === undefined || val === null) return '';
  return '<span class="slot-val-box">' + val + '</span>';
}

// Fill a single field with a command, or a text state (RSG/DONE)
function ccFillField(elId, cmd, role) {
  var el = document.getElementById(elId);
  if (!el) return;
  // Set role class
  el.className = 'exec-slot slot-' + role;
  el.removeAttribute('data-cat');

  if (!cmd) {
    // Empty field — no command
    el.innerHTML = '';
    return;
  }

  // String commands — READY/STEADY/GO/DONE/error states
  if (typeof cmd === 'string') {
    if (cmd === 'DONE') {
      el.innerHTML = '<span class="slot-done-txt">DONE \u2713</span>';
    } else if (role === 'error') {
      el.innerHTML = '<span class="slot-error-txt">\u26a0 ' + cmd + '</span>';
    } else {
      el.innerHTML = '<span class="slot-rsg">' + cmd + '</span>';
    }
    return;
  }

  // Real command object
  var op   = (cmd.op || '').toUpperCase();
  var info = CC_KEYS[op];
  var val  = (info && info.hasVal && cmd.args && cmd.args[0] !== undefined) ? cmd.args[0] : '';
  var html = '';

  if (info) {
    html += '<img class="slot-key" src="' + (RBB_KEYS[info.key] || './Keys/' + info.key + '.png') + '" alt="' + op + '">';
    el.setAttribute('data-cat', info.cat);
  } else {
    html += '<span style="font-family:Arial,sans-serif;font-size:8px;color:#4a6aaa;font-weight:bold">' + op + '</span>';
  }
  if (val !== '') html += ccDigits(val);
  el.innerHTML = html;
}

// Update context line above centre field
function ccSetContext(cmd) {
  var el = document.getElementById('ccContextLine');
  if (!el) return;
  if (!cmd || typeof cmd === 'string') { el.textContent = ''; return; }
  var parts = [];
  if (cmd.procCtx)   parts.push(cmd.procCtx);
  if (cmd.repeatCtx) parts.push('Repeat ' + cmd.repeatCtx.replace('/', ' of '));
  el.textContent = parts.join(' \u2192 ');
}

// Update all three fields from current queue position
function ccUpdateSlots() {
  var q = rw.cmdQueue;
  var i = rw.cmdIdx;
  var next = (i + 1 < q.length) ? q[i + 1] : null;
  var cur  = (i < q.length)     ? q[i]     : null;
  var done = (i > 0)            ? q[i - 1] : null;
  ccFillField('ccSlotNext', next, 'next');
  ccFillField('ccSlotCur',  cur,  'cur');
  ccFillField('ccSlotDone', done, 'done');
  ccSetContext(cur);
}

var ccDoneTimer = null;
// Show DONE DONE DONE, then revert to READY STEADY GO after 5s
function ccShowDone() {
  ccFillField('ccSlotNext', 'DONE', 'done');
  ccFillField('ccSlotCur',  'DONE', 'cur');
  ccFillField('ccSlotDone', 'DONE', 'done');
  ccSetContext(null);
  if (ccDoneTimer) clearTimeout(ccDoneTimer);
  ccDoneTimer = setTimeout(function() {
    ccShowRSG();
  }, 5000);
}

function ccShowError(msg) {
  // Display a clear error state in the control console
  var label = msg || 'ERROR';
  ccFillField('ccSlotNext', label,   'error');
  ccFillField('ccSlotCur',  label,   'error');
  ccFillField('ccSlotDone', label,   'error');
  ccSetContext(null);
  if (ccDoneTimer) clearTimeout(ccDoneTimer);
  ccDoneTimer = setTimeout(function() {
    ccShowRSG();
  }, 5000);
}

// Show READY STEADY GO idle state
function ccShowRSG() {
  ccFillField('ccSlotNext', 'READY',  'next');
  ccFillField('ccSlotCur',  'STEADY', 'cur');
  ccFillField('ccSlotDone', 'GO',     'done');
  ccSetContext(null);
}

// Clear fields (called on Reset)
function ccClearSlots() {
  ccShowRSG();
}

// ── Music playback — per R30016 spec (pending musical validation) ──────────
var CC_FREQ = {
  1: [0,65.41,69.30,73.42,77.78,82.41,87.31,92.50,98.00,103.83,110.00,116.54,123.47,130.81,0],
  2: [0,130.81,138.59,146.83,155.56,164.81,174.61,185.00,196.00,207.65,220.00,233.08,246.94,261.63,0],
  3: [0,261.63,277.18,293.66,311.13,329.63,349.23,369.99,392.00,415.30,440.00,466.16,493.88,523.25,0],
  4: [0,523.25,554.37,587.33,622.25,659.26,698.46,739.99,783.99,830.61,880.00,932.33,987.77,1046.50,0],
  5: [0,1046.50,1108.73,1174.66,1244.51,1318.51,1396.91,1479.98,1567.98,1661.22,1760.00,1864.66,1975.53,2093.00,0]
};
var CC_DURATIONS = [0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0];
var CC_TEMPOS    = [0, 240, 180, 120, 90, 60];
// Volume gain — scaled up from R30016 power percentages for Web Audio audibility
// At setting 5 (default, 60dB classroom) gain≈0.5; at 10 (maximum) gain=1.0
var CC_VOL_GAIN  = [0, 0.05, 0.10, 0.18, 0.28, 0.40, 0.55, 0.68, 0.80, 0.92, 1.00];

function ccPlayNote(pitch, duration) {
  var p    = parseInt(pitch)    || 1;
  var d    = parseInt(duration) || 4;
  var oct  = rw.musicOctave || 3;
  var freq = (CC_FREQ[oct] || CC_FREQ[3])[p] || 0;
  var bpm  = CC_TEMPOS[rw.musicTempo || 3] || 120;
  var beats = CC_DURATIONS[d] || 1.0;
  var ms   = (beats / bpm) * 60000;
  var gain = CC_VOL_GAIN[rw.musicVolume || 5] || 0.18;
  if (freq > 0 && ccSoundOn) {
    try {
      if (!ccAudioCtx) ccAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ccAudioCtx.createOscillator();
      var g = ccAudioCtx.createGain();
      o.connect(g); g.connect(ccAudioCtx.destination);
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, ccAudioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ccAudioCtx.currentTime + ms / 1000);
      o.start(); o.stop(ccAudioCtx.currentTime + ms / 1000);
    } catch(e) {}
  }
  return rwSleep(ms); // pitch 14 (rest) = freq 0, still waits
}

