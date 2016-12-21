/*jshint -W032, esnext:true */ /* ignore unnecessary semicolon */
/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
var Helper = require("./classes/Helper"),
  DOMHelper = require("./classes/DOMHelper"),
  Selections = require("./classes/Selection"),
  Toolbar = require("./classes/Toolbar");

class HtmlEditor {
  constructor(e, o) {
    var doc = (typeof document === 'undefined') ? {} : document,
      win = (typeof window === 'undefined') ? {} : window,
      defaults = {
        'doc': doc,
        'win': win,
        'disableMultiEmptyLines': true,
        'disableShiftEnter': true,
        'toolbar': ['b', 'i', 'ul', 'ol', 'indent', 'outdent'],
        'classPrefix': 'wys-editor-'
      };

    // initialize the parent element, selection and options
    this.parentElem = e;
    this.options = Helper.objOverrideValues(defaults, o);
    this.selection = Selections.createNew(this.options.win, this.options.doc);
    this.domHelper = new DOMHelper(this.options.doc);

    // then initialize all the other properties
    this.init();
  }

  init() {
    var context = this,
      buttons,
      cleanedHTML;

    this.selText = '';
    this.keyMap = {
      'ENTER': 13,
      'ARROWUP': 38,
      'ARROWDOWN': 40,
      'ARROWLEFT': 37,
      'ARROWRIGHT': 39
    };
    // create the new editor and toolbar elements
    this.editor = this.createEditor();

    // transfer the parent contents to the editor
    this.setContent(this.parentElem.innerHTML);
    this.toolbar = Toolbar.createInstance(this.options);
    this.toolbar.register(this);

    this.parentElem.innerHTML = '';

    // attach the editor and toolbar elements
    this.parentElem.appendChild(this.editor);
    this.parentElem.appendChild(this.toolbar.bar);

    this.addEventListeners();

    // CustomEvent not available to unit tests
    if (typeof CustomEvent !== 'undefined') {
      this.changeEvent = new CustomEvent('change');
    } else {
      this.changeEvent = this.options.doc.createEvent("HTMLEvents");
      this.changeEvent.initEvent("change", false, true);
    }

    this.updateValue();
  }

  createEditor() {
    var editor = this.options['doc'].createElement('div');

    editor.setAttribute('contentEditable', true);
    editor.classList.add('wys-html-editor-element');
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', true);

    return editor;
  }

  addEventListeners() {
    var context = this;

    this.editor.addEventListener("keydown", function (event) {
      context.checkKeyDown(event);
    }, false);

    this.editor.addEventListener("keyup", function (event) {
      context.checkKeyUp(event);
      context.selection.updateCursorPosition();
      context.selection.updateSelectionElement();
      context.updateValue();
    }, false);

    this.editor.addEventListener("mouseup", function (event) {
      context.selection.updateCursorPosition();
      context.selection.updateSelectionElement();
      context.textSelection();
    }, false);

    this.editor.addEventListener("blur", function (event) {
      event.preventDefault();
      // blur fires before mousedown, so we need to give the toolbar
      // time to register a click before hiding it
      setTimeout(function () {
        context.checkOnBlur(event);
      }, 10);
    }, false);

    this.toolbar.bar.addEventListener("mousedown", function () {
      context.toolbar.setFocus(true);
    }, false);

    this.toolbar.bar.addEventListener("mouseup", function () {
      context.toolbar.setFocus(false);
      context.editor.focus();
    }, false);
  }

  notifyToolbarBtnClick(btnclass) {
    var savedSel,
      foundClass;

    // find className that starts with "wys-editor-btn-"
    foundClass = Helper.findWordWithPrefix(this.options.classPrefix + 'btn-', btnclass);
    if (foundClass !== '') {
      btnclass = foundClass;
    }

    switch (btnclass) {
      case 'strong':
        this.execCommand('bold');
        savedSel = this.selection.saveSelection(this.editor);
        this.domHelper.replaceDomTags(this.editor, 'b', 'strong');
        this.domHelper.removeEmptyDomTags(this.editor, 'strong');
        this.selection.restoreSelection(this.editor, savedSel);
        this.selText = this.selection.getSelectionHTML();
        this.updateActiveToolbarButtons();
        break;
      case 'em':
        this.execCommand('italic');
        savedSel = this.selection.saveSelection(this.editor);
        this.domHelper.replaceDomTags(this.editor, 'i', 'em');
        this.domHelper.removeEmptyDomTags(this.editor, 'em');
        this.selection.restoreSelection(this.editor, savedSel);
        this.selText = this.selection.getSelectionHTML();
        this.updateActiveToolbarButtons();
        break;
      case 'ul':
        this.execCommand('insertUnorderedList');
        break;
      case 'ol':
        this.execCommand('insertOrderedList');
        break;
      case 'indent':
        this.execCommand('indent');
        break;
      case 'outdent':
        this.execCommand('outdent');
        break;
    }

    this.updateValue();
  }

  // when editor blurred, and the toolbar isn't the new focus, hide the toolbar
  checkOnBlur(event) {
    if (!this.toolbar.hasFocus()) {
      this.toolbar.hide();
    }
  }

  // check the current text selection to see what tags are within it
  updateActiveToolbarButtons() {
    var sharedHierarchy = this.selection.getSelectionHierarchy(this.editor);
    this.toolbar.highlightButtons(sharedHierarchy);
  }

  // fires whenever text is selected in the editor
  textSelection() {
    var text = this.selection.getSelectionHTML(),
      tags,
      sameSelection = (this.selText === text);

    if (text.length > 0 && !sameSelection) {
      // A text selection has been made!!!
      this.selText = text;
      // update the toolbar buttons for current selection
      this.updateActiveToolbarButtons(text);
      // TODO: show toolbar function...
      this.toolbar.setFocus(false);
      this.toolbar.show();
      this.toolbar.setPosition(this.selection.selectPos);
    } else {
      this.selText = '';
      this.toolbar.hide();
    }
  }

  // fires when keyboard key released
  checkKeyUp(event) {
    var key = event.which || event.keyCode;
    // shift+arrow selections
    if (event.shiftKey &&
      (key === this.keyMap.ARROWUP ||
        key === this.keyMap.ARROWDOWN ||
        key === this.keyMap.ARROWLEFT ||
        key === this.keyMap.ARROWRIGHT)) {
      this.textSelection();
    }
  }

  // outputs the current value of the WYSIWYG to a pre tag
  updateValue() {
    this.changeEvent.value = this.getValue(); // update the value
    this.parentElem.dispatchEvent(this.changeEvent); // dispatch
  }

  // Fires the browser execCommand to edit selections
  // https://developer.mozilla.org/en-US/docs/Web/API/document.execCommand
  // http://www.quirksmode.org/dom/execCommand.html
  execCommand(command, param, force_selection) {
    // ensure focus is on the editor
    this.editor.focus();
    // returns 'selection inside editor'
    if (!this.selection.isSelectionInside(this.editor, force_selection)) {
      return false;
    }

    // for webkit, mozilla, opera
    if (this.options['win'].getSelection) {
      // Buggy, call within 'try/catch'
      try {
        if (this.options['doc'].queryCommandSupported && !this.options['doc'].queryCommandSupported(command)) {
          return false;
        }
        return this.options['doc'].execCommand(command, false, param);
      } catch (e) {}
    }

    return false;
  }

  // fires when keyboard key is pressed
  checkKeyDown(event) {
    var key = event.which || event.keyCode;
    // disable shift+enter
    if (this.options.disableShiftEnter && key === this.keyMap.ENTER && event.shiftKey) {
      event.preventDefault();
    }
    // disable multiple empty lines
    if (this.options.disableMultiEmptyLines && key === this.keyMap.ENTER && event.shiftKey === false) {
      var selElem = this.selection.getBaseChildSelectionElement(true, this.editor),
        nextSib = selElem.nextElementSibling;

      // TODO: need to check more scenarios...
      // current element is an empty paragraph
      if (this.domHelper.isEmptyPara(selElem)) {
        event.preventDefault();
      } else if (nextSib && this.domHelper.isEmptyPara(nextSib)) {
        // next sibling is not null and is an empty paragraph
        // event.preventDefault();
        // move cursor to empty sibling
        // this.selection.moveCursorToElement(nextSib);
        this.editor.removeChild(nextSib);
      }
    }
  }

  // returns the editor element
  getElement() {
    return this.editor;
  }

  // gets a html string, cleans the html, and sets it as the new editor value
  setContent(html) {
    var div = this.options.doc.createElement('div'),
      cleanedHTML;

    if (html.trim() === '') {
      cleanedHTML = '<p><br></p>';
    } else {
      div.innerHTML = html;
      cleanedHTML = this.domHelper.cleanHTML(div);
    }

    this.editor.innerHTML = cleanedHTML;
  }

  // returns the value of the WYSIWYG
  getValue() {
    return this.editor.innerHTML;
  }

  // returns the current set of options
  getOptions() {
    return this.options;
  }
};

module.exports = HtmlEditor;