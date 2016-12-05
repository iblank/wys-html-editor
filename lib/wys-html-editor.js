/*jshint -W032, esnext:true */ /* -W032 = ignore unnecessary semicolon */
/*globals module, require*/
var HtmlEditor = require("./js/CoreEditor");


function WysHtmlEditor(element, options) {
  'use strict';

  return new HtmlEditor(element, options);
}

module.exports = WysHtmlEditor;