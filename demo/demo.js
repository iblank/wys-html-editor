(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*global require*/
var wyshtml = require("../lib/wys-html-editor");

var elem = document.getElementById('wyseditor'),
    preElem = document.getElementById('output-code'),
    editor;

elem.addEventListener('change', function(event) {
    preElem.innerText = event.value;
}, false);

editor = new wyshtml(elem);

},{"../lib/wys-html-editor":10}],2:[function(require,module,exports){
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
        'classPrefix': 'wys-html-editor-'
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
    editor.classList.add(this.options['classPrefix'] + 'element');
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
},{"./classes/DOMHelper":3,"./classes/Helper":4,"./classes/Selection":5,"./classes/Toolbar":6}],3:[function(require,module,exports){
/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module, document, console*/
'use strict';

class DOMHelper {
  constructor(doc) {
    this.blockTags = ['p', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
    this.inlineTags = ['span', 'b', 'strong', 'i', 'em', 'br'];
    this.noTextTags = ['br'];
    this.doc = (!doc) ? document : doc;
  }

  // is the element empty
  isEmpty(el) {
    var text = el.textContent || el.innerText || "";
    return text.trim() === "";
  }

  // is the element empty and a p tag
  isEmptyPara(el) {
    var empty = this.isEmpty(el);
    return empty && el.tagName && el.tagName.toLowerCase() === 'p';
  }
  
  // Standardizes bold/italic tags and crawls through nodes in DOM element, 
  // so that direct descendants have approved block-level tags
  cleanHTML(dom) {
    // standardize tags
    this.replaceDomTags(dom, 'b', 'strong');
    this.replaceDomTags(dom, 'i', 'em');
    // clean the internals
    return this.cleanInternal(dom, 'div', true);
  }

  // Loops through DOM node and returns only approved inline html
  cleanInternal(node, tag, firstChild) {
    var newHTML = '', segment = '', cleanInt, wrap = 'nonsense', children, i;

    // if type is textNode return it
    if (node.nodeType === 3) {
      return node.textContent;
    }
    children = node.childNodes;

    // groups segments of inline nodes within wrapper groups
    for (i = 0; i < children.length; i++) {
      // format of cleanInt: [html, wrap tag]
      // the firstChild nodes of the editor are handled a little differently
      cleanInt = (firstChild) ? 
        this.cleanInternalFirstChild(children[i]) :
        this.cleanInternalChild(children[i], tag);

      // if there is a new wrap tag
      if (cleanInt[1] !== wrap) {
        // as long as we're not trying to wrap an empty segment, add it in
        if (!(segment.replace(/\s+/g, '') === '' && wrap !== '')) {
          newHTML+= this.wrapHTML(segment, wrap);
        }
        // start new html segment
        segment = cleanInt[0];
        // new wrap tag
        wrap = cleanInt[1];
      } else {
        // tag wrap was the same, so keep adding to html segment
        segment+= cleanInt[0];
      }
    }
    // last html segment is added after for loop
    if (!(segment.replace(/\s+/g, '') === '' && wrap !== '')) {
      newHTML+= this.wrapHTML(segment, wrap);
    }

    return newHTML;
  }

  // first child nodes are either returned as block level tags
  // or their content is wrapped in them
  cleanInternalFirstChild(child) {
    var tag = (typeof child.tagName !== 'undefined') ? child.tagName.toLowerCase() : 'textnode',
        wrap = '',
        internalHTML;

    // ensures the first child of the editor has a block-level tag, or wrapped into one
    if (tag === 'textnode') {
      tag = '';
      wrap = 'p';
    } else if (this.inlineTags.indexOf(tag) !== -1) {
      wrap = 'p';
    } else if (this.blockTags.indexOf(tag) === -1) {
      tag = 'p';
    }

    // clean the internals of this child element
    internalHTML = this.cleanInternal(child, tag);
    // wrap the html with the approved tag, or empty string if not approved
    return [this.wrapHTML(internalHTML, tag), wrap];
  }

  // Deep dives into a DOM node to return innerHTML with approved inline tags,
  // or specified block tags
  // returns array of strings: [innerHTML, wrap tag]
  cleanInternalChild(child, tag) {
    var childTag = (typeof child.tagName !== 'undefined') ? child.tagName.toLowerCase() : 'textnode',
        tagBlock = false,
        wrap = '',
        internalHTML;

    // Check special case tags, with strict dependencies
    if (tag === 'ul' || tag === 'ol') {
      // if not li, then include as inline and wrap in li
      if (childTag !== 'li') {
        // inline tags only...
        childTag = this.inlineOnly(childTag);
        wrap = 'li';
      }
      tagBlock = true;

    } else if (tag === 'li') {
      // inline tags, ul and ol only...
      childTag = this.inlineOnly(childTag, ['ul', 'ol']);

    } else if (tag === 'blockquote') {
      // if not p or footer, then include as inline and wrap in p
      if (childTag !== 'p' && childTag !== 'footer') {
        // inline tags only
        childTag = this.inlineOnly(childTag);
        wrap = 'p';
      }
      tagBlock = true;

    } else if (tag === 'footer') {
      // if not cite, then include as inline and wrap in cite
      if (childTag !== 'cite') {
        // inline tags only...
        childTag = this.inlineOnly(childTag);
        wrap = 'cite';
      }
      tagBlock = true;

    } else {
      childTag = this.inlineOnly(childTag);
    }

    if (childTag === 'textnode') {
      // prevents wrapping empty textnodes into blocklevel elements
      if (tagBlock && child.textContent.trim() === '') {
        return ['', ''];
      }
      childTag = '';
    }

    // clean the internals of this child element
    internalHTML = this.cleanInternal(child, childTag);
    // wrap the html with the approved tag, or empty string if not approved
    return [this.wrapHTML(internalHTML, childTag), wrap];
  }

  // returns '' if tag isn't inline or a given exception
  inlineOnly(tag, exceptions) {
    var i, flag = false;
    if (!exceptions) {
      exceptions = [];
    }
    for (i = 0; i < exceptions.length; i++) {
      if (exceptions[i] === tag) {
        flag = true;
        break;
      }
    }
    if (this.inlineTags.indexOf(tag) === -1 && tag !== 'textnode' && !flag) {
      return '';
    }
    return tag;
  }

  // wraps html in a given tag
  wrapHTML(html, tag) {
    if (tag === '') {
      return html;
    }
    // trim the contents of block level tags
    if (this.blockTags.indexOf(tag) !== -1) {
      html = html.trim();
    }

    // no empty paragraphs (editor creates p with br, which is ok)
    if (html === '' && tag === 'p') {
      return '';
    }

    // standalone tag with no text node, enter only the tag
    if (this.noTextTags.indexOf(tag) !== -1) {
      return '<' + tag + '/>';
    }
    
    return '<' + tag + '>' + html + '</' + tag + '>';
  }

  // find specified tags within DOM node and remove if empty
  removeEmptyDomTags(node, tag) {
    var elems = node.getElementsByTagName(tag), i, inner;

    // reverse loop through DOM node
    for (i = elems.length - 1; i >= 0; i--) {
      inner = elems[i].textContent;
      if (inner.trim() === '') {
        node.removeChild(elems[i]);
      }
    }
  }

  // find specified tags within DOM node and replace with another tag
  replaceDomTags(node, oldtag, newtag) {
    var elems = node.getElementsByTagName(oldtag), i;

    // reverse loop through DOM node
    for (i = elems.length - 1; i >= 0; i--) {
      this.swapTags(elems[i], newtag);
    }
  }

  // copy everything out of the old node and paste into a newly created tag,
  // then swap the old out for the new
  swapTags(oldnode, newtag) {
    var newnode = this.doc.createElement(newtag), i, attr;

    // Copy the children
    while (oldnode.firstChild) {
      newnode.appendChild(oldnode.firstChild); // *Moves* the child
    }

    // Copy the attributes
    for (i = oldnode.attributes.length - 1; i >= 0; i--) {
      attr = oldnode.attributes.item(i);
      newnode.setAttribute(attr.nodeName, attr.nodeValue);
      // newnode.attributes.setNamedItem(oldnode.attributes[i].cloneNode());
    }
    
    // Replace it
    oldnode.parentNode.replaceChild(newnode, oldnode);
  }

  // removes specified tags with no content from HTML string
  removeEmptyTags(html, tag) {
    // ex regex match: "<  b   >    </  b >"
    var regex = new RegExp("<\\s*" + tag + "\\s*>\\s*<\/\\s*" + tag + "\\s*>", "gi"),
        newHTML = html.replace(regex, '');

    return newHTML;
  }

  // replace specified tags with another tag in HTML string
  replaceTags(html, find, replace) {
    var regex = new RegExp("(<\/?\\s*)" + find + "(\\s|>)", "gi"),
        newHTML = html.replace(regex,'$1' + replace + '$2');

    return newHTML;
  }
};

module.exports = DOMHelper;
},{}],4:[function(require,module,exports){
/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module*/
'use strict';
class Helper {
  // return an object with all attributes from both objects,
  // and 2nd object overrides 1st object values
  static mergeObjs(obj1, obj2) {
    var obj3 = {},
        attrname;

    for (attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }

  // override values in obj1 where the attr is the same in obj2
  static objOverrideValues(obj1, obj2) {
    var attrname;

    for (attrname in obj2) {
      if (attrname in obj1) {
        obj1[attrname] = obj2[attrname];
      }
    }
    return obj1;
  }

  // return array of intersecting values between 2 arrays
  static arrayIntersect(a1, a2) {
    var i, aNew = [];

    for (i = 0; i < a1.length; i++) {
      if (aNew.indexOf(a1[i]) === -1 && a2.indexOf(a1[i]) !== -1) {
        aNew.push(a1[i]);
      }
    }
    return aNew;
  }

  // return add new values from array2 into array1
  static arrayAddUnique(a1, a2) {
    var i;

    for (i = 0; i < a2.length; i++) {
      if (a1.indexOf(a2[i]) === -1) {
        a1.push(a2[i]);
      }
    }
    return a1;
  }

  // element has class name
  static hasClass(el, className) {
    var reg;

    if (el.classList) {
      return el.classList.contains(className);
    } else {
      reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      return !!el.className.match(reg);
    }
  }

  // add class to element
  static addClass(el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else if (!this.hasClass(el, className)) {
      el.className += ' ' + className;
    }
  }

  // remove class from element
  static removeClass(el, className) {
    var reg;

    if (el.classList) {
      el.classList.remove(className);
    } else if (this.hasClass(el, className)) {
      reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      el.className = el.className.replace(reg, ' ');
    }
  }

  // toggle class for element
  static toggleClass(el, className) {
    if (this.hasClass(el, className)) {
      this.removeClass(el, className);
    } else {
      this.addClass(el, className);
    }
  }

  // return 1st word preceeded by prefix in string
  // ex: "re-" in "the re-creation of remix" returns "creation"
  static findWordWithPrefix(prefix, str) {
    var regex = new RegExp("\\b" + prefix + "(\\S+)", "gi"),
        match = str.match(regex);

    if (match) {
      return match[0].replace(prefix, '');
    }

    return '';
  }
};

module.exports = Helper;
},{}],5:[function(require,module,exports){
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
},{"./selectionClasses/SelectionModern":9}],6:[function(require,module,exports){
/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
var ToolbarButton = require("./ToolbarButton"),
    ToolbarButtonObservable = require("./ToolbarButtonObservable"),
    Helper = require("./Helper");

class Toolbar extends ToolbarButtonObservable {
    constructor(options) {
        super();
        this.focus = false;
        this.buttonObjs = {};
        this.options = options || null;
        this.buttonMap = {
            'b': ['bold', '<strong>B</strong>', 'strong'],
            'i': ['italic', '<em>I</em>', 'em'],
            'ul': ['list', '&bullet;', 'ul'],
            'ol': ['ordered-list', '1.', 'ol'],
            'indent': ['indent', '--&gt;', 'indent', 'special'],
            'outdent': ['outdent', '&lt;--', 'outdent', 'special']
        };
        this.bar = options['doc'].createElement('div');
        this.bar.style.display = 'none';
        Helper.addClass(this.bar, options['classPrefix'] + 'toolbar');
        this.bar.appendChild(this.createButtons());
    }

    static createInstance(options) {
        return new Toolbar(options);
    }

    setFocus(focus) {
        this.focus = focus;
    }

    hasFocus() {
        return this.focus;
    }

    show() {
        this.bar.style.display = 'block';
    }

    hide() {
        this.bar.style.display = 'none';
    }

    isHidden() {
        return this.bar.style.display === 'none';
    }

    createButtons() {
        var ul = this.options['doc'].createElement('ul'),
            btns = this.options.toolbar,
            i, toolBarButton;

        for (i = 0; i < btns.length; i++) {
            // if it's a recognized button
            if (btns[i] in this.buttonMap) {
                toolBarButton = ToolbarButton.create(btns[i], this.buttonMap, this.options);
                // add each button to an array, to keep track of them
                toolBarButton.register(this);
                this.buttonObjs[this.buttonMap[btns[i]][2]] = toolBarButton.btnNode;
                ul.appendChild(toolBarButton.li);
            }
        }

        return ul;
    }

    setPosition(dims) {
        var scrollPos = this.options.win.pageYOffset,
            tb_width = this.bar.offsetWidth,
            tb_height = this.bar.offsetHeight + 8,
            top = Math.round(dims.y - tb_height),
            left = Math.round(dims.x + (dims.w / 2) - (tb_width / 2));

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
            top = Math.round(dims.y + dims.h + 8);
            Helper.addClass(this.bar, 'below');
        } else {
            Helper.removeClass(this.bar, 'below');
        }

        // apply the position
        this.bar.style.top = (scrollPos + top) + 'px';
        this.bar.style.left = left + 'px';
    }

    // matches the current tags from the selection against
    // the buttons in the toolbar
    highlightButtons(tags) {
        var i, tag, listShown = false;

        // remove active class from all the buttons
        this.unHighlightButtons();
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
    unHighlightButtons() {
        var i;

        for (i in this.buttonObjs) {
            Helper.removeClass(this.buttonObjs[i], 'show');
            Helper.removeClass(this.buttonObjs[i], 'active');
        }
    }
}

module.exports = Toolbar;
},{"./Helper":4,"./ToolbarButton":7,"./ToolbarButtonObservable":8}],7:[function(require,module,exports){
/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
var Helper = require("./Helper"),
    ToolbarButtonObservable = require("./ToolbarButtonObservable");

class ToolbarButton extends ToolbarButtonObservable {
    constructor(buttonMap) {
        super();
        this.li = null;
        this.btnNode = null;
        this.buttonMap = buttonMap;
    }

    clicked(btnclass) {
        this.notifyToolbarBtnClick(btnclass);
    }

    static create(btn, buttonMap, options) {
        var button = new ToolbarButton(buttonMap),
            context = this;

        button.li = options['doc'].createElement('li');
        button.btnNode = options['doc'].createElement('button');

        // add the button class (ex: wys-editor-btn-strong)
        button.btnNode.setAttribute('class', options.classPrefix + 'btn-' + button.buttonMap[btn][2]);
        // if there are additional classes...
        if (button.buttonMap[btn][3]) {
            Helper.addClass(button.btnNode, button.buttonMap[btn][3]);
        }
        // add the button title (ex: bold)
        button.btnNode.title = button.buttonMap[btn][0];
        // add button html (ex: <strong>B</strong>)
        button.btnNode.innerHTML = button.buttonMap[btn][1];

        // add button click listener, with function to respond to event
        button.btnNode.addEventListener("click", function (event) {
            button.clicked(event.target.className);
        }, false);

        button.li.appendChild(button.btnNode);

        return button;
    }
}

module.exports = ToolbarButton;
},{"./Helper":4,"./ToolbarButtonObservable":8}],8:[function(require,module,exports){
/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
class ToolbarButtonObservable {
    constructor() {
        this.observers = [];
    }

    register(observer) {
        this.observers.push(observer);
    }

    notifyToolbarBtnClick(btnclass) {
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i].notifyToolbarBtnClick(btnclass);
        }
    }
}

module.exports = ToolbarButtonObservable;
},{}],9:[function(require,module,exports){
/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module, console, window, document, require*/
'use strict';
var Helper = require("../Helper");

class SelectionModern {
  constructor(win, doc) {
    // pass in window and document objects, to make unit testing much easier
    this.win = win;
    this.doc = doc;
    this.length = 0;
    this.selectPos = {
      'x': 0,
      'y': 0,
      'w': 0,
      'h': 0
    };
    this.selectElem = false;
    this.currentHTML = '';
    this.savedRange = {};
  }

  updateCursorPosition() {
    var range, sel, rects, rightMax, leftMin, i;

    sel = this.win.getSelection();
    if (sel.rangeCount) {
      range = sel.getRangeAt(0).cloneRange();
      if (range.getClientRects) {
        rects = range.getClientRects();
        // return rect that encompasses all rects...
        if (rects.length > 0) {
          rightMax = Math.max(rects[0].right, rects[rects.length - 1].right);
          leftMin = Math.min(rects[0].left, rects[rects.length - 1].left);
          this.selectPos.x = leftMin;
          this.selectPos.y = rects[0].top;
          this.selectPos.w = rightMax - leftMin;
          this.selectPos.h = rects[rects.length - 1].bottom - rects[0].top;
        }
        // Random rects return incorrect width/right data, when selecting 3 or more lines :( ...
        // rightMax = 0;
        // leftMin = 800000000;
        // for (i = 0; i < rects.length; i++) {
        //   console.log(rects[i]);
        //   rightMax = Math.max(rightMax, rects[i].right);
        //   leftMin = Math.min(leftMin, rects[i].left);
        //   this.selectPos.x = leftMin;
        //   this.selectPos.y = rects[0].top;
        //   this.selectPos.w = rightMax - leftMin;
        //   this.selectPos.h = rects[i].bottom - rects[0].top;
        // }
      }
    }
  }

  updateSelectionElement() {
    this.selectElem = this.getSelectionElement();
  }

  moveCursorToElement(element) {
    var range, selection;
    if (this.doc.createRange) {
      range = this.doc.createRange();//Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(element);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      selection = this.win.getSelection();//get the selection object (allows you to change selection)
      selection.removeAllRanges();//remove any selections already made
      selection.addRange(range);//make the range you have just created the visible selection
    }
  }

  getSelectionObj() {
    return this.win.getSelection();
  }

  getSelectionRange(selection) {
    var range;

    if (selection.getRangeAt && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      // Old WebKit
      range = this.doc.createRange();
      range.setStart(selection.anchorNode, selection.anchorOffset);
      range.setEnd(selection.focusNode, selection.focusOffset);

      // Handle the case when the selection was selected backwards (from the end to the start in the document)
      if (range.collapsed !== selection.isCollapsed) {
        range.setStart(selection.focusNode, selection.focusOffset);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
      }
    }

    return range;
  }

  getSelectionText() {
    return this.win.getSelection().toString();
  }

  getElementDefaultDisplay(tag) {
    var cStyle,
        t = this.doc.createElement(tag),
        gcs = "getComputedStyle" in this.win;

    this.doc.body.appendChild(t);
    cStyle = (gcs ? this.win.getComputedStyle(t, "") : t.currentStyle).display; 
    this.doc.body.removeChild(t);

    return cStyle;
  }

  getSelectionHierarchy(toplevel) {
    var selection = this.getSelectionObj(),
        range = this.getSelectionRange(selection),
        ancestor = range.commonAncestorContainer,
        selectedTags = [],
        style,
        div,
        ancestorTags = [];

    // for textnodes, add all inline-level parent tags
    if (ancestor.nodeType === 3) {
      ancestor = ancestor.parentNode;
      
      style = this.getElementDefaultDisplay(ancestor.tagName);
      while (style === 'inline') {
        selectedTags.push(ancestor.tagName);
        ancestor = ancestor.parentNode;
        style = this.getElementDefaultDisplay(ancestor.tagName);
      }
    // for everything else, clone the html contents of the text range
    // into a div and get all child nodes within that div
    } else {
      div = this.doc.createElement('div');
      div.appendChild(range.cloneContents());
      selectedTags = this.allTagsWithinElement(div, [], true);
    }

    // collect all the ancestors within the toplevel element
    while (ancestor && ancestor !== toplevel) {
      ancestorTags.unshift(ancestor.tagName);
      ancestor = ancestor.parentNode;
    }

    // if selected text is bold and in a nest list, the result would look
    // something like this: ['ul', 'li', 'ol', 'li', 'strong']
    return ancestorTags.concat(selectedTags);
  }

  allTagsWithinElement(el, tags, firstChild) {
    var i, children, newTags = [], childTags = [], allNewTags = [], tagCount = 0;

    children = el.childNodes;
    if (children.length === 1 && children[0].nodeType === 3) {
      return [];
    }
    for (i = 0; children && i < children.length; i++) {
      // ignore all empty nodes
      if (children[i].textContent.trim() !== '') {
        // if any child at the current level is a non-blank textnode
        if (children[i].nodeType === 3) {
          return [];
        } else {
          newTags.push(children[i].tagName); // push the current tag name
          // find all the child tags of the current tag
          childTags = this.allTagsWithinElement(children[i], newTags);
          // [current tag name] + all the child tags
          newTags = newTags.concat(childTags);
        }
        // on the first children we only want the tags in common,
        // otherwise we want a combination of all unique values
        if (firstChild) {
          tagCount++;
          if (tagCount === 1) {
            allNewTags = newTags;
          } else {
            allNewTags = Helper.arrayIntersect(allNewTags, newTags);
          }
        } else {
          allNewTags = Helper.arrayAddUnique(allNewTags, newTags);
        }
        newTags = [];
      }
    }

    return allNewTags;
  }

  getSelectionHTML() {
    var html = "", sel, container, i, sharedElems;

    sel = this.win.getSelection();
    if (sel.rangeCount) {
      container = this.doc.createElement("div");
      for (i = 0; i < sel.rangeCount; ++i) {
        container.appendChild(sel.getRangeAt(i).cloneContents());
      }
      html = container.innerHTML;
    }

    if (html.length > 0 && this.currentHTML !== html) {
      this.currentHTML = html;
    }

    return html;
  }

  // saves the character offsets of the string version of the range (start/end)
  // NOTE: if the text content changes between save and restore, a text adjustment
  // would need to be accounted for (+/- the text.length that was added/subtracted)
  saveSelection(containerEl) {
    var sel, range, preSelectionRange, start;

    sel = this.getSelectionObj();
    range = this.getSelectionRange(sel);
    // preSelectionRange is the range from the start of the container to
    // the current range
    preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    start = preSelectionRange.toString().length;

    return {
        start: start,
        end: start + range.toString().length
    };
  }

  restoreSelection(containerEl, savedSel) {
    var charIndex, range, nodeStack, node, foundStart, stop, nextCharIndex, i, sel, textRange;

    if (this.doc.createRange) {
      charIndex = 0;
      // create a range for the entire container
      range = this.doc.createRange();
      range.setStart(containerEl, 0);
      range.collapse(true);
      // start the nodeStack with the top level container
      nodeStack = [containerEl];
      foundStart = false;
      stop = false;

      // loop deeper until each textnode is found and checked in order, 
      // until it reaches the textnodes with the start and end character offsets
      // this ensures correct text is selected, regardless of the tags surrounding it
      while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType === 3) {
          nextCharIndex = charIndex + node.length;
          if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
            range.setStart(node, savedSel.start - charIndex);
            foundStart = true;
          }
          if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
            range.setEnd(node, savedSel.end - charIndex);
            stop = true;
          }
          charIndex = nextCharIndex;
        } else {
          i = node.childNodes.length;
          while (i--) {
            nodeStack.push(node.childNodes[i]);
          }
        }
      }

      sel = this.win.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
  isOrContainsNode(ancestor, descendant) {
    var node = descendant;
    while (node) {
      if (node === ancestor) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  isSelectionInside(containerNode, force) {
    var sel, range, rangeContainer;
    // selection inside editor?
    sel = this.win.getSelection();
    if (this.isOrContainsNode(containerNode,sel.anchorNode) && this.isOrContainsNode(containerNode,sel.focusNode)) {
      return true;
    }
    // selection at least partly outside editor
    if (!force) {
      return false;
    }
    // force selection to editor
    range = this.doc.createRange();
    range.selectNodeContents(containerNode);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    return true;
  }

  getBaseChildSelectionElement(isStart, container) {
    var selEl = this.getSelectionElement(isStart);

    while (selEl) {
      if (selEl.parentNode === container) {
        return selEl;
      }
      selEl = selEl.parentNode;
    }

    return container;
  }

  // get the parent element of the current selection
  getSelectionElement(isStart) {
    var sel = this.getSelectionObj(),
        range = this.getSelectionRange(sel),
        container;
    
    if (range) {
      container = range[isStart ? "startContainer" : "endContainer"];

      // Check if the container is a text node and return its parent if so
      return container.nodeType === 3 ? container.parentNode : container;
    }

    return false;
  }
};

module.exports = SelectionModern;
},{"../Helper":4}],10:[function(require,module,exports){
/*jshint -W032, esnext:true */ /* -W032 = ignore unnecessary semicolon */
/*globals module, require*/
var HtmlEditor = require("./js/CoreEditor");


function WysHtmlEditor(element, options) {
  'use strict';

  return new HtmlEditor(element, options);
}

module.exports = WysHtmlEditor;
},{"./js/CoreEditor":2}]},{},[1]);
