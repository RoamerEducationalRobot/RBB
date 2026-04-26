// main.js — Application startup
// Phase 2: extracted from index_integrate_275.html
'use strict';

// ── RoamerWorld init ──────────────────────────────
// ── Init ──────────────────────────────────────
rwFitCanvas();
// Show standard set banner if no sets defined yet




// ── Scene builder init ────────────────────────────
// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  sbScenes.push(sbMakeScene('Set 1'));
  sbRenderSceneList();
});

