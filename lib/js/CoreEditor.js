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
      cleanedHTML,
      toolbar;

    // [name, button text, classname]
    this.buttonMap = {
      'b': ['bold', '<strong>B</strong>', 'strong'],
      'i': ['italic', '<em>I</em>', 'em'],
      'ul': ['list', '&bullet;', 'ul'],
      'ol': ['ordered-list', '1.', 'ol'],
      'indent': ['indent', '--&gt;', 'indent', 'special'],
      'outdent': ['outdent', '&lt;--', 'outdent', 'special']
    };
    this.buttonObjs = {};

    // this.classPrefix = 'wys-tb-';
    this.selText = '';
    this.toolbarFocus = false;
    this.keyMap = {
      'ENTER': 13,
      'ARROWUP': 38,
      'ARROWDOWN': 40,
      'ARROWLEFT': 37,
      'ARROWRIGHT': 39
    };

    this.editor = this.createEditor();

    this.toolbar = Toolbar.createInstance(this.options);
    this.buttonObjs = this.toolbar.buttonObjs;
    this.toolbar.register(this);

    if (this.parentElem.innerHTML === '') {
      this.editor.innerHTML = '<p><br></p>';
    } else {
      cleanedHTML = this.domHelper.cleanHTML(this.parentElem);
      this.editor.innerHTML = cleanedHTML;
    }
    this.parentElem.innerHTML = '';
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
      context.toolbarFocus = true;
    }, false);

    this.toolbar.bar.addEventListener("mouseup", function () {
      context.toolbarFocus = false;
      context.editor.focus();
    }, false);
  }

  notify(btnclass) {
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
    if (!this.toolbarFocus) {
      this.toolbar.bar.style.display = 'none';
    }
  }

  // positions the toolbar centered over the current text selection
  setToolbarPos(dims) {
    var tb_width = this.toolbar.bar.offsetWidth,
      tb_height = this.toolbar.bar.offsetHeight + 8,
      top = dims.y - tb_height,
      left = dims.x + (dims.w / 2) - (tb_width / 2);

    // TODO: this will be useful for the widget button later...
    // if (this.domHelper.isEmptyPara(this.selection.selectElem)) {
    //   top = this.selection.selectElem.offsetTop - tb_height;
    //   left = this.selection.selectElem.offsetLeft - (tb_width / 2);
    // }

    // keep toolbar from overflowing left of screen
    if (left < 0) {
      left = 0;
    }
    // keep toolbar from overflowing top of screen
    if (top < 0) {
      top = 0;
    }

    // apply the position
    this.toolbar.bar.style.top = top + 'px';
    this.toolbar.bar.style.left = left + 'px';
  }

  // check the current text selection to see what tags are within it
  updateActiveToolbarButtons() {
    var sharedHierarchy = this.selection.getSelectionHierarchy(this.editor);

    this.highlightToolbarButtons(sharedHierarchy);
  }

  // matches the current tags from the selection against
  // the buttons in the toolbar
  highlightToolbarButtons(tags) {
    var i, tag, listShown = false;

    // remove active class from all the buttons
    this.unHighlightToolbarButtons();
    for (i = tags.length - 1; i >= 0; i--) {
      tag = tags[i].toLowerCase();
      // if the tag matches a button, set it to active
      if (tag in this.buttonObjs) {
        Helper.addClass(this.buttonObjs[tag], 'active');
      }
      if (tag === 'li' && !listShown) {
        if (this.buttonObjs['indent']) {
          Helper.addClass(this.buttonObjs['indent'], 'show');
        }
        if (this.buttonObjs['outdent']) {
          Helper.addClass(this.buttonObjs['outdent'], 'show');
        }
        listShown = true;
      }
      if (tag === 'ul' || tag === 'ol') {
        break;
      }
    }
  }

  // remove active class from all buttons
  unHighlightToolbarButtons() {
    var i;

    for (i in this.buttonObjs) {
      Helper.removeClass(this.buttonObjs[i], 'show');
      Helper.removeClass(this.buttonObjs[i], 'active');
    }
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
      this.toolbarFocus = false;
      this.toolbar.bar.style.display = 'block';
      this.setToolbarPos(this.selection.selectPos);
    } else {
      this.selText = '';
      this.toolbar.bar.style.display = 'none';
    }
    // this.selText = text;
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