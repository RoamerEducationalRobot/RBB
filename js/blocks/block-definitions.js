// block-definitions.js — Blockly category definitions and custom block shapes
// Phase 2: extracted from index_integrate_275.html
'use strict';
'use strict';
/*
 * ════════════════════════════════════════════════════════
 * RBB GLOSSARY — agreed terminology
 * ════════════════════════════════════════════════════════
 * Value field       Numerical input box on a block (yellow)
 * Text field        Text input box on a block (yellow)
 * Command           The instruction currently executing, shown in the Command Bar
 * Command Bar       The status line in the Control Console showing the current command text
 * GO block          The block that triggers program execution when clicked
 * Program           The connected sequence of blocks ending with the GO block
 * RoamerWorld       The virtual canvas where Roamer moves and draws
 * Workspace         The grid area inside RoamerWorld (sized in Roamer units)
 * Roamer unit       One Roamer body length = 20cm = default FD 1 distance
 * Trail             The line drawn by Roamer when pen is down
 * Stamp             A text or emoji label placed on the RoamerWorld canvas
 * Control Console   The panel at the bottom of Roamer Graphics containing GO, Pause, Continue, Step, Reset and the execution display
 * Mode selector     Dropdown: Discover, Explore, Investigate, Integrate, SEND, Robotic Roamer,
 *                   Python, Logo, GeoGebra. List is not an ordered sequence — ordering TBD.
 * Investigate       Mode between Explore and Integrate — independent working, procedures,
 *                   variables, more complex programs
 * SEND              Mode providing HCI/HRI options for SEND students. May include symbol-based
 *                   interfaces (PCS, Widgit), switch access, eye gaze and other AAC options.
 *                   Grounded in research (D. Levy) and Shoebox activities (R. Larsen).
 *                   Content TBD with SEND advisory group. Symbol licensing TBD.
 * Robotic Roamer    Mode extending Integrate with Array, IF, loops and full programming constructs
 * Setup sidebar     The left panel in RoamerWorld for workspace configuration (accordion)
 * Step Mat          World type: 5×5 bounded workspace matching the physical Roamer mat
 *                   Name is a placeholder — better term to be decided with advisory group
 * Big Country       World type: large open workspace, canvas fills the screen
 * Scene             World type: background image with boundary-triggered scene shifts (R30050 Issue 2)
 * Bounded           Boundary mode: Roamer stops at the workspace edge
 * Wrap              Boundary mode: Roamer reappears on the opposite edge
 * Connected trail   Wrap sub-mode: trail draws across the boundary
 * Broken trail      Wrap sub-mode: trail lifts at boundary, resumes from new entry point
 * Horizon mode      Viewport shifts at boundary revealing new space ahead — under research
 * ════════════════════════════════════════════════════════
 */
var s = ',', e = '\r\n';
var C_GREY = '#D6D6FF';
var C_GREEN_FRAME = '#00FF00';
var C_RED_FRAME = '#FF0000';

var RBB_ICON_SIZE = 24; // icon size in pixels — CSS scale handles proportional reduction
function img(name) {
  var imgW = (name === 'Stop') ? RBB_ICON_SIZE * 2 : RBB_ICON_SIZE;
  return new Blockly.FieldImage(RBB_KEYS[name] || './Keys/' + name + '.png', imgW, RBB_ICON_SIZE, name);
}

// ── Category definitions ──────────────────────
var CATS_GO = [
  { label:'Programming',         colour:'#00BB00', cat:'Programming' },
  { label:'Move',                colour:'#00A0E3', cat:'Move' },
  { label:'Sound',               colour:'#FF00FF', cat:'Sound' },
  { label:'Repeat & Procedures', colour:'#0000FF', cat:'Repeat & Procedures' },
  { label:'Change',              colour:'#FF7F00', cat:'Change' },
  { label:'Control',             colour:'#FF00FF', cat:'Control' },
  { label:'Communications',      colour:'#5AF3F4', cat:'Communications', btnColour:'#5AF3F4' }
];
var CATS_PROC = [
  { label:'Repeat & Procedures',  colour:'#0000FF', cat:'Repeat & Procedures' },
  { label:'Move',                 colour:'#00A0E3', cat:'Move' },
  { label:'Sound',                colour:'#FF00FF', cat:'Sound' },
  { label:'Change',               colour:'#FF7F00', cat:'Change' },
  { label:'Control',              colour:'#FF00FF', cat:'Control' },
  { label:'Communications',       colour:'#5AF3F4', cat:'Communications', btnColour:'#5AF3F4' }
];

// ══ BLOCK DEFINITIONS ════════════════════════

// Move
Blockly.Blocks['block_forward'] = { init: function() {
  this.appendDummyInput().appendField(img('Forward')).appendField(new Blockly.FieldNumber(1,1,100,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('FD: Forward [1-100] steps.');
}};
Blockly.Blocks['block_backward'] = { init: function() {
  this.appendDummyInput().appendField(img('Backward')).appendField(new Blockly.FieldNumber(1,1,100,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('BK: Backward [1-100] steps.');
}};
Blockly.Blocks['block_left'] = { init: function() {
  this.appendDummyInput().appendField(img('Left')).appendField(new Blockly.FieldNumber(90,1,360,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('LT: Turn left [1-360] units.');
}};
Blockly.Blocks['block_right'] = { init: function() {
  this.appendDummyInput().appendField(img('Right')).appendField(new Blockly.FieldNumber(90,1,360,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('RT: Turn right [1-360] units.');
}};
Blockly.Blocks['block_wait'] = { init: function() {
  this.appendDummyInput().appendField(img('Wait')).appendField(new Blockly.FieldNumber(1,1,300,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('W: Wait [1-300] seconds.');
}};

// Sound
Blockly.Blocks['block_music'] = { init: function() {
  this.appendDummyInput().appendField(img('Music'))
    .appendField(new Blockly.FieldNumber(4,1,9,1),'value1')
    .appendField(new Blockly.FieldNumber(1,1,14,1),'value2');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('d: Duration [1-9] Pitch [1-14].');
}};
Blockly.Blocks['block_sound_fx'] = { init: function() {
  this.appendDummyInput().appendField(img('Fx')).appendField(new Blockly.FieldNumber(1,1,999,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Fx: Sound effect [1-999].');
}};
Blockly.Blocks['block_set_music'] = { init: function() {
  this.appendDummyInput().appendField(img('Clef'))
    .appendField(new Blockly.FieldNumber(3,1,5,1),'value1')
    .appendField(new Blockly.FieldNumber(3,1,5,1),'value2');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('𝄞: Set Tempo [1-5] and Octave [1-5].');
}};
Blockly.Blocks['block_volume'] = { init: function() {
  this.appendDummyInput().appendField(img('Volume')).appendField(new Blockly.FieldNumber(5,1,10,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Vol: Volume [1-10].');
}};

// Change
Blockly.Blocks['block_speed'] = { init: function() {
  this.appendDummyInput().appendField(img('Speed')).appendField(new Blockly.FieldNumber(5,1,10,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Sp: Speed [1-10].');
}};
Blockly.Blocks['block_scale_move'] = { init: function() {
  this.appendDummyInput().appendField(img('Scale')).appendField(img('Forward'))
    .appendField(new Blockly.FieldNumber(20,1,100,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Sc FD: Linear unit [1-100]cm.');
}};
Blockly.Blocks['block_scale_turn'] = { init: function() {
  this.appendDummyInput().appendField(img('Scale')).appendField(img('Right'))
    .appendField(new Blockly.FieldNumber(1,1,360,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Sc RT: Set turning unit [1-360].');
}};
Blockly.Blocks['block_drive_mode'] = { init: function() {
  this.appendDummyInput().appendField(img('Drive'))
    .appendField(new Blockly.FieldNumber(1,1,4,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Dr: 1=Default 2=Speed 3=Power 4=Accuracy.');
}};
Blockly.Blocks['block_output_power'] = { init: function() {
  this.appendDummyInput().appendField(img('Power')).appendField(new Blockly.FieldNumber(10,1,10,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Pw: Output power [1-10].');
}};
Blockly.Blocks['block_variable_set'] = { init: function() {
  this.appendDummyInput().appendField(img('Variable'))
    .appendField(new Blockly.FieldNumber(1,1,9,1),'varnum')
    .appendField(new Blockly.FieldNumber(1,1,360,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('X: Set variable [1-9] to value [1-360].');
}};

// Repeat & Procedures
Blockly.Blocks['block_repeat'] = { init: function() {
  this.appendDummyInput()
    .appendField(img('Repeat'))
    .appendField(new Blockly.FieldNumber(2,1,100,1),'value1')
    .appendField(img('['));
  this.appendStatementInput('DO');
  this.appendDummyInput('CLOSE')
    .setAlign(Blockly.inputs.Align.LEFT)
    .appendField(img(']'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('R: Repeat [1-100] times.');
}};

Blockly.Blocks['block_proc_def'] = { init: function() {
  this.appendDummyInput()
    .appendField(img('Procedure'))
    .appendField(new Blockly.FieldNumber(1,1,200,1),'value1')
    .appendField(new Blockly.FieldTextInput('Name'),'value2')
    .appendField(img('['));
  this.appendStatementInput('DO');
  this.appendDummyInput('CLOSE')
    .setAlign(Blockly.inputs.Align.RIGHT)
    .appendField(img(']'));
  this.setColour(C_GREY); this.setTooltip('P: Define procedure P[1-200].');
}};
Blockly.Blocks['block_call_proc'] = { init: function() {
  this.appendDummyInput().appendField(img('Procedure'))
    .appendField(new Blockly.FieldNumber(1,1,200,1),'value1')
    .appendField(new Blockly.FieldTextInput('Name'),'procname');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('P: Call procedure P[1-200].');
}};

// Control
Blockly.Blocks['block_sensor'] = { init: function() {
  this.appendDummyInput().appendField(img('Ip'))
    .appendField(new Blockly.FieldNumber(1,1,10,1),'port')
    .appendField(img('Level'))
    .appendField(new Blockly.FieldNumber(1,1,5,1),'level')
    .appendField(img('Procedure'))
    .appendField(new Blockly.FieldNumber(1,1,200,1),'proc');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Ip: Port [1-10] Level [1-5] P [1-200].');
}};
Blockly.Blocks['block_output_on'] = { init: function() {
  this.appendDummyInput().appendField(img('Op')).appendField(new Blockly.FieldNumber(1,1,10,1),'value1').appendField(img('On'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Op On: Output [1-10] ON.');
}};
Blockly.Blocks['block_output_off'] = { init: function() {
  this.appendDummyInput().appendField(img('Op')).appendField(new Blockly.FieldNumber(1,1,10,1),'value1').appendField(img('Off'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Op Off: Output [1-10] OFF.');
}};
Blockly.Blocks['block_parallel'] = { init: function() {
  this.appendDummyInput().appendField(img('Parallel')).appendField(img('Procedure'))
    .appendField(new Blockly.FieldNumber(1,1,200,1),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('\\\\ P: Run procedure in parallel.');
}};
Blockly.Blocks['block_skip'] = { init: function() {
  this.appendDummyInput().appendField(img('Skip'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Sk: End sense procedure.');
}};
Blockly.Blocks['block_stop'] = { init: function() {
  this.appendDummyInput()
    .appendField(new Blockly.FieldImage('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24"><rect width="48" height="24" rx="4" fill="%23FF0000"/><text x="24" y="17" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">STOP</text></svg>', 48, 24, 'STOP'));
  this.setPreviousStatement(true, null); this.setNextStatement(true, null);
  this.setColour(C_RED_FRAME);
  this.setTooltip('STOP: Stop the GO Program mid-execution.');
}};
Blockly.Blocks['block_servo_on'] = { init: function() {
  this.appendDummyInput().appendField(img('Servo'))
    .appendField(new Blockly.FieldNumber(1,1,4,1),'value1')
    .appendField(new Blockly.FieldNumber(90,0,180,1),'value2')
    .appendField(img('On'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Sv On: Servo [1-4] angle [0-180] ON.');
}};
Blockly.Blocks['block_servo_off'] = { init: function() {
  this.appendDummyInput().appendField(img('Servo'))
    .appendField(new Blockly.FieldNumber(1,1,4,1),'value1')
    .appendField(new Blockly.FieldNumber(90,0,180,1),'value2')
    .appendField(img('Off'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Sv Off: Servo [1-4] angle [0-180] OFF.');
}};
Blockly.Blocks['block_pen_down'] = { init: function() {
  this.appendDummyInput()
    .appendField(img('PenDown'))
    .appendField(new Blockly.FieldTextInput('black', function(val) {
      var valid = ['black','white','red','blue','yellow','green','orange','purple','pink','brown'];
      return valid.indexOf(val.toLowerCase()) >= 0 ? val.toLowerCase() : null;
    }), 'PEN_COLOUR')
    .appendField(new Blockly.FieldNumber(2, 1, 5, 1), 'PEN_WIDTH');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY);
  this.setTooltip('PD: Pen colour: black white red blue yellow green orange purple pink brown. Pen width: 1 (thin) to 5 (Roamer width).');
}};
Blockly.Blocks['block_pen_up'] = { init: function() {
  this.appendDummyInput().appendField(img('PenUp'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Pu: Pen Up.');
}};

// Programming
Blockly.Blocks['block_program_header'] = { init: function() {
  this.appendDummyInput()
    .appendField('\u25B6')
    .appendField(new Blockly.FieldTextInput('Program Title'),'value1');
  this.setNextStatement(true, null);
  this.setColour(C_GREEN_FRAME);
  this.setTooltip('Program Title — describe what your program does.');
}};
Blockly.Blocks['block_go'] = { init: function() {
  this.appendDummyInput()
    .appendField(new Blockly.FieldImage('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24"><rect width="48" height="24" rx="4" fill="%2300FF00"/><text x="24" y="17" font-family="Arial" font-size="13" font-weight="bold" fill="black" text-anchor="middle">GO</text></svg>', 48, 24, 'GO'));
  this.setPreviousStatement(true, null);
  this.setColour(C_GREEN_FRAME);
  this.setTooltip('GO — click to run your program in Roamer Graphics.');
}};
// Comment block — semicolon always visible as label, text field for comment text
Blockly.Blocks['block_comment'] = { init: function() {
  this.appendDummyInput()
    .appendField(';')
    .appendField(new Blockly.FieldTextInput(''),'value1');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip(';Comment: max 15 characters per line.');
}};

// ── New blocks — complete R30016 syntax ──────────────────────────────────────

// Chord note: d [dur dur dur] [pitch pitch pitch]  (§4.2)
// Roamer Graphics simulation needed: play up to 3 simultaneous Web Audio tones,
// duration = max of the three durations. Requires 4-channel audio model (deferred v63).
Blockly.Blocks['block_music_chord'] = { init: function() {
  this.appendDummyInput().appendField(img('Music'))
    .appendField(img('['))
    .appendField(new Blockly.FieldNumber(4,1,9,1),'dur1')
    .appendField(new Blockly.FieldNumber(4,1,9,1),'dur2')
    .appendField(new Blockly.FieldNumber(4,1,9,1),'dur3')
    .appendField(img(']'))
    .appendField(img('['))
    .appendField(new Blockly.FieldNumber(1,1,14,1),'pitch1')
    .appendField(new Blockly.FieldNumber(5,1,14,1),'pitch2')
    .appendField(new Blockly.FieldNumber(8,1,14,1),'pitch3')
    .appendField(img(']'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('d [dur dur dur] [pitch pitch pitch]: Chord — up to 3 simultaneous notes. Duration [1-9] Pitch [1-14].');
}};

// Parallel note: \\ d N1 N2  (§8.1 — play note in parallel with next movement)
// Roamer Graphics simulation needed: overlap Web Audio note with movement animation.
// Requires parallel execution model (deferred v63).
Blockly.Blocks['block_parallel_note'] = { init: function() {
  this.appendDummyInput().appendField(img('Parallel')).appendField(img('Music'))
    .appendField(new Blockly.FieldNumber(4,1,9,1),'dur')
    .appendField(new Blockly.FieldNumber(1,1,14,1),'pitch');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('\\\\ d: Play note Duration [1-9] Pitch [1-14] in parallel with next movement command.');
}};

// Simultaneous parallel start: \\[P N P N P N]  (§8.4)
// Roamer Graphics simulation needed: run up to 3 procedures concurrently using
// Promise.all or overlapping async calls. Requires parallel execution model (deferred v63).
Blockly.Blocks['block_parallel_simultaneous'] = { init: function() {
  this.appendDummyInput().appendField(img('Parallel')).appendField(img('['))
    .appendField(img('Procedure')).appendField(new Blockly.FieldNumber(1,1,200,1),'proc1')
    .appendField(img('Procedure')).appendField(new Blockly.FieldNumber(2,1,200,1),'proc2')
    .appendField(img('Procedure')).appendField(new Blockly.FieldNumber(3,1,200,1),'proc3')
    .appendField(img(']'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('\\\\[P P P]: Start up to 3 procedures simultaneously in parallel.');
}};

// Variable procedure call: P X N  (§10.1.1)
// Roamer Graphics simulation needed: rw.vars[N] must be populated at runtime by X blocks;
// rwRunQueue resolves variable value to procedure number and calls it.
Blockly.Blocks['block_call_proc_var'] = { init: function() {
  this.appendDummyInput().appendField(img('Procedure'))
    .appendField(img('Variable'))
    .appendField(new Blockly.FieldNumber(1,1,9,1),'varnum');
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('P X: Call the procedure whose number is stored in variable X[1-9].');
}};

// Variable output on: Op X N On  (§10.1.2)
// Roamer Graphics simulation needed: rw.vars[N] resolves to port number;
// visual output indicator (coloured dot) on canvas for that port. Same as Op fixed, but dynamic port.
Blockly.Blocks['block_output_var_on'] = { init: function() {
  this.appendDummyInput().appendField(img('Op'))
    .appendField(img('Variable'))
    .appendField(new Blockly.FieldNumber(1,1,9,1),'varnum')
    .appendField(img('On'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Op X On: Switch ON the output port whose number is in variable X[1-9].');
}};

// Variable output off: Op X N Off  (§10.1.2)
// Roamer Graphics simulation needed: as above, switch off the visual indicator.
Blockly.Blocks['block_output_var_off'] = { init: function() {
  this.appendDummyInput().appendField(img('Op'))
    .appendField(img('Variable'))
    .appendField(new Blockly.FieldNumber(1,1,9,1),'varnum')
    .appendField(img('Off'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('Op X Off: Switch OFF the output port whose number is in variable X[1-9].');
}};

// ── Communications blocks ─────────────────────
// MAP blocks communicate via Wi-Fi (R3 ↔ RBB).
// BTLE block communicates via Bluetooth Low Energy (R3 ↔ R3 / pods / RoamerWorld devices).

// MAP — stamp Roamer's current location as a pin in Roamer Graphics
Blockly.Blocks['block_map'] = { init: function() {
  this.appendDummyInput().appendField(img('Map'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('MAP: Stamp a location pin at Roamer\'s current position in Roamer Graphics.');
}};

// MAP On — begin tracking Roamer's journey in Roamer Graphics
Blockly.Blocks['block_map_on'] = { init: function() {
  this.appendDummyInput().appendField(img('Map')).appendField(img('On'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('MAP On: Begin tracking Roamer\'s journey. Roamer Graphics will trace the path travelled.');
}};

// MAP Off — stop tracking Roamer's journey
Blockly.Blocks['block_map_off'] = { init: function() {
  this.appendDummyInput().appendField(img('Map')).appendField(img('Off'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('MAP Off: Stop tracking Roamer\'s journey.');
}};

// BTLE n [ ] — send RSL code to device(s) on the Bluetooth network.
// Address: 0 = all Roamers, 1–10 = onboard pods/RAMB, 11–20 = individual Roamers, 21–30 = RoamerWorld devices.
// The bracketed RSL is injected directly into the receiving device's execution stream.
Blockly.Blocks['block_btle'] = { init: function() {
  this.appendDummyInput()
    .appendField(img('BLE'))
    .appendField(new Blockly.FieldNumber(0,0,30,1),'addr')
    .appendField(img('['));
  this.appendStatementInput('DO');
  this.appendDummyInput('CLOSE')
    .setAlign(Blockly.inputs.Align.LEFT)
    .appendField(img(']'));
  this.setPreviousStatement(true,null); this.setNextStatement(true,null);
  this.setColour(C_GREY); this.setTooltip('BTLE n [ ]: Send RSL instructions to a Bluetooth device. Address: 0=all Roamers, 1–10=pods/RAMB, 11–20=individual Roamers, 21–30=RoamerWorld devices.');
}};

