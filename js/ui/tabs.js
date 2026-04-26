// tabs.js — Tab switching and panel visibility
//
// Phase 2: thin wrapper over showTab() extracted into layout.js.
// This file owns the tab → panel mapping and will be the home for
// all tab-related logic once layout.js is further decomposed (Phase 6).
//
'use strict';

// Tab → panel ID mapping
var TAB_PANELS = {
  'rw':        'panel-rw',
  'workspace': 'panel-blockly',
  'settings':  'panel-settings',
};

// Programmatic tab activation (called from code, not button clicks)
function activateTab(name) {
  var btn = document.querySelector('.tabBtn[data-tab="' + name + '"]');
  if (btn) showTab(name, btn);
}
