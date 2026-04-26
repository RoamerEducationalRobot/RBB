// pos-heading.js — Position & Heading dialogue
// Phase 2: extracted from index_integrate_275.html
'use strict';


// ── Set Position & Heading Dialogue ──────────────────────────────────────────

function openPosHeadingDlg() {
  document.getElementById('phX').value = (rw.startX || 0).toFixed(1);
  document.getElementById('phY').value = (rw.startY || 0).toFixed(1);
  var h = Math.round(rw.startHeading || 0);
  document.getElementById('phHRight').value = h;
  document.getElementById('phHLeft').value  = (360 - h) % 360;
  updatePosMarker();
  updateBoundaryReadouts();
  updateCompassNeedle();
  document.getElementById('posHeadingDlg').classList.add('active');
}

function closePosHeadingDlg() {
  document.getElementById('posHeadingDlg').classList.remove('active');
  document.getElementById('panel-settings').classList.add('active');
}

function updateBoundaryReadouts() {
  var halfW = (rw.wsW || 10) / 2;
  var halfH = (rw.wsH || 10) / 2;
  var x = parseFloat(document.getElementById('phX').value) || 0;
  var y = parseFloat(document.getElementById('phY').value) || 0;
  // Distance from current position to each edge (Turtle-origin, so distances can be asymmetric)
  document.getElementById('phXNeg').textContent = (-halfW - x).toFixed(1);
  document.getElementById('phXPos').textContent = ( halfW - x).toFixed(1);
  document.getElementById('phYPos').textContent = ( halfH - y).toFixed(1);
  document.getElementById('phYNeg').textContent = (-halfH - y).toFixed(1);
}

function updatePosMarker() {
  var marker = document.getElementById('posMarker');
  var x = parseFloat(document.getElementById('phX').value) || 0;
  var y = parseFloat(document.getElementById('phY').value) || 0;
  var halfW = (rw.wsW || 10) / 2;
  var halfH = (rw.wsH || 10) / 2;
  // Map pen hole world coords to % within posGrid (140px border-box, crosshair at 70px).
  // left/top % are relative to content area (138px after 1px border each side),
  // but crosshair lines are drawn at 70px from the outer (border-box) edge.
  // 70px from outer = 69px from inner content-box left → 69/138 * 100 = 50%.
  // (The 1px border is included in background-position reference for ::after with inset:0,
  //  but left/top % on child elements use the content box — they happen to coincide here.)
  var px = 50 + (x / halfW) * 50;
  var py = 50 - (y / halfH) * 50;
  px = Math.max(0, Math.min(100, px));
  py = Math.max(0, Math.min(100, py));
  marker.style.left = px + '%';
  marker.style.top  = py + '%';
  var h = parseFloat(document.getElementById('phHRight').value) || 0;
  marker.style.transform = 'translate(-50%, -58.33%) rotate(' + h + 'deg)';
}

function updateCompassNeedle() {
  var h = parseFloat(document.getElementById('phHRight').value) || 0;
  h = ((h % 360) + 360) % 360;
  document.getElementById('phHRight').value = Math.round(h);
  document.getElementById('phHLeft').value  = Math.round((360 - h) % 360);
  // Rotate the Roamer triangle inside the compass
  document.getElementById('compassRoamer').style.transform = 'rotate(' + h + 'deg)';
}

function posGridClick(ev) {
  var grid = document.getElementById('posGrid');
  var rect = grid.getBoundingClientRect();
  var px = (ev.clientX - rect.left) / rect.width;
  var py = (ev.clientY - rect.top)  / rect.height;
  var halfW = (rw.wsW || 10) / 2;
  var halfH = (rw.wsH || 10) / 2;
  var x = (px - 0.5) * 2 * halfW;
  var y = -(py - 0.5) * 2 * halfH;
  x = Math.max(-halfW, Math.min(halfW, parseFloat(x.toFixed(1))));
  y = Math.max(-halfH, Math.min(halfH, parseFloat(y.toFixed(1))));
  document.getElementById('phX').value = x.toFixed(1);
  document.getElementById('phY').value = y.toFixed(1);
  updatePosMarker();
  updateBoundaryReadouts();
}

function compassClick(ev) {
  var compass = document.getElementById('headingCompass');
  var rect = compass.getBoundingClientRect();
  var cx = rect.left + rect.width  / 2;
  var cy = rect.top  + rect.height / 2;
  var angle = Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  document.getElementById('phHRight').value = Math.round(angle);
  updateCompassNeedle();
}

function posInputChange()     { updatePosMarker(); updateBoundaryReadouts(); }
function headingInputChange() { updateCompassNeedle(); updatePosMarker(); }
function headingLeftChange()  {
  var d = parseFloat(document.getElementById('phHLeft').value) || 0;
  d = ((d % 360) + 360) % 360;
  document.getElementById('phHLeft').value  = Math.round(d);
  document.getElementById('phHRight').value = Math.round((360 - d) % 360);
  var h = parseFloat(document.getElementById('phHRight').value) || 0;
  document.getElementById('compassRoamer').style.transform = 'rotate(' + h + 'deg)';
  updatePosMarker();
}

function confirmPosHeading() {
  var x = parseFloat(document.getElementById('phX').value) || 0;
  var y = parseFloat(document.getElementById('phY').value) || 0;
  var h = parseFloat(document.getElementById('phHRight').value) || 0;
  rw.startX = x; rw.startY = y; rw.startHeading = h;
  rw.x = x; rw.y = y; rw.heading = h;
  document.getElementById('rwStartSummary').innerHTML =
    'X: ' + x.toFixed(1) + ' &nbsp; Y: ' + y.toFixed(1) +
    ' &nbsp; Heading: ' + Math.round(h) + '&#176;';
  rwRender();
  closePosHeadingDlg();
}

// Make dialogue draggable
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var dlg = document.getElementById('posHeadingDlg');
    var hdr = document.getElementById('phDlgHeader');
    if (!dlg || !hdr) return;
    var dragging = false, ox = 0, oy = 0;
    hdr.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      var r = dlg.getBoundingClientRect();
      dlg.style.left = r.left + 'px';
      dlg.style.top  = r.top  + 'px';
      dlg.style.transform = 'none';
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      var newLeft = Math.max(0, Math.min(e.clientX - ox, window.innerWidth  - dlg.offsetWidth));
      var newTop  = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - dlg.offsetHeight));
      dlg.style.left = newLeft + 'px';
      dlg.style.top  = newTop  + 'px';
    });
    document.addEventListener('mouseup', function() { dragging = false; });
  });
})();

