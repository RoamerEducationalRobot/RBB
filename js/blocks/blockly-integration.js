// blockly-integration.js — Workspace init, procedure sync, flyout behaviour
// Phase 2: extracted from index_integrate_275.html
'use strict';
// ── Workspaces ────────────────────────────────
// Custom renderer — subclasses Zelos, reduces vertical padding to match Scratch block height
(function() {
  try {
    var ZelosRenderer   = Blockly.zelos.Renderer;
    var ZelosConstants  = Blockly.zelos.ConstantProvider;

    // Subclass the constants
    function RbbConstants() { ZelosConstants.call(this); }
    RbbConstants.prototype = Object.create(ZelosConstants.prototype);
    RbbConstants.prototype.constructor = RbbConstants;
    RbbConstants.prototype.init = function() {
      ZelosConstants.prototype.init.call(this);
      // Reduce vertical padding — these control height above/below block content
      this.MEDIUM_PADDING      = 3;   // vertical padding inside block (was ~8)
      this.SMALL_PADDING       = 2;
      this.LARGE_PADDING       = 5;
      this.CORNER_RADIUS       = 4;
      this.MIN_BLOCK_HEIGHT    = 24;  // minimum block height (was ~40)
      this.EDITABLE_FIELD_PADDING = 3;
    };

    // Subclass the renderer
    function RbbRenderer(name) { ZelosRenderer.call(this, name); }
    RbbRenderer.prototype = Object.create(ZelosRenderer.prototype);
    RbbRenderer.prototype.constructor = RbbRenderer;
    RbbRenderer.prototype.makeConstants_ = function() {
      return new RbbConstants();
    };

    Blockly.blockRendering.register('rbb', RbbRenderer);
  } catch(e) {
    console.warn('RBB renderer registration failed, falling back to zelos:', e);
  }
})();

var zoomOpts = { controls:false, startScale:0.6, maxScale:3, minScale:0.3, scaleSpeed:1.1, pinch:true };
var rbbTheme = Blockly.Theme.defineTheme('rbbTheme', {
  'base': Blockly.Themes.Classic,
  'componentStyles': {
    'workspaceBackgroundColour':'#ffffff',
    'toolboxBackgroundColour':'#1E2E53',
    'toolboxForegroundColour':'#ffffff',
    'flyoutBackgroundColour':'#2a3f6f',
    'flyoutForegroundColour':'#ffffff',
    'flyoutOpacity':1
  },
  'fontStyle':{'family':'Arial,sans-serif','weight':'bold','size':10}
});

var rbbRenderer = (function() {
  try { Blockly.blockRendering.getRenderer('rbb'); return 'rbb'; } catch(e) { return 'zelos'; }
})();

var wsGO = Blockly.inject('blocklyGO', {
  media:'./media/', toolbox:document.getElementById('toolboxGO'),
  zoom:zoomOpts, trashcan:false, theme:rbbTheme, renderer:rbbRenderer,
  move:{scrollbars:true,drag:true,wheel:true}
});
var wsProc = Blockly.inject('blocklyProc', {
  media:'./media/', toolbox:document.getElementById('toolboxProc'),
  zoom:zoomOpts, trashcan:false, theme:rbbTheme, renderer:rbbRenderer,
  move:{scrollbars:true,drag:true,wheel:true}
});

// Renderer constants not patchable post-injection in Blockly 10.4 — zoom + field sizing handles proportions.

try {
  Blockly.ContextMenuRegistry.registry.unregister('blockComment');
  Blockly.ContextMenuRegistry.registry.unregister('blockCollapseExpand');
  Blockly.ContextMenuRegistry.registry.unregister('blockDisable');
} catch(ex) {}
Blockly.Msg['DELETE_BLOCK']    = 'CE — Clear Entry';
Blockly.Msg['DELETE_X_BLOCKS'] = 'CE — Clear %1 Entries';

// ── Field colour fix — MutationObserver ───────
// Blockly recreates field SVG elements dynamically.
// A MutationObserver catches every addition and recolours immediately.
var RBB_FIELD_HEIGHT = RBB_ICON_SIZE;
function applyFieldColours(root) {
  root.querySelectorAll('.blocklyEditableText').forEach(function(g) {
    var rect = g.querySelector('rect');
    if (!rect) return;
    rect.setAttribute('fill', '#FFFF00');
    rect.setAttribute('stroke', '#888');
    rect.setAttribute('rx', '0');
    rect.setAttribute('ry', '0');
  });
}
function watchFields(ws) {
  var svg = ws.getParentSvg();
  applyFieldColours(svg);
  var obs = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(n) {
        if (n.nodeType === 1) {
          if (n.classList && n.classList.contains('blocklyEditableText')) {
            var rect = n.querySelector('rect');
            if (rect) { rect.setAttribute('fill','#FFFF00'); rect.setAttribute('stroke','#888'); }
          }
          applyFieldColours(n);
        }
      });
    });
  });
  obs.observe(svg, { childList: true, subtree: true });
}
setTimeout(function() { watchFields(wsGO); watchFields(wsProc); }, 500);
setTimeout(rwInitGOClick, 600);

// ── Procedure name/number sync ────────────────
var procDict = {}; // num → name
var procSyncTimer = null;

function procDictUpdate(num, name) {
  if (!num) return;
  if (name && name !== 'Name') procDict[num] = name;
  else delete procDict[num];
}
function procDictGetNum(name) {
  for (var n in procDict) { if (procDict[n] === name) return parseInt(n); }
  return null;
}

function procSyncAll() {
  // Sync call blocks in wsGO from dict
  wsGO.getAllBlocks(false).forEach(function(b) {
    if (b.type !== 'block_call_proc') return;
    var num = parseInt(b.getFieldValue('value1')) || 0;
    if (procDict[num]) b.setFieldValue(procDict[num], 'procname');
  });
  // Sync proc_def blocks in wsProc from dict
  wsProc.getAllBlocks(false).forEach(function(b) {
    if (b.type !== 'block_proc_def') return;
    var num = parseInt(b.getFieldValue('value1')) || 0;
    if (procDict[num]) b.setFieldValue(procDict[num], 'value2');
  });
}

function procScheduleSync() {
  if (procSyncTimer) clearTimeout(procSyncTimer);
  procSyncTimer = setTimeout(function() {
    // Rebuild dict from wsProc definitions (authoritative)
    var newDict = {};
    wsProc.getAllBlocks(false).forEach(function(b) {
      if (b.type !== 'block_proc_def') return;
      var num  = parseInt(b.getFieldValue('value1')) || 0;
      var name = (b.getFieldValue('value2') || '').trim();
      if (num && name && name !== 'Name') newDict[num] = name;
    });
    // Also pick up names from GO call blocks if not already in dict
    wsGO.getAllBlocks(false).forEach(function(b) {
      if (b.type !== 'block_call_proc') return;
      var num  = parseInt(b.getFieldValue('value1')) || 0;
      var name = (b.getFieldValue('procname') || '').trim();
      if (num && name && name !== 'Name' && !newDict[num]) newDict[num] = name;
    });
    procDict = newDict;
    procSyncAll();
  }, 800); // wait 800ms after last change before syncing
}

wsProc.addChangeListener(function(e) {
  if (e.type === Blockly.Events.BLOCK_CHANGE || 
      e.type === Blockly.Events.BLOCK_CREATE ||
      e.type === Blockly.Events.BLOCK_DELETE) procScheduleSync();
});
wsGO.addChangeListener(function(e) {
  if (e.type === Blockly.Events.BLOCK_CHANGE ||
      e.type === Blockly.Events.BLOCK_CREATE ||
      e.type === Blockly.Events.BLOCK_DELETE) procScheduleSync();
});

// ── Flyout stay-open ──────────────────────────
function patchFlyout(ws) {
  setTimeout(function() {
    var tb = ws.getToolbox();
    if (tb && tb.getFlyout()) tb.getFlyout().autoClose = false;
  }, 300);
}
patchFlyout(wsGO);
patchFlyout(wsProc);

