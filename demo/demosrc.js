/*global require*/
var wyshtml = require("../lib/wys-html-editor");

var elem = document.getElementById('wyseditor'),
    preElem = document.getElementById('output-code'),
    editor;

elem.addEventListener('change', function(event) {
    preElem.innerText = event.value;
}, false);

editor = new wyshtml(elem);
