/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module, require, console*/
'use strict';
var SelectionModern = require("./selectionClasses/SelectionModern");

class Selection {
  static createNew(win, doc) {
    // window.getSelection() is available to all browsers, except < IE9 (not supported currently)
   if (typeof win.getSelection === 'undefined') {
     return null;
   }
   return new SelectionModern(win, doc);
  }
};

module.exports = Selection;