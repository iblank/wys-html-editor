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

},{"../lib/wys-html-editor":7}],2:[function(require,module,exports){
/*jshint -W032, esnext:true */ /* ignore unnecessary semicolon */
/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
var Helper = require("./classes/Helper"),
    DOMHelper = require("./classes/DOMHelper"),
    Selections = require("./classes/Selection");

class HtmlEditor {
  constructor(e, o) {
    var doc = (typeof document === 'undefined') ? {} : document,
        win = (typeof window === 'undefined') ? {} : window,
        defaults = {
          'doc' : doc,
          'win' : win,
          'disableMultiEmptyLines' : true,
          'disableShiftEnter' : true,
          'toolbar' : ['b', 'i', 'ul', 'ol', 'indent', 'outdent'],
          'classPrefix' : 'wys-editor-'
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

    // [name, button text, classname]
    this.buttonMap = {
      'b': ['bold', '<strong>B</strong>', 'strong'],
      'i': ['italic', '<em>I</em>', 'em'],
      'ul': ['list', '&bullet;', 'ul'],
      'ol': ['ordered-list', '1.', 'ol']
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
    this.toolbar = this.createToolbar();
    if (this.parentElem.innerHTML === '') {
      this.editor.innerHTML = '<p><br></p>';
    } else {
      cleanedHTML = this.domHelper.cleanHTML(this.parentElem);
      this.editor.innerHTML = cleanedHTML;
    }
    this.parentElem.innerHTML = '';
    this.parentElem.appendChild(this.editor);
    this.parentElem.appendChild(this.toolbar);

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

  createToolbar() {  
    var toolbar = this.options['doc'].createElement('div'),
        buttons;
    
    toolbar.classList.add('wys-html-editor-toolbar');
    buttons = this.createToolbarButtons();

    toolbar.appendChild(buttons);
    
    return toolbar;
  }

  addEventListeners() {
    var context = this;
    
    this.editor.addEventListener("keydown", function(event) {
      context.checkKeyDown(event);
    }, false);

    this.editor.addEventListener("keyup", function(event) {
      context.checkKeyUp(event);
      context.selection.updateCursorPosition();
      context.selection.updateSelectionElement();
      context.updateValue();
    }, false);

    this.editor.addEventListener("mouseup", function(event) {
      context.selection.updateCursorPosition();
      context.selection.updateSelectionElement();
      context.textSelection();
    }, false);

    this.editor.addEventListener("blur", function(event) {
      event.preventDefault();
      // blur fires before mousedown, so we need to give the toolbar
      // time to register a click before hiding it
      setTimeout(function() { context.checkOnBlur(event); }, 10);
    }, false);

    this.toolbar.addEventListener("mousedown", function() {
      context.toolbarFocus = true;
    }, false);

    this.toolbar.addEventListener("mouseup", function() {
      context.toolbarFocus = false;
      context.editor.focus();
    }, false);
  }

  createToolbarButtons() {
    var ul = this.options['doc'].createElement('ul'),
        btns = this.options.toolbar,
        i;

    for (i = 0; i < btns.length; i++) {
      // if it's a recognized button
      if (btns[i] in this.buttonMap) {
        ul.appendChild(this.createToolbarButton(btns[i]));
      }
    }

    return ul;
  }

  // btn is a string that cooresponds to a particular button
  createToolbarButton(btn) {
    var li = this.options['doc'].createElement('li'),
        btnNode = this.options['doc'].createElement('button'),
        context = this;

    // add the button class (ex: wys-editor-btn-strong)
    btnNode.setAttribute('class', this.options.classPrefix + 'btn-' + this.buttonMap[btn][2]);
    // add the button title (ex: bold)
    btnNode.title = this.buttonMap[btn][0];
    // add button html (ex: <strong>B</strong>)
    btnNode.innerHTML = this.buttonMap[btn][1];

    // add button click listener, with function to respond to event
    btnNode.addEventListener("click", function(event) {
      context.toolbarButtonClick(event.target.className);
    }, false);

    // add each button to an array, to keep track of them
    this.buttonObjs[this.buttonMap[btn][2]] = btnNode;

    li.appendChild(btnNode);

    return li;
  }

  toolbarButtonClick(btnclass) {
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
        this.updateActiveToolbarButtons(); // highlight/unhighlight buttons
        break;
      case 'em':
        this.execCommand('italic');
        savedSel = this.selection.saveSelection(this.editor);
        this.domHelper.replaceDomTags(this.editor, 'i', 'em');
        this.domHelper.removeEmptyDomTags(this.editor, 'em');
        this.selection.restoreSelection(this.editor, savedSel);
        this.selText = this.selection.getSelectionHTML();
        this.updateActiveToolbarButtons(); // highlight/unhighlight buttons
        break;
      case 'ul':
        this.execCommand('insertUnorderedList');
        break;
      case 'ol':
        this.execCommand('insertOrderedList');
        break;
    }

    this.updateValue();
  }

  // when editor blurred, and the toolbar isn't the new focus, hide the toolbar
  checkOnBlur(event) {
    if (!this.toolbarFocus) {
      this.toolbar.style.display = 'none';
    }
  }

  // positions the toolbar centered over the current text selection
  setToolbarPos(dims) {
    var tb_width = this.toolbar.offsetWidth,
        tb_height = this.toolbar.offsetHeight + 8,
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
    this.toolbar.style.top = top+'px';
    this.toolbar.style.left = left+'px';
  }

  // check the current text selection to see what tags are within it
  updateActiveToolbarButtons() {
      var sharedHierarchy = this.selection.getSelectionHierarchy(this.editor);

      this.highlightToolbarButtons(sharedHierarchy);
  }

  // matches the current tags from the selection against
  // the buttons in the toolbar
  highlightToolbarButtons(tags) {
    var i, tag;
    
    // remove active class from all the buttons
    this.unHighlightToolbarButtons();
    for (i = tags.length - 1; i >= 0; i--) {
      tag = tags[i].toLowerCase();
      // if the tag matches a button, set it to active
      if (tag in this.buttonObjs) {
        Helper.addClass(this.buttonObjs[tag], 'active');
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
      this.toolbar.style.display = 'block';
      this.setToolbarPos(this.selection.selectPos);
    } else {
      this.selText = '';
      this.toolbar.style.display = 'none';
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
      } catch(e) {}
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
},{"./classes/DOMHelper":3,"./classes/Helper":4,"./classes/Selection":5}],3:[function(require,module,exports){
/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module, document, console*/
'use strict';

class DOMHelper {
  constructor(doc) {
    this.blockTags = ['p', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
    this.inlineTags = ['span', 'b', 'strong', 'i', 'em'];
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
    var i, nodes, content, newHTML = '', tag, internalHTML;

    this.replaceDomTags(dom, 'b', 'strong');
    this.replaceDomTags(dom, 'i', 'em');
    nodes = dom.childNodes;
    for (i = 0; i < nodes.length; i++) {
      // ignore any nodes that have nothing but space characters
      content = nodes[i].textContent.replace(/\s+/g, "");
      if (content !== "" && nodes[i].tagName) {
        tag = nodes[i].tagName.toLowerCase();
        
        // Direct descendants should be approved block-level tags only
        if (this.blockTags.indexOf(tag) !== -1) {
          internalHTML = this.cleanInternal(nodes[i], tag);
          newHTML += '<' + tag + '>' + internalHTML + '</' + tag + '>';
        } else {
          internalHTML = this.cleanInternal(nodes[i], 'p');
          newHTML += '<p>' + internalHTML + '</p>';
        }
      } else if (content !== "") {
        newHTML += '<p>' + nodes[i].textContent.trim() + '</p>';
      }
    }
    return newHTML;
  }

  // Loops through DOM node and returns only approved inline html
  cleanInternal(node, tag) {
    var newHTML = '', segment = '', cleanInt, wrap = 'nonsense', children, i;

    // if type is textNode return it
    if (node.nodeType === 3) {
      return node.textContent;
    }
    children = node.childNodes;

    // groups segments of inline nodes within wrapper groups
    for (i = 0; i < children.length; i++) {
      // format of return: [html, wrap tag]...
      cleanInt = this.cleanInternalChild(children[i], tag);

      // if there is a new wrap tag
      if (cleanInt[1] !== wrap) {
        // if there is an existing segment, add it in
        if (segment !== '') {
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
    if (segment !== '') {
      newHTML+= this.wrapHTML(segment, wrap);
    }

    return newHTML;
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
},{"./selectionClasses/SelectionModern":6}],6:[function(require,module,exports){
/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module, console, window, document*/
'use strict';
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

    if (selection.getRangeAt) {
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }
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

    if (range) {
      // console.log(range);
      return range;
    }
    return false;
  }

  getSelectionText() {
    var sel = this.win.getSelection().toString();
    return sel;
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
        range,
        ancestor,
        selectedTags = [],
        nodes,
        style,
        tags = [],
        i,
        div,
        partial = false,
        nodeCount = 0,
        ancestorTags = [];

    range = this.getSelectionRange(selection);
    ancestor = range.commonAncestorContainer;
    if (ancestor.nodeType === 3) {
      partial = true;
      ancestor = ancestor.parentNode;
      style = this.getElementDefaultDisplay(ancestor.tagName);
      while (style === 'inline') {
        ancestor = ancestor.parentNode;
        style = this.getElementDefaultDisplay(ancestor.tagName);
      }
      nodes = ancestor.getElementsByTagName("*");
    } else {
      div = this.doc.createElement('div');
      div.appendChild(range.cloneContents());
      nodes = div.childNodes;
      style = this.getElementDefaultDisplay(ancestor.tagName);
    }

    // find all the common parent tags within the element
    while (ancestor && ancestor !== toplevel) {
      ancestorTags.unshift(ancestor.tagName);
      ancestor = ancestor.parentNode;
    }

    for (i = 0; i < nodes.length; i++) {
      if (partial) {
        if (selection.containsNode(nodes[i], true) ) {
          selectedTags.push(nodes[i].tagName);
        }
      } else {
        if (nodes[i].nodeType === 3) {
          if (nodes[i].textContent.trim() !== '') {
            selectedTags = [];
            break;
          }
        } else {
          tags = this.allTagsWithinElement(nodes[i], [nodes[i].tagName]);
          nodeCount++;
          if (nodeCount === 1) {
            selectedTags = tags;
          } else {
            selectedTags = this.arrayIntersect(selectedTags, tags);
          }
        }
      }
    }

    return ancestorTags.concat(selectedTags);
  }

  arrayIntersect(a1, a2) {
    var i, aNew = [];

    for (i = 0; i < a1.length; i++) {
      if (aNew.indexOf(a1[i]) === -1 && a2.indexOf(a1[i]) !== -1) {
        aNew.push(a1[i]);
      }
    }
    return aNew;
  }

  allTagsWithinElement(el, tags) {
    var i, children, childTag, newTags = [];

    children = el.childNodes;
    if (children.length === 1 && children[0].nodeType === 3) {
      return tags;
    }
    for (i = 0; children && i < children.length; i++) {
      if (children[i].nodeType === 3) {
        if (children[i].textContent.trim() !== '') {
          newTags = [];
          children = false;
        }
      } else {
        childTag = children[i].tagName;
        if (tags.indexOf(childTag) === -1 && newTags.indexOf(childTag) === -1) {
          newTags.push(childTag);
          newTags = this.allTagsWithinElement(children[i], newTags);
        }
      }
    }

    return tags.concat(newTags);
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

  saveSelection(containerEl) {
    var range, preSelectionRange, start, selectedTextRange, preSelectionTextRange;

    if (this.doc.createRange) {
      range = this.win.getSelection().getRangeAt(0);
      preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerEl);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      start = preSelectionRange.toString().length;

      return {
          start: start,
          end: start + range.toString().length
      };
    }

    return false;
  }

  restoreSelection(containerEl, savedSel) {
    var charIndex, range, nodeStack, node, foundStart, stop, nextCharIndex, i, sel, textRange;

    if (this.doc.createRange) {
      charIndex = 0;
      range = this.doc.createRange();
      range.setStart(containerEl, 0);
      range.collapse(true);
      nodeStack = [containerEl];
      foundStart = false;
      stop = false;

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
},{}],7:[function(require,module,exports){
/*jshint -W032, esnext:true */ /* -W032 = ignore unnecessary semicolon */
/*globals module, require*/
var HtmlEditor = require("./js/CoreEditor");


function WysHtmlEditor(element, options) {
  'use strict';

  return new HtmlEditor(element, options);
}

module.exports = WysHtmlEditor;
},{"./js/CoreEditor":2}]},{},[1]);
