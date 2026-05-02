// canvas-renderer.js — Canvas setup, render pipeline, Roamer drawing
// Phase 2: extracted from index_integrate_275.html
'use strict';
var rwCanvas  = document.getElementById('rwCanvas');
var rwCtx     = rwCanvas.getContext('2d');
var rwOff     = document.createElement('canvas'); // trail layer
var rwOffCtx  = rwOff.getContext('2d', {willReadFrequently: false});
var rwShowRulers = false;
var rwShowGrid   = true;
var rwControllerVisible = true;

// Physical speed constants
// Speed 5 = 25cm/sec linear, 90deg/sec rotation
var RW_BASE_CM_PER_SEC  = 25;
var RW_BASE_DEG_PER_SEC = 90;

// Roamer body geometry (in Roamer units, 1 unit = 200mm body length)
// Pen hole is the coordinate origin / turning pivot.
//   Front end : 138mm ahead of pen hole → +0.69 units along heading
//   Back end  : 62mm  behind pen hole   → -0.31 units along heading
// The shorter arm (back, 62mm) means the body centre is ahead of the pen hole.
var RW_PEN_HOLE_FRONT = 0.50;   // pen hole at geometric centre of body (R3 design)
var RW_PEN_HOLE_BACK  = 0.50;   // pen hole at geometric centre of body (R3 design)

// Roamer state
var rw = {
  x:0, y:0, heading:0,       // current position (units from centre) and heading (deg, 0=up)
  penDown:false,
  penColor:'#0000ff',
  penWidth:2,
  speed:5,
  linearUnit:20,              // cm per step (Sc FD)
  turnUnit:1,                 // degrees per step (Sc RT) - actually default is 1deg
  startX:0, startY:0, startHeading:0,
  wsW:10, wsH:10,             // workspace size in Roamer units (1 unit = 20cm)
  pxPerUnit:60,               // pixels per unit — recalculated to fit canvas wrap
  bgImage:null,
  charSvg:null,               // SVG string for character — null = use default triangle
  showPenHole:false,          // show pen hole marker when character image is active
  charRotation:0,             // extra rotation offset for character image (degrees)
  stamps:[],
  props:[],
  // Execution
  cmdQueue:[],                // flat list of {op, args} objects
  cmdIdx:0,
  running:false,
  paused:false,
  stepPending:false, stepMode:false, stepsAllowed:0, procDefs:{},
  stopFlag:false
};

// ── Set default character (Turtle) ──────────
function rwInitDefaultCharacter() {
  var lib = CD_LIBRARY && CD_LIBRARY.classic && CD_LIBRARY.classic[0];
  if (!lib) return;
  var img = new Image();
  img.onload = function() {
    rw._charImg    = img;
    rw.charImgSrc  = lib.img;
    rw.charImgName = lib.name;
    rw.charSvg     = null;
    rw.charRotation = 0;
    rwRender();
  };
  img.src = lib.img;
}

// ── Fit canvas to available space ────────────
function rwFitCanvas() {
  var wrap = document.getElementById('rwCanvasWrap');
  var stripH = rwControllerVisible ? 68 : 0;
  var setType = rw.setType || 'self-contained';
  var isContained = (setType === 'self-contained');

  // Total available space (controller sits absolutely over the bottom)
  var totalW = wrap.clientWidth;
  var totalH = wrap.clientHeight;
  if (totalW <= 0 || totalH <= 0) return;

  var newW, newH;
  if (isContained) {
    // Contained: grey surround, canvas centred, border, margin.
    // Add one extra cell of padding on each side so the Roamer body
    // remains fully visible even when the pen hole is at the outermost cell centre.
    wrap.style.paddingBottom  = stripH + 'px';
    wrap.style.background     = '#c8c8c8';
    wrap.style.alignItems     = 'center';
    wrap.style.justifyContent = 'center';
    rwCanvas.style.border     = '2px solid #aaa';
    rwCanvas.style.outline    = 'none';
    rwCanvas.style.marginBottom = '0';
    var availW = totalW - 20;
    var availH = totalH - stripH - 20;
    var pxW = Math.floor(availW / (rw.wsW + 2));
    var pxH = Math.floor(availH / (rw.wsH + 2));
    rw.pxPerUnit = Math.max(4, Math.min(pxW, pxH));
    newW = (rw.wsW + 2) * rw.pxPerUnit;
    newH = (rw.wsH + 2) * rw.pxPerUnit;
  } else {
    // Wrap/Connected: canvas fills every pixel, grid bleeds to all edges
    wrap.style.paddingBottom  = '0';
    wrap.style.background     = '#ffffff';
    wrap.style.alignItems     = 'flex-start';
    wrap.style.justifyContent = 'flex-start';
    rwCanvas.style.border  = 'none';
    rwCanvas.style.outline = 'none';
    newW = totalW;
    newH = totalH - stripH;
    // Derive pxPerUnit from stored cell size, recalc cell count to fill canvas
    rw.pxPerUnit = Math.max(4, rw.pxPerUnit || 60);
    rw.wsW = Math.max(1, Math.ceil(newW / rw.pxPerUnit));
    rw.wsH = Math.max(1, Math.ceil(newH / rw.pxPerUnit));
  }

  // Preserve trail by copying to a temp canvas before resize
  var tmp = document.createElement('canvas');
  tmp.width = rwOff.width; tmp.height = rwOff.height;
  tmp.getContext('2d').drawImage(rwOff, 0, 0);

  rwCanvas.width  = newW; rwCanvas.height = newH;
  rwOff.width     = newW; rwOff.height    = newH;

  // Restore trail scaled to new size
  if (tmp.width > 0 && tmp.height > 0) {
    rwOffCtx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, newW, newH);
  }
  rwRender();
}

function rwApplySize(w, h) {
  rw.wsW = w || rw.wsW || 10;
  rw.wsH = h || rw.wsH || 10;
  rwFitCanvas();
}

function rwOnShow() {
  // Auto-expand to full view the first time Roamer Graphics is shown
  if (!rwHasAutoExpanded) {
    rwHasAutoExpanded = true;
    rwFullscreenMode = false;
    rwToggleFullscreen();
    // Wait for fullscreen layout to settle before fitting
    setTimeout(function() { rwFitCanvas(); rwRender(); }, 200);
  } else {
    setTimeout(function() { rwFitCanvas(); rwRender(); }, 50);
  }
  ccInitClicker();
  ccShowRSG();
}

// ── Coordinate helpers ────────────────────────
function rwCX(ux) { return rwCanvas.width  / 2 + ux * rw.pxPerUnit; }
function rwCY(uy) { return rwCanvas.height / 2 - uy * rw.pxPerUnit; }

// ── Render ────────────────────────────────────
function rwRender() {
  var W = rwCanvas.width, H = rwCanvas.height;
  rwCtx.clearRect(0, 0, W, H);


  // Background
  if (rw.bgImage) {
    rwCtx.drawImage(rw.bgImage, 0, 0, W, H);
  } else {
    rwCtx.fillStyle = '#ffffff';
    rwCtx.fillRect(0, 0, W, H);
  }

  // ── Set boundary and grid ─────────────────────────────────────────
  var setType = rw.setType || 'self-contained';
  var halfW   = rw.wsW / 2;
  var halfH   = rw.wsH / 2;
  // Pixel coords of set corners (canvas origin = centre)
  var setLeft   = rwCX(-halfW);
  var setRight  = rwCX( halfW);
  var setTop    = rwCY( halfH);
  var setBottom = rwCY(-halfH);

  if (setType === 'wrap' || setType === 'connected') {
    // Wrap / Connected — no boundary, grid fills entire canvas edge to edge
    if (rwShowGrid) {
      rwCtx.strokeStyle = '#e0e0e0'; rwCtx.lineWidth = 0.5;
      var startX = setLeft % rw.pxPerUnit;
      for (var px = startX; px <= W; px += rw.pxPerUnit) {
        rwCtx.beginPath(); rwCtx.moveTo(px, 0); rwCtx.lineTo(px, H); rwCtx.stroke();
      }
      var startY = setTop % rw.pxPerUnit;
      for (var py = startY; py <= H; py += rw.pxPerUnit) {
        rwCtx.beginPath(); rwCtx.moveTo(0, py); rwCtx.lineTo(W, py); rwCtx.stroke();
      }
    }
  } else {
    // Self-contained — grid within set boundary, border drawn
    if (rwShowGrid) {
      rwCtx.strokeStyle = '#e0e0e0'; rwCtx.lineWidth = 0.5;
      for (var gx = 0; gx <= rw.wsW; gx++) {
        var px = setLeft + gx * rw.pxPerUnit;
        rwCtx.beginPath(); rwCtx.moveTo(px, setTop); rwCtx.lineTo(px, setBottom); rwCtx.stroke();
      }
      for (var gy = 0; gy <= rw.wsH; gy++) {
        var py = setTop + gy * rw.pxPerUnit;
        rwCtx.beginPath(); rwCtx.moveTo(setLeft, py); rwCtx.lineTo(setRight, py); rwCtx.stroke();
      }
    }
    // Boundary border
    rwCtx.strokeStyle = '#1E2E53'; rwCtx.lineWidth = 2;
    rwCtx.strokeRect(setLeft, setTop, setRight - setLeft, setBottom - setTop);
  }

  // Rulers — tick marks at unit intervals along set edges
  if (rwShowRulers) {
    rwCtx.strokeStyle = '#999'; rwCtx.lineWidth = 1;
    for (var i = 1; i < rw.wsW; i++) {
      var px = setLeft + i * rw.pxPerUnit;
      rwCtx.beginPath(); rwCtx.moveTo(px, setBottom); rwCtx.lineTo(px, setBottom - 6); rwCtx.stroke();
    }
    for (var j = 1; j < rw.wsH; j++) {
      var py = setTop + j * rw.pxPerUnit;
      rwCtx.beginPath(); rwCtx.moveTo(setLeft, py); rwCtx.lineTo(setLeft + 6, py); rwCtx.stroke();
    }
  }

  // Scene grid — marked cells from Set Builder (drawn below the trail)
  if (rw.sceneGrid && rw.sceneGrid.length > 0) {
    var sgRows = rw.sceneGrid.length;
    var sgCols = rw.sceneGrid[0] ? rw.sceneGrid[0].length : 0;
    if (sgCols > 0) {
      // Set Builder grid origin = top-left of the set boundary
      rwCtx.save();
      for (var sgr = 0; sgr < sgRows; sgr++) {
        for (var sgc = 0; sgc < sgCols; sgc++) {
          if (rw.sceneGrid[sgr][sgc] === 1) {
            // Grid origin aligned with set boundary (setLeft, setTop)
            var cgx = setLeft + sgc * rw.pxPerUnit;
            var cgy = setTop  + sgr * rw.pxPerUnit;
            rwCtx.fillStyle = 'rgba(200,169,110,0.55)';
            rwCtx.fillRect(cgx + 1, cgy + 1, rw.pxPerUnit - 1, rw.pxPerUnit - 1);
          }
        }
      }
      rwCtx.restore();
    }
  }

  // Trail
  rwCtx.drawImage(rwOff, 0, 0);

  // Stamps
  rw.stamps.forEach(function(st) {
    rwCtx.save();
    rwCtx.font = 'bold ' + Math.max(10, rw.pxPerUnit/4) + 'px Arial';
    rwCtx.fillStyle = st.color || '#1E2E53';
    rwCtx.textAlign = 'center';
    rwCtx.fillText(st.text, rwCX(st.x), rwCY(st.y));
    rwCtx.restore();
  });

  // Props
  rwDrawProps();
  // Roamer
  rwDrawRoamer();
}

function rwDrawRoamer() {
  // rw.x / rw.y are the PEN HOLE coordinates (pivot / coordinate origin).
  // R3 Roamer: pen hole is at the geometric centre of the body.
  //   Body ellipse: major axis 200mm (along heading), minor axis 162mm (across)
  //   Spigot: 120mm diameter circle, centred on body
  //   Keypad recess: 74x74mm rounded square, centred on body
  //   Pen hole: open circle at dead centre (0,0) in local coords

  var pxHoleX = rwCX(rw.x), pxHoleY = rwCY(rw.y);
  var r       = rwGetRoamerRadius();   // half major axis in px (0.5 units × pxPerUnit)
  var ry      = r * 0.81;             // half minor axis (162/200 = 0.81)
  var rad     = rw.heading * Math.PI / 180;

  rwCtx.save();
  rwCtx.translate(pxHoleX, pxHoleY);
  rwCtx.rotate(rad);
  // Local coords: -y = forward, +y = back, ±x = sides
  // Ellipse major axis = r (half 200mm) along y, minor = ry (half 162mm) along x

  if (rw._charImg) {
    // Character mode with image — fixed display size, anchored at pen hole
    // Top of image = heading 0 = forward. Image rotates with Roamer heading.
    rwCtx.restore();
    rwCtx.save();
    rwCtx.translate(pxHoleX, pxHoleY);
    rwCtx.rotate(rad);
    var CHAR_SIZE = 44; // fixed px — independent of grid scale
    var iw = rw._charImg.naturalWidth  || rw._charImg.width  || CHAR_SIZE;
    var ih = rw._charImg.naturalHeight || rw._charImg.height || CHAR_SIZE;
    // Fit within CHAR_SIZE preserving aspect ratio
    var scale = Math.min(CHAR_SIZE / iw, CHAR_SIZE / ih);
    var dw = iw * scale;
    var dh = ih * scale;
    // Anchor: pen hole at centre-bottom of image (top of image = forward)
    rwCtx.imageSmoothingEnabled = true;
    rwCtx.imageSmoothingQuality = 'high';
    rwCtx.globalCompositeOperation = 'source-over';
    // Apply orientation offset only — image top = forward by default
    rwCtx.rotate((rw.charRotation || 0) * Math.PI / 180);
    // Pen hole is 44.7% from top of image — offset so pen hole lands on anchor point
    rwCtx.drawImage(rw._charImg, -dw / 2, -dh * 0.69, dw, dh);
  } else {
    // Default R3 body — ellipse with spigot circle and keypad recess
    // All drawn in local rotated coords centred on pen hole (0,0)
    // Major axis r along y (heading), minor axis ry along x

    // Body ellipse
    rwCtx.beginPath();
    rwCtx.ellipse(0, 0, ry, r, 0, 0, Math.PI * 2);
    rwCtx.fillStyle   = '#E8DEB8';  // R3 cream
    rwCtx.strokeStyle = '#B8A878';  // darker cream edge
    rwCtx.lineWidth   = 1.5;
    rwCtx.fill();
    rwCtx.stroke();

    // Spigot circle (120/200 = 0.6 of major axis radius)
    var spigotR = r * 0.6;
    rwCtx.beginPath();
    rwCtx.arc(0, 0, spigotR, 0, Math.PI * 2);
    rwCtx.fillStyle   = '#D8CEA8';  // slightly darker cream for spigot
    rwCtx.strokeStyle = '#B8A878';  // darker cream edge
    rwCtx.lineWidth   = 1;
    rwCtx.fill();
    rwCtx.stroke();

    // Keypad bezel — green square
    var ks  = Math.min(r, ry) * 0.38;  // half-size of square keypad
    var ksi = ks * 0.79;               // white interior half-size
    // Keypad centred at body/spigot centre (0,0)
    rwCtx.beginPath();
    rwCtx.rect(-ks, -ks, ks * 2, ks * 2);
    rwCtx.fillStyle = '#3C8B6E'; rwCtx.fill();
    rwCtx.beginPath();
    rwCtx.rect(-ksi, -ksi, ksi * 2, ksi * 2);
    rwCtx.fillStyle = '#ffffff'; rwCtx.fill();
  }

  rwCtx.restore();

  // Eyes — VERTICAL ovals (taller than wide), black border, amber, pupil, white dot
  var eyeRx  = Math.max(2,   r * 0.09);  // horizontal radius (shorter)
  var eyeRy  = Math.max(2.5, r * 0.13);  // vertical radius (taller)
  var pupilR = Math.max(1,   r * 0.045);
  var eyeY   = -r * 0.72;
  var eyeX   = ry * 0.38;

  rwCtx.save();
  rwCtx.translate(pxHoleX, pxHoleY);
  rwCtx.rotate(rad);

  [-eyeX, eyeX].forEach(function(ex) {
    var hlx = ex + eyeRx * 0.35;
    var hly = eyeY - eyeRy * 0.40;
    // Black border (outer oval)
    rwCtx.beginPath();
    rwCtx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    rwCtx.fillStyle = '#1a1a1a'; rwCtx.fill();
    // Amber fill
    rwCtx.beginPath();
    rwCtx.ellipse(ex, eyeY, eyeRx * 0.80, eyeRy * 0.82, 0, 0, Math.PI * 2);
    rwCtx.fillStyle = '#E8B84B'; rwCtx.fill();
    // Pupil
    rwCtx.beginPath();
    rwCtx.arc(ex, eyeY, pupilR, 0, Math.PI * 2);
    rwCtx.fillStyle = '#1a1a1a'; rwCtx.fill();
    // White highlight dot
    rwCtx.beginPath();
    rwCtx.arc(hlx, hly, pupilR * 0.5, 0, Math.PI * 2);
    rwCtx.fillStyle = '#ffffff'; rwCtx.fill();
  });

  rwCtx.restore();
}

// ── RSL Compiler ─────────────────────────────
// Converts RSL text into a flat command queue with expanded repeats
