// state.js — Single Source of Truth
//
// All application state lives here. No module outside this file may write
// directly to appState. All mutations must go through dispatch().
//
// Phase 2 note: the legacy `rw` object (defined in canvas-renderer.js) still
//               holds live render state and is mutated directly by the engine
//               and renderer. That coupling will be removed in Phase 4 when rw
//               is absorbed into appState.
//
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Canonical application state (Phase 4 target)
// ─────────────────────────────────────────────────────────────────────────────
var appState = {
  roamer: {
    x: 0,            // current position in Roamer units
    y: 0,
    heading: 0,      // degrees, 0 = north (up)
  },
  program: {
    workspaceXml: '', // serialised Blockly workspace — source of truth for block layout
    blocks: [],       // compiled block list produced by interpreter
    isRunning: false,
    isPaused: false,
    currentStep: 0,
  },
  settings: {
    gridCols: 10,
    gridRows: 10,
    boundaryType: 'contained',  // 'contained' | 'wrap'
    pxPerUnit: 48,
    penDown: false,
    penColour: '#000000',
    penWidth: 1,
    speed: 5,
    scaleFD: 1,
    scaleRT: 1,
  },
  character: {
    mode: 'default',  // 'default' | 'custom'
    svgString: '',
    rotation: 0,
    penHoleVisible: true,
  },
  ui: {
    activeTab: 'rw',
    activeSidebarCat: null,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// dispatch — the ONLY way to mutate appState
//
// All new code must use dispatch(). Direct writes to appState from outside
// this file are forbidden by design (Phase 4 will enforce this structurally).
// ─────────────────────────────────────────────────────────────────────────────
function dispatch(action) {
  switch (action.type) {

    case 'MOVE':
      appState.roamer.x += action.dx || 0;
      appState.roamer.y += action.dy || 0;
      break;

    case 'SET_POSITION':
      appState.roamer.x = action.x;
      appState.roamer.y = action.y;
      break;

    case 'SET_HEADING':
      appState.roamer.heading = ((action.heading % 360) + 360) % 360;
      break;

    case 'SET_RUNNING':
      appState.program.isRunning = action.value;
      break;

    case 'SET_PAUSED':
      appState.program.isPaused = action.value;
      break;

    case 'SET_STEP':
      appState.program.currentStep = action.step;
      break;

    case 'SET_WORKSPACE_XML':
      appState.program.workspaceXml = action.xml;
      break;

    case 'SET_PEN':
      if ('down'   in action) appState.settings.penDown   = action.down;
      if ('colour' in action) appState.settings.penColour = action.colour;
      if ('width'  in action) appState.settings.penWidth  = action.width;
      break;

    case 'SET_SPEED':
      appState.settings.speed = action.speed;
      break;

    case 'SET_GRID':
      if ('cols'      in action) appState.settings.gridCols     = action.cols;
      if ('rows'      in action) appState.settings.gridRows      = action.rows;
      if ('boundary'  in action) appState.settings.boundaryType  = action.boundary;
      if ('pxPerUnit' in action) appState.settings.pxPerUnit     = action.pxPerUnit;
      break;

    case 'SET_CHARACTER':
      if ('mode'           in action) appState.character.mode           = action.mode;
      if ('svgString'      in action) appState.character.svgString      = action.svgString;
      if ('rotation'       in action) appState.character.rotation       = action.rotation;
      if ('penHoleVisible' in action) appState.character.penHoleVisible = action.penHoleVisible;
      break;

    case 'SET_UI':
      if ('activeTab'        in action) appState.ui.activeTab        = action.activeTab;
      if ('activeSidebarCat' in action) appState.ui.activeSidebarCat = action.activeSidebarCat;
      break;

    default:
      console.warn('[state] Unknown action type:', action.type, action);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getState — read-only snapshot (shallow copy to discourage direct mutation)
// ─────────────────────────────────────────────────────────────────────────────
function getState() {
  // Deep-copy nested objects so callers cannot accidentally mutate appState.
  return {
    roamer:   Object.assign({}, appState.roamer),
    program:  Object.assign({}, appState.program,  { blocks: appState.program.blocks.slice() }),
    settings: Object.assign({}, appState.settings),
    character: Object.assign({}, appState.character),
    ui:       Object.assign({}, appState.ui),
  };
}
