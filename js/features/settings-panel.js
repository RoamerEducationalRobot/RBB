// settings-panel.js — Settings panel, world type, background, start pos, stamps, props, prop designer
// Phase 2: extracted from index_integrate_275.html
'use strict';
// ── Setup sidebar flyout ──────────────────────
function rwShowPanel(name, btn) {
  // Toggle — clicking active category closes the flyout
  var flyout = document.getElementById('rwFlyout');
  var wasActive = btn.classList.contains('active');
  document.querySelectorAll('.rw-cat-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.rw-flyout-panel').forEach(function(p) { p.style.display = 'none'; });
  if (wasActive) {
    flyout.classList.remove('open');
  } else {
    btn.classList.add('active');
    var panel = document.getElementById('rwPanel-' + name);
    if (panel) panel.style.display = 'block';
    flyout.classList.add('open');
  }
  setTimeout(rwFitCanvas, 30);
}

// ── World type ────────────────────────────────
function rwApplyWorldType() {
  var type = document.getElementById('rwWorldType') ?
    document.getElementById('rwWorldType').value : 'stepmat';
  if (type === 'stepmat') {
    rwApplySize(5, 5);
  } else if (type === 'bigcountry') {
    rwApplySize(20, 20);
  } else {
    rwApplySize();
  }
}

// ── Roamer scale ──────────────────────────────
function rwGetRoamerRadius() {
  return Math.max(4, rw.pxPerUnit * 0.5);
}

var rwRunMode = false;
function rwToggleRunMode() {
  rwRunMode = !rwRunMode;
  document.body.classList.toggle('rw-runmode', rwRunMode);
  setTimeout(rwFitCanvas, 50);
}

// Escape key exits run mode
document.addEventListener('keydown', function(ev) {
  if (ev.key === 'Escape' && rwRunMode) rwToggleRunMode();
});

function openLogo() {
  window.open('index_logo.html', '_blank');
}

// ── Background ────────────────────────────────
function rwLoadBg() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = function(ev) {
    var r = new FileReader();
    r.onload = function(e2) {
      var img = new Image();
      img.onload = function() { rw.bgImage = img; rwRender(); };
      img.src = e2.target.result;
    };
    r.readAsDataURL(ev.target.files[0]);
  };
  inp.click();
}
function rwClearBg() { rw.bgImage = null; rwRender(); }

// ── Start position ────────────────────────────
function rwSetStart() {
  // Legacy — now handled by confirmPosHeading()
  rw.startX = rw.startX || 0;
  rw.startY = rw.startY || 0;
  rw.startHeading = rw.startHeading || 0;
  rw.penColor     = document.getElementById('rwPenCol').value;
  rw.penWidth     = parseInt(document.getElementById('rwPenW').value) || 2;
  rw.x = rw.startX; rw.y = rw.startY; rw.heading = rw.startHeading;
  rwRender();
}

// ── Stamps & Text ─────────────────────────────
function rwPlaceStamp() {
  rwSetCmd('Click canvas to place stamp');
  rwCanvas.style.cursor = 'crosshair';
  rwCanvas.onclick = function(ev) {
    var rect = rwCanvas.getBoundingClientRect();
    var ux = (ev.clientX - rect.left  - rwCanvas.width/2)  / rw.pxPerUnit;
    var uy = (rwCanvas.height/2 - (ev.clientY - rect.top)) / rw.pxPerUnit;
    var lbl = prompt('Object label (emoji or text):', '★');
    if (lbl) { rw.stamps.push({ x:ux, y:uy, text:lbl, color:'#333' }); rwRender(); }
    rwCanvas.onclick = null;
    rwCanvas.style.cursor = 'default';
    rwSetCmd('—');
  };
}
function rwPlaceText() {
  rwSetCmd('Click canvas to place text');
  rwCanvas.style.cursor = 'text';
  rwCanvas.onclick = function(ev) {
    var rect = rwCanvas.getBoundingClientRect();
    var ux = (ev.clientX - rect.left  - rwCanvas.width/2)  / rw.pxPerUnit;
    var uy = (rwCanvas.height/2 - (ev.clientY - rect.top)) / rw.pxPerUnit;
    var txt = prompt('Enter text:');
    if (txt) { rw.stamps.push({ x:ux, y:uy, text:txt, color:'#1E2E53' }); rwRender(); }
    rwCanvas.onclick = null;
    rwCanvas.style.cursor = 'default';
    rwSetCmd('—');
  };
}
function rwClearStamps() { rw.stamps = rw.stamps.filter(function(s) { return s.isText; }); rwRender(); }
function rwClearText()   { rw.stamps = rw.stamps.filter(function(s) { return !s.isText; }); rwRender(); }

// ── Drag Roamer to reposition ─────────────────
(function() {
  var dragging = false, dragOffX, dragOffY;
  rwCanvas.addEventListener('mousedown', function(ev) {
    if (rw.running) return;
    var rect = rwCanvas.getBoundingClientRect();
    var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    var rx = rwCX(rw.x), ry = rwCY(rw.y);
    var dist = Math.sqrt((mx-rx)*(mx-rx) + (my-ry)*(my-ry));
    if (dist < rw.pxPerUnit * 0.5) {
      dragging = true;
      dragOffX = mx - rx; dragOffY = my - ry;
      rwCanvas.style.cursor = 'grabbing';
      ev.preventDefault();
    }
  });
  window.addEventListener('mousemove', function(ev) {
    if (!dragging) return;
    var rect = rwCanvas.getBoundingClientRect();
    var mx = ev.clientX - rect.left - dragOffX;
    var my = ev.clientY - rect.top  - dragOffY;
    rw.x =  (mx - rwCanvas.width/2)  / rw.pxPerUnit;
    rw.y = -(my - rwCanvas.height/2) / rw.pxPerUnit;
    rwRender();
  });
  window.addEventListener('mouseup', function() {
    if (dragging) {
      dragging = false;
      rwCanvas.style.cursor = 'default';
      // Update start position summary in Settings → Roamer panel
      var summary = document.getElementById('rwStartSummary');
      if (summary) {
        summary.innerHTML = 'X: ' + rw.x.toFixed(1) + ' &nbsp; Y: ' + rw.y.toFixed(1) +
          ' &nbsp; Heading: ' + Math.round(rw.startHeading || 0) + '&#176;';
      }
    }
  });
})();

// ── Prop drag, select and delete ─────────────────────────────────────────────
(function() {
  var selectedPropIdx = -1;
  var draggingProp    = false;
  var propDragOffX    = 0, propDragOffY = 0;

  function getPropAtCanvas(mx, my) {
    if (!rw.props || rw.props.length === 0) return -1;
    var size = rw.pxPerUnit * 0.9;
    for (var i = rw.props.length - 1; i >= 0; i--) {
      var px = rwCX(rw.props[i].x);
      var py = rwCY(rw.props[i].y);
      if (mx >= px - size/2 && mx <= px + size/2 &&
          my >= py - size/2 && my <= py + size/2) return i;
    }
    return -1;
  }

  rwCanvas.addEventListener('mousedown', function(ev) {
    if (rw.running) return;
    if (rwCanvas._propPlaceHandler) return; // placement mode active
    var rect = rwCanvas.getBoundingClientRect();
    var mx = ev.clientX - rect.left;
    var my = ev.clientY - rect.top;
    var idx = getPropAtCanvas(mx, my);
    if (idx >= 0) {
      selectedPropIdx = idx;
      draggingProp    = true;
      var prop = rw.props[idx];
      propDragOffX = mx - rwCX(prop.x);
      propDragOffY = my - rwCY(prop.y);
      rwCanvas.style.cursor = 'grabbing';
      ev.stopPropagation();
      ev.preventDefault();
    } else {
      selectedPropIdx = -1;
    }
    rwRender();
    // Draw selection highlight
    if (selectedPropIdx >= 0 && !draggingProp) {
      drawPropSelection(selectedPropIdx);
    }
  });

  window.addEventListener('mousemove', function(ev) {
    if (!draggingProp || selectedPropIdx < 0) return;
    var rect = rwCanvas.getBoundingClientRect();
    var mx   = ev.clientX - rect.left - propDragOffX;
    var my   = ev.clientY - rect.top  - propDragOffY;
    var ux   =  (mx - rwCanvas.width/2)  / rw.pxPerUnit;
    var uy   = -(my - rwCanvas.height/2) / rw.pxPerUnit;
    // Clamp to grid
    var hw = rw.wsW/2; var hh = rw.wsH/2;
    ux = Math.max(-hw, Math.min(hw, ux));
    uy = Math.max(-hh, Math.min(hh, uy));
    rw.props[selectedPropIdx].x = ux;
    rw.props[selectedPropIdx].y = uy;
    rwRender();
    drawPropSelection(selectedPropIdx);
  });

  window.addEventListener('mouseup', function() {
    if (draggingProp) {
      // Snap to grid on release
      var prop = rw.props[selectedPropIdx];
      if (prop) {
        prop.x = Math.round(prop.x);
        prop.y = Math.round(prop.y);
      }
      draggingProp = false;
      rwCanvas.style.cursor = 'default';
      rwRender();
      if (selectedPropIdx >= 0) drawPropSelection(selectedPropIdx);
      refreshSettingsPropList();
    }
  });

  // Delete selected prop with Delete or Backspace key
  window.addEventListener('keydown', function(ev) {
    if (selectedPropIdx < 0) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      // Only if not typing in an input
      if (document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA')) return;
      rw.props.splice(selectedPropIdx, 1);
      selectedPropIdx = -1;
      rwRender();
      refreshSettingsPropList();
      ev.preventDefault();
    }
  });

  function drawPropSelection(idx) {
    if (idx < 0 || idx >= rw.props.length) return;
    var prop = rw.props[idx];
    var px   = rwCX(prop.x);
    var py   = rwCY(prop.y);
    var size = rw.pxPerUnit * 0.9;
    rwCtx.save();
    rwCtx.strokeStyle = '#00A0E3';
    rwCtx.lineWidth   = 2;
    rwCtx.setLineDash([4, 3]);
    rwCtx.strokeRect(px - size/2 - 3, py - size/2 - 3, size + 6, size + 6);
    // Delete hint
    rwCtx.setLineDash([]);
    rwCtx.fillStyle = 'rgba(0,160,227,0.85)';
    rwCtx.fillRect(px + size/2 - 10, py - size/2 - 10, 20, 16);
    rwCtx.fillStyle = '#fff';
    rwCtx.font = 'bold 10px Arial';
    rwCtx.textAlign = 'center';
    rwCtx.textBaseline = 'middle';
    rwCtx.fillText('✕', px + size/2, py - size/2 - 2);
    rwCtx.restore();
  }

  // Click the ✕ badge to delete
  rwCanvas.addEventListener('click', function(ev) {
    if (selectedPropIdx < 0) return;
    var rect = rwCanvas.getBoundingClientRect();
    var mx   = ev.clientX - rect.left;
    var my   = ev.clientY - rect.top;
    var prop = rw.props[selectedPropIdx];
    if (!prop) return;
    var px   = rwCX(prop.x);
    var py   = rwCY(prop.y);
    var size = rw.pxPerUnit * 0.9;
    // Check if click is on ✕ badge
    if (mx >= px + size/2 - 10 && mx <= px + size/2 + 10 &&
        my >= py - size/2 - 10 && my <= py - size/2 + 6) {
      rw.props.splice(selectedPropIdx, 1);
      selectedPropIdx = -1;
      rwRender();
      refreshSettingsPropList();
    }
  });
})();


// ── Extended prop definitions with categories ────────────────────────────────
var BUILTIN_PROPS = [
  // Deep Sea
  { id:'vent',    name:'Hydrothermal Vent', emoji:'🌋', svgRef:'prop-vent',
    viewBox:'0 0 100 95', category:'deepsea' },
  { id:'wreck',   name:'Shipwreck',         emoji:'⚓', svgRef:'prop-wreck',
    viewBox:'0 0 100 80', category:'deepsea' },
  { id:'clam',    name:'Giant Clam',        emoji:'🐚', svgRef:'prop-clam',
    viewBox:'0 0 100 95', category:'deepsea' },
  { id:'chest',   name:'Treasure Chest',   emoji:'💰', svgRef:'prop-chest',
    viewBox:'0 0 100 100', category:'deepsea' },
  // RoamerWorld City
  { id:'homes-house',    name:"Homes' House",      emoji:'🏠', svgRef:'prop-homes-house',
    viewBox:'0 0 100 100', category:'city' },
  { id:'dipstick-house', name:"Dipstick's House",  emoji:'🔬', svgRef:'prop-dipstick-house',
    viewBox:'0 0 100 100', category:'city' },
  { id:'warehouse',      name:'Nut & Bolt Warehouse', emoji:'🔩', svgRef:'prop-warehouse',
    viewBox:'0 0 100 100', category:'city' },
  { id:'scrapyard',      name:"Junky's Scrapyard", emoji:'⚙️', svgRef:'prop-scrapyard',
    viewBox:'0 0 100 100', category:'city' },
  { id:'rustys-cafe',    name:"Rusty's Cafe",      emoji:'☕', svgRef:'prop-rustys-cafe',
    viewBox:'0 0 100 100', category:'city' },
  { id:'playground',     name:'Playground',        emoji:'🛝', svgRef:'prop-playground',
    viewBox:'0 0 100 100', category:'city' },
];

var savedProps    = [];
var activePropCat = 'builtin';
if (!rw.props) rw.props = [];

// ── Render props on canvas ───────────────────────────────────────────────────
function rwDrawProps() {
  rw.props.forEach(function(prop) {
    var px   = rwCX(prop.x);
    var py   = rwCY(prop.y);
    var size = rw.pxPerUnit * 0.9;
    if (prop._img && prop._img.complete && prop._img.naturalWidth > 0) {
      rwCtx.drawImage(prop._img, px - size/2, py - size/2, size, size);
      return;
    }
    if (!prop._img) {
      var svgContent = getPropSVGString(prop);
      if (svgContent) {
        var img  = new Image();
        var svgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
                     prop.viewBox + '">' + svgContent + '</svg>';
        var blob = new Blob([svgStr], {type:'image/svg+xml'});
        img.onload = function() { prop._img = img; rwRender(); };
        img.src    = URL.createObjectURL(blob);
        prop._img  = img;
      } else {
        rwCtx.save();
        rwCtx.font = 'bold ' + Math.round(size*0.45) + 'px Arial';
        rwCtx.textAlign    = 'center';
        rwCtx.textBaseline = 'middle';
        rwCtx.fillText(prop.emoji || '?', px, py);
        rwCtx.restore();
      }
    }
  });
}

function getPropSVGString(prop) {
  if (prop.svgRef) {
    var el = document.getElementById(prop.svgRef);
    if (el) return el.outerHTML;
  }
  if (prop.svgContent) return prop.svgContent;
  return null;
}

// ── Place a prop on canvas ───────────────────────────────────────────────────
function rwStartPlaceProp(propDef) {
  var snap = true;
  rwSetCmd('Click canvas to place: ' + propDef.name);
  document.getElementById('rwCanvas').style.cursor = 'crosshair';
  // Show placement hint
  var hint = document.createElement('div');
  hint.id  = 'propPlaceHint';
  hint.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
    'background:rgba(0,160,227,0.9);color:#fff;padding:8px 20px;border-radius:20px;' +
    'font-family:Arial;font-size:13px;font-weight:bold;z-index:9999;pointer-events:none;';
  hint.textContent = '📍 Click on the canvas to place: ' + propDef.name;
  document.body.appendChild(hint);

  function handler(ev) {
    var canvas = document.getElementById('rwCanvas');
    var rect   = canvas.getBoundingClientRect();
    var ux = (ev.clientX - rect.left  - canvas.width/2)  / rw.pxPerUnit;
    var uy = (canvas.height/2 - (ev.clientY - rect.top)) / rw.pxPerUnit;
    if (snap) { ux = Math.round(ux); uy = Math.round(uy); }
    // Clamp to grid bounds
    var hw = rw.wsW / 2; var hh = rw.wsH / 2;
    ux = Math.max(-hw, Math.min(hw, ux));
    uy = Math.max(-hh, Math.min(hh, uy));
    rw.props.push({
      id:         propDef.id + '_' + Date.now(),
      name:       propDef.name,
      emoji:      propDef.emoji || '?',
      svgRef:     propDef.svgRef  || null,
      svgContent: propDef.svgContent || null,
      viewBox:    propDef.viewBox || '0 0 100 100',
      x: ux, y: uy, _img: null
    });
    rwRender();
    refreshSettingsPropList();
    canvas.removeEventListener('click', handler);
    canvas.style.cursor = 'default';
    var h = document.getElementById('propPlaceHint');
    if (h) h.remove();
    rwSetCmd('—');
  }
  document.getElementById('rwCanvas').addEventListener('click', handler);
}

function rwClearProps() {
  if (!rw.props || rw.props.length === 0) return;
  if (confirm('Clear all props from the canvas?')) {
    rw.props = [];
    rwRender();
    refreshSettingsPropList();
  }
}

// ── Settings prop list ───────────────────────────────────────────────────────
function refreshSettingsPropList() {
  var container = document.getElementById('settingsPropList');
  if (!container) return;
  container.innerHTML = '';
  var all = BUILTIN_PROPS.concat(savedProps);
  if (all.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:#888;">Open Prop Designer to create props.</div>';
    return;
  }
  all.forEach(function(pd) {
    var placed = rw.props.filter(function(p){ return p.svgRef===pd.svgRef; }).length;
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;' +
      'background:#f0f4ff;border-radius:4px;border:1px solid #c8d4f0;margin-bottom:3px;';
    row.innerHTML =
      '<span style="font-size:16px;">' + (pd.emoji||'?') + '</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:11px;font-weight:bold;color:#1E2E53;white-space:nowrap;' +
             'overflow:hidden;text-overflow:ellipsis;">' + pd.name + '</div>' +
        (placed>0 ? '<div style="font-size:10px;color:#888;">on canvas: '+placed+'</div>' : '') +
      '</div>' +
      '<button style="background:#00A0E3;color:#fff;border:none;border-radius:3px;' +
              'padding:2px 8px;font-size:10px;cursor:pointer;white-space:nowrap;">Place</button>';
    row.querySelector('button').onclick = function(e) {
      e.stopPropagation();
      var rwBtn = document.getElementById('rwTabBtn');
      if (rwBtn) showTab('rw', rwBtn);
      rwStartPlaceProp(pd);
    };
    container.appendChild(row);
  });
}

// ── Prop Designer ────────────────────────────────────────────────────────────
function openPropDesigner() {
  var overlay = document.getElementById('propDesignerOverlay');
  if (!overlay) { alert('Prop Designer not available.'); return; }
  overlay.style.display = 'flex';
  populatePropDesignerLibrary();
  refreshPlaceButtons();
  propSetStatus('Ready — draw your prop, then click Save to Library');
}

function propDesignerClose() {
  var overlay = document.getElementById('propDesignerOverlay');
  if (overlay) overlay.style.display = 'none';
}

function propSetStatus(msg) {
  var el = document.getElementById('propStatusMsg');
  if (el) el.textContent = msg;
}

function propDesignerResize() {
  var sel  = document.getElementById('propSizeSelect');
  var lbl  = document.getElementById('propCanvasLabel');
  var size = parseInt(sel.value) || 2;
  if (lbl) lbl.textContent = size + ' × ' + size + ' cell' + (size>1?'s':'');
  propSetStatus('Canvas resized to ' + size + ' × ' + size + ' cells');
}

function propDesignerSave() {
  var name = (document.getElementById('propNameInput').value || '').trim();
  if (!name) {
    alert('Please give your prop a name first.');
    document.getElementById('propNameInput').focus();
    return;
  }
  try {
    var iframe = document.getElementById('propSvgEdit');
    var svgDoc = iframe.contentDocument || iframe.contentWindow.document;
    var svgEl  = svgDoc.querySelector('#svgroot') || svgDoc.querySelector('svg');
    if (!svgEl) { alert('Nothing drawn yet.'); return; }
    var content = svgEl.innerHTML;
    var vb      = svgEl.getAttribute('viewBox') || '0 0 100 100';
    var id      = 'custom_' + Date.now();
    savedProps.push({
      id: id, name: name, emoji: '🎨',
      svgRef: null, svgContent: content,
      viewBox: vb, category: 'saved'
    });
    document.getElementById('propNameInput').value = '';
    populatePropDesignerLibrary();
    refreshSettingsPropList();
    refreshPlaceButtons();
    propSetStatus('✓ Saved: "' + name + '" — now in My Props library');
    showPropCategory('saved');
  } catch(e) {
    alert('Could not read from editor. This may be a cross-origin restriction. Try opening from a local server.');
    propSetStatus('⚠ Save failed — cross-origin restriction');
  }
}

function showPropCategory(cat) {
  activePropCat = cat;
  var builtin = document.getElementById('propLibBuiltin');
  var saved   = document.getElementById('propLibSaved');
  var btnB    = document.getElementById('propCatBuiltin');
  var btnS    = document.getElementById('propCatSaved');
  if (cat === 'builtin') {
    if (builtin) builtin.style.display = 'block';
    if (saved)   saved.style.display   = 'none';
    if (btnB) { btnB.style.background='#2a4080'; btnB.style.color='#fff';
                btnB.style.borderBottom='2px solid #00A0E3'; }
    if (btnS) { btnS.style.background='#1E2E53'; btnS.style.color='#aac4ff';
                btnS.style.borderBottom='none'; }
  } else {
    if (builtin) builtin.style.display = 'none';
    if (saved)   saved.style.display   = 'block';
    if (btnS) { btnS.style.background='#2a4080'; btnS.style.color='#fff';
                btnS.style.borderBottom='2px solid #00A0E3'; }
    if (btnB) { btnB.style.background='#1E2E53'; btnB.style.color='#aac4ff';
                btnB.style.borderBottom='none'; }
    // Show empty state if needed
    var empty = document.getElementById('propSavedEmpty');
    var grid  = document.getElementById('propGridSaved');
    if (savedProps.length === 0) {
      if (empty) empty.style.display = 'block';
      if (grid)  grid.style.display  = 'none';
    } else {
      if (empty) empty.style.display = 'none';
      if (grid)  grid.style.display  = 'grid';
    }
  }
}

function populatePropDesignerLibrary() {
  // Deep sea grid
  var dsg  = document.getElementById('propGridBuiltin');
  var ctg  = document.getElementById('propGridCity');
  var savG = document.getElementById('propGridSaved');
  if (dsg) {
    dsg.innerHTML = '';
    BUILTIN_PROPS.filter(function(p){ return p.category==='deepsea'; })
      .forEach(function(pd){ dsg.appendChild(makePropThumb(pd, true)); });
  }
  if (ctg) {
    ctg.innerHTML = '';
    BUILTIN_PROPS.filter(function(p){ return p.category==='city'; })
      .forEach(function(pd){ ctg.appendChild(makePropThumb(pd, true)); });
  }
  if (savG) {
    savG.innerHTML = '';
    savedProps.forEach(function(pd){ savG.appendChild(makePropThumb(pd, true)); });
  }
  // Templates bar
  var tplBar = document.getElementById('propTemplates');
  if (tplBar) {
    tplBar.innerHTML = '';
    var templates = [
      { label:'Blank',    id:null },
      { label:'House',    id:'prop-homes-house' },
      { label:'Building', id:'prop-warehouse' },
    ];
    templates.forEach(function(t) {
      var btn = document.createElement('button');
      btn.style.cssText = 'padding:3px 10px;background:#2a4080;color:#aac4ff;border:none;' +
        'border-radius:3px;font-size:10px;cursor:pointer;';
      btn.textContent = t.label;
      btn.onclick = function() {
        if (!t.id) { propSetStatus('Blank canvas selected'); return; }
        propSetStatus('Template "'+t.label+'" loaded — modify as needed');
      };
      tplBar.appendChild(btn);
    });
  }
}

function makePropThumb(pd, clickToLoad) {
  var div = document.createElement('div');
  div.style.cssText = 'background:#0d1b35;border:1px solid #2a4080;border-radius:4px;' +
    'padding:4px;text-align:center;cursor:pointer;display:flex;' +
    'flex-direction:column;align-items:center;gap:2px;' +
    'transition:border-color 0.15s;';
  div.title = pd.name;
  div.onmouseover = function(){ this.style.borderColor='#00A0E3'; };
  div.onmouseout  = function(){ this.style.borderColor='#2a4080'; };
  div.innerHTML =
    '<div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;">' +
      getPropThumbnailHTML(pd) +
    '</div>' +
    '<div style="font-size:8px;color:#aac4ff;line-height:1.2;max-width:60px;' +
         'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + pd.name + '</div>';
  if (clickToLoad) {
    div.onclick = function() {
      document.getElementById('propNameInput').value = pd.name;
      propSetStatus('"' + pd.name + '" loaded for editing');
    };
  } else {
    div.onclick = function() {
      propDesignerClose();
      var rwBtn = document.getElementById('rwTabBtn');
      if (rwBtn) showTab('rw', rwBtn);
      rwStartPlaceProp(pd);
    };
  }
  return div;
}

function getPropThumbnailHTML(pd) {
  var el = pd.svgRef ? document.getElementById(pd.svgRef) : null;
  if (el) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + pd.viewBox +
           '" width="50" height="50">' + el.outerHTML + '</svg>';
  }
  if (pd.svgContent) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + pd.viewBox +
           '" width="50" height="50">' + pd.svgContent + '</svg>';
  }
  return '<span style="font-size:26px;">' + (pd.emoji||'?') + '</span>';
}

function filterPropLibrary(query) {
  var q = query.toLowerCase();
  var all = document.querySelectorAll('#propGridBuiltin > div, #propGridCity > div');
  all.forEach(function(el) {
    var name = (el.title || '').toLowerCase();
    el.style.display = name.includes(q) ? '' : 'none';
  });
}

function refreshPlaceButtons() {
  var container = document.getElementById('propPlaceButtons');
  if (!container) return;
  container.innerHTML = '';
  var all = BUILTIN_PROPS.concat(savedProps);
  all.forEach(function(pd) {
    var btn = document.createElement('button');
    btn.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 8px;' +
      'background:#1a3060;color:#fff;border:1px solid #2a4080;border-radius:4px;' +
      'cursor:pointer;font-size:10px;width:100%;text-align:left;margin-bottom:2px;';
    btn.innerHTML = '<span>' + (pd.emoji||'?') + '</span><span style="overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap;">' + pd.name + '</span>';
    btn.onclick = function() {
      propDesignerClose();
      var rwBtn = document.getElementById('rwTabBtn');
      if (rwBtn) showTab('rw', rwBtn);
      rwStartPlaceProp(pd);
    };
    container.appendChild(btn);
  });
}

// ── Ocean floor background ──────────────────────────────────────────────────
function rwLoadDeepSeaBg() {
  var w = 800, h = 600;
  var svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '">',
    // Deep water gradient background
    '<defs>',
    '  <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">',
    '    <stop offset="0%"   stop-color="#001428"/>',
    '    <stop offset="60%"  stop-color="#002244"/>',
    '    <stop offset="100%" stop-color="#001020"/>',
    '  </linearGradient>',
    '  <radialGradient id="glow1" cx="30%" cy="40%" r="20%">',
    '    <stop offset="0%" stop-color="#004488" stop-opacity="0.4"/>',
    '    <stop offset="100%" stop-color="#001428" stop-opacity="0"/>',
    '  </radialGradient>',
    '  <radialGradient id="glow2" cx="70%" cy="60%" r="25%">',
    '    <stop offset="0%" stop-color="#003366" stop-opacity="0.3"/>',
    '    <stop offset="100%" stop-color="#001428" stop-opacity="0"/>',
    '  </radialGradient>',
    '</defs>',
    '<rect width="' + w + '" height="' + h + '" fill="url(#seaGrad)"/>',
    '<rect width="' + w + '" height="' + h + '" fill="url(#glow1)"/>',
    '<rect width="' + w + '" height="' + h + '" fill="url(#glow2)"/>',
    // Sea floor sediment layer
    '<ellipse cx="400" cy="610" rx="500" ry="80" fill="#1a1208" opacity="0.8"/>',
    // Rock formations
    '<polygon points="50,600 90,520 130,600"  fill="#1c1410" opacity="0.9"/>',
    '<polygon points="80,600 130,490 180,600" fill="#221810" opacity="0.9"/>',
    '<polygon points="600,600 660,510 720,600" fill="#1c1410" opacity="0.9"/>',
    '<polygon points="650,600 720,480 790,600" fill="#1c1410" opacity="0.9"/>',
    // Scattered rocks on floor
    '<ellipse cx="200" cy="590" rx="25" ry="12" fill="#2a2010" opacity="0.8"/>',
    '<ellipse cx="450" cy="595" rx="18" ry="9"  fill="#221810" opacity="0.8"/>',
    '<ellipse cx="550" cy="588" rx="30" ry="13" fill="#2a2010" opacity="0.8"/>',
    // Bioluminescent particles
    '<circle cx="120" cy="200" r="2" fill="#00ffaa" opacity="0.4"/>',
    '<circle cx="250" cy="150" r="1.5" fill="#00ddff" opacity="0.5"/>',
    '<circle cx="400" cy="280" r="2" fill="#00ffaa" opacity="0.3"/>',
    '<circle cx="550" cy="180" r="1.5" fill="#aaddff" opacity="0.4"/>',
    '<circle cx="680" cy="320" r="2" fill="#00ffaa" opacity="0.4"/>',
    '<circle cx="150" cy="400" r="1.5" fill="#00ddff" opacity="0.3"/>',
    '<circle cx="720" cy="150" r="2" fill="#00ffaa" opacity="0.5"/>',
    '<circle cx="350" cy="450" r="1.5" fill="#aaddff" opacity="0.3"/>',
    // Light rays from above
    '<polygon points="300,0 320,0 420,600 380,600" fill="#003366" opacity="0.08"/>',
    '<polygon points="500,0 510,0 560,600 540,600" fill="#003366" opacity="0.06"/>',
    '</svg>'
  ].join('\n');

  var img = new Image();
  var blob = new Blob([svg], {type: 'image/svg+xml'});
  img.onload = function() { rw.bgImage = img; rwRender(); };
  img.src = URL.createObjectURL(blob);
}


// Populate props list on load
refreshSettingsPropList();

// ── Settings nav glue ────────────────────────
function showSettingsPanel(name, btn) {
  document.querySelectorAll('.settings-nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.settings-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  var panel = document.getElementById('sp-' + name);
  if (panel) panel.classList.add('active');
}

function openPosHeadingFromNav(btn) {
  document.querySelectorAll('.settings-nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.settings-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('panel-settings').classList.remove('active');
  openPosHeadingDlg();
}

function applyMode(mode) {
  // Show Logo tab only in Logo mode
  document.getElementById('logoTab').style.display = (mode === 'logo') ? 'inline-block' : 'none';
  // Future: filter sidebar categories, adjust Controller style for Discover etc.
}

