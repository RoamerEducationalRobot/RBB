// code-generator.js — Blockly JavaScript code generators for RBB blocks
// Phase 2: extracted from index_integrate_275.html
'use strict';
// ── Code Generators ───────────────────────────
Blockly.JavaScript['block_forward']      = b => 'FD,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_backward']     = b => 'BK,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_left']         = b => 'LT,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_right']        = b => 'RT,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_wait']         = b => 'W,'   + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_music']        = b => 'd,'   + b.getFieldValue('value1') + ',' + b.getFieldValue('value2') + e;
Blockly.JavaScript['block_sound_fx']     = b => 'Fx,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_set_music']    = b => '𝄞,' + b.getFieldValue('value1') + ',' + b.getFieldValue('value2') + e;
Blockly.JavaScript['block_volume']       = b => 'Vol,' + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_speed']        = b => 'Sp,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_scale_move']   = b => 'ScFD,'+ b.getFieldValue('value1') + e;
Blockly.JavaScript['block_scale_turn']   = b => 'ScRT,'+ b.getFieldValue('value1') + e;
Blockly.JavaScript['block_drive_mode']   = b => 'Dr,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_output_power'] = b => 'Pw,'  + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_variable_set'] = b => 'X,'   + b.getFieldValue('varnum') + ',' + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_repeat'] = function(b) {
  var inner = Blockly.JavaScript.statementToCode(b,'DO');
  return 'R,' + b.getFieldValue('value1') + e + '[' + e + inner + ']' + e;
};
Blockly.JavaScript['block_proc_def'] = function(b) {
  var num   = b.getFieldValue('value1');
  var name  = b.getFieldValue('value2') || '';
  var inner = Blockly.JavaScript.statementToCode(b,'DO');
  var comment = (name && name !== 'Name') ? '; P' + num + ' — ' + name + '\n' : '';
  return comment + 'P,' + num + e + '[' + e + inner + ']' + e;
};
Blockly.JavaScript['block_call_proc'] = function(b) {
  var num  = b.getFieldValue('value1');
  var name = b.getFieldValue('procname') || '';
  var comment = (name && name !== 'Name') ? '; call ' + name + '\n' : '';
  return comment + 'P,' + num + e;
};
Blockly.JavaScript['block_sensor']       = b => 'Ip,'  + b.getFieldValue('port') + ',L' + b.getFieldValue('level') + ',P' + b.getFieldValue('proc') + e;
Blockly.JavaScript['block_output_on']    = b => 'Op,'  + b.getFieldValue('value1') + ',On' + e;
Blockly.JavaScript['block_output_off']   = b => 'Op,'  + b.getFieldValue('value1') + ',Off' + e;
Blockly.JavaScript['block_parallel']     = b => '\\\\,P' + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_skip']         = () => 'Sk' + e;
Blockly.JavaScript['block_stop']         = () => 'STOP' + e;
Blockly.JavaScript['block_servo_on']     = b => 'Sv,'  + b.getFieldValue('value1') + ',' + b.getFieldValue('value2') + ',On' + e;
Blockly.JavaScript['block_servo_off']    = b => 'Sv,'  + b.getFieldValue('value1') + ',' + b.getFieldValue('value2') + ',Off' + e;
Blockly.JavaScript['block_pen_down'] = function(b) {
  var colMap = {black:'#000000',white:'#ffffff',red:'#ff0000',blue:'#0000ff',yellow:'#ffff00',green:'#00aa00',orange:'#ff8800',purple:'#8800cc',pink:'#ff66aa',brown:'#884400'};
  var col = colMap[b.getFieldValue('PEN_COLOUR')] || '#000000';
  return 'PD,' + col + ',' + b.getFieldValue('PEN_WIDTH') + e;
};
Blockly.JavaScript['block_pen_up']       = () => 'Pu' + e;
Blockly.JavaScript['block_program_header'] = b => 'NAME,' + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_go']           = () => 'GO' + e;
Blockly.JavaScript['block_comment']      = b => ';' + b.getFieldValue('value1') + e;
Blockly.JavaScript['block_music_chord']  = b => 'd [' + b.getFieldValue('dur1') + ' ' + b.getFieldValue('dur2') + ' ' + b.getFieldValue('dur3') + '] [' + b.getFieldValue('pitch1') + ' ' + b.getFieldValue('pitch2') + ' ' + b.getFieldValue('pitch3') + ']' + e;
Blockly.JavaScript['block_parallel_note'] = b => '\\\\,d,' + b.getFieldValue('dur') + ',' + b.getFieldValue('pitch') + e;
Blockly.JavaScript['block_parallel_simultaneous'] = b => '\\\\,[P' + b.getFieldValue('proc1') + ',P' + b.getFieldValue('proc2') + ',P' + b.getFieldValue('proc3') + ']' + e;
Blockly.JavaScript['block_call_proc_var'] = b => 'PX,' + b.getFieldValue('varnum') + e;
Blockly.JavaScript['block_output_var_on']  = b => 'OpX,' + b.getFieldValue('varnum') + ',On' + e;
Blockly.JavaScript['block_output_var_off'] = b => 'OpX,' + b.getFieldValue('varnum') + ',Off' + e;
Blockly.JavaScript['block_map']           = () => 'MAP' + e;
Blockly.JavaScript['block_map_on']        = () => 'MAP,On' + e;
Blockly.JavaScript['block_map_off']       = () => 'MAP,Off' + e;
Blockly.JavaScript['block_btle'] = function(b) {
  var inner = Blockly.JavaScript.statementToCode(b,'DO');
  return 'BTLE,' + b.getFieldValue('addr') + e + '[' + e + inner + ']' + e;
};

