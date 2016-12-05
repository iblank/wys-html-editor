(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*global require*/
var wyshtml = require("../lib/wys-html-editor");

var elem = document.getElementById('wyseditor'),
    editor = new wyshtml(elem);

},{"../lib/wys-html-editor":5}],2:[function(require,module,exports){
/*jshint -W032, esnext:true */ /* ignore unnecessary semicolon */
/*globals module, require, console, window, document, setTimeout*/
'use strict';
var Helper = require("./classes/Helper"),
    Selections = require("./classes/Selection");

class HtmlEditor {
  constructor(e, o) {
    var doc = (typeof document === 'undefined') ? {} : document,
        defaults = {
          'doc' : doc,
          'disableMultiEmptyLines' : true,
          'disableShiftEnter' : true,
          'toolbar' : ['b', 'i', 'ul', 'ol', 'indent', 'outdent'],
          'classPrefix' : 'wys-editor-'
        };

    // initialize the parent element, selection and options
    this.parentElem = e;
    this.selection = new Selections();
    this.options = Helper.objOverrideValues(defaults, o);

    // then initialize all the other properties
    this.init();
  }

  init() {
    var context = this,
        buttons,
        cleanedHTML;

    this.blockTags = ['p', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
    this.inlineTags = ['span', 'b', 'strong', 'i', 'em'];
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
      cleanedHTML = this.cleanHTML(this.parentElem);
      this.editor.innerHTML = cleanedHTML;
    }
    this.parentElem.innerHTML = '';
    this.parentElem.appendChild(this.editor);
    this.parentElem.appendChild(this.toolbar);

    this.addEventListeners();
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
      context.updateValue();
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
        this.replaceDomTags(this.editor, 'b', 'strong');
        this.removeEmptyDomTags(this.editor, 'strong');
        this.selection.restoreSelection(this.editor, savedSel);
        this.updateActiveToolbarButtons(); // highlight/unhighlight buttons
        break;
      case 'em':
        this.execCommand('italic');
        savedSel = this.selection.saveSelection(this.editor);
        this.replaceDomTags(this.editor, 'i', 'em');
        this.removeEmptyDomTags(this.editor, 'em');
        this.selection.restoreSelection(this.editor, savedSel);
        this.updateActiveToolbarButtons(); // highlight/unhighlight buttons
        break;
      case 'ul':
        this.execCommand('insertUnorderedList');
        // this.replaceDomTags(this.editor, 'i', 'em');
        // this.removeEmptyDomTags(this.editor, 'em');
        // this.selection.restoreSelection(this.editor, savedSel);
        break;
      case 'ol':
        this.execCommand('insertOrderedList');
        // this.replaceDomTags(this.editor, 'i', 'em');
        // this.removeEmptyDomTags(this.editor, 'em');
        // this.selection.restoreSelection(this.editor, savedSel);
        break;
    }

    this.updateValue();
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
    var newHTML = '', children, i;

    // if type is textNode return it
    if (node.nodeType === 3) {
      return node.textContent;
    }
    children = node.childNodes;

    for (i = 0; i < children.length; i++) {
      newHTML+= this.cleanInternalChild(children[i], tag);
    }

    return newHTML;
  }

  // Deep dives into a DOM node to return innerHTML with approved inline tags,
  // or specified block tags
  cleanInternalChild(child, tag) {
    var childTag = (child.tagName) ? child.tagName.toLowerCase() : 'textnode',
        tagBlock = false,
        internalHTML;

    // Check special case tags, with strict dependencies
    if (tag === 'ul' || tag === 'ol') {
      // everything except empty textnodes (ignored) get wrapped in li tag
      if (childTag !== 'textnode' || (childTag === 'textnode' && child.textContent.trim() !== '')) {
        childTag = 'li';
      }
      tagBlock = true;
    } else if (tag === 'li') {
      if (this.inlineTags.indexOf(childTag) === -1 && childTag !== 'ul' && childTag !== 'ol') {
        childTag = 'none';
      }
    } else if (tag === 'blockquote') {
      if (childTag !== 'p' && childTag !== 'footer') {
        childTag = 'p';
      }
      tagBlock = true;
    } else if (tag === 'footer' && childTag !== 'cite') {
      childTag = 'cite';
      tagBlock = true;
    } else if (this.inlineTags.indexOf(childTag) === -1 && childTag !== 'textnode') {
      childTag = 'none';
    }

    // check for non-wrapped html
    if (childTag === 'textnode') {
      // do not include textnodes as direct descendants of block elements
      // where they're not allowed (ul, ol, blockquote, footer, etc.)
      if (!tagBlock) {
        return child.textContent;
      }
      return '';
    // if child tag not allowed, throw out tag and dig deeper
    } else if (childTag === 'none') {
      return this.cleanInternal(child, childTag);
    }

    // if it is an allowed tag, wrap in that tag and dig deeper
    internalHTML = this.cleanInternal(child, childTag);
    return '<' + childTag + '>' + internalHTML + '</' + childTag + '>';
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
    var newnode = this.options['doc'].createElement(newtag), i;

    // Copy the children
    while (oldnode.firstChild) {
      newnode.appendChild(oldnode.firstChild); // *Moves* the child
    }

    // Copy the attributes
    for (i = oldnode.attributes.length - 1; i >= 0; i--) {
      newnode.attributes.setNamedItem(oldnode.attributes[i].cloneNode());
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

    if (this.isEmptyPara(this.selection.selectElem)) {
      top = this.selection.selectElem.offsetTop - tb_height;
      left = this.selection.selectElem.offsetLeft - (tb_width / 2);
    }

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

  // check the current text selection to see what tags are within it
  updateActiveToolbarButtons(text) {
      var tags, sharedHierarchy;
      
      // TODO: return wrapper tags from selection function instead...
      this.selText = (typeof text !== "undefined") ? text : this.selection.getSelectionHTML();
      sharedHierarchy = this.selection.getSelectionHierarchy(this.editor);
      // console.log(sharedHierarchy);
      // tags = this.findTagWrappers(this.selText);

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

  // TODO: replace with selection class function
  findTagWrappers(html) {
    var div = this.options['doc'].createElement('div'),
        nodes,
        node,
        wrappers = [];
    html = html.trim();
    
    div.innerHTML = html;
    nodes = div.childNodes;
    
    // while there is a single tag that wraps the entire selection
    while (nodes.length === 1) {
      node = nodes[0];
      // isn't a textnode
      if (node.nodeType !== 3) {
        wrappers.push(node.tagName.toLowerCase());
        nodes = node.childNodes;
      } else {
        break;
      }
    }

    return wrappers;
  }

  // fires whenever text is selected in the editor
  textSelection() {
    var text = this.selection.getSelectionHTML(),
        tags,
        sameSelection = (this.selText === text);

    if (text.length > 0 && !sameSelection) {
      // A text selection has been made!!!
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
    var preElem = this.options['doc'].getElementById('output-code'),
        curVal = this.editor.innerHTML;

    if (preElem) {
      preElem.innerText = curVal;
    }
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
    if (window.getSelection) {
      // Buggy, call within 'try/catch'
      try {
        if (this.options['doc'].queryCommandSupported && !this.options['doc'].queryCommandSupported(command)) {
          return false;
        }
        return this.options['doc'].execCommand(command, false, param);
      } catch(e) {}
    // for IE
    } else if (this.options['doc'].selection) {
      var sel = this.options['doc'].selection;
      if (sel.type !== 'None') {
        var range = sel.createRange();
        // Buggy, call within 'try/catch'
        try {
          if(!range.queryCommandEnabled(command)) {
            return false;
          }
          return range.execCommand(command, false, param);
        } catch(e) {}
      }
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
      if (this.isEmptyPara(selElem)) {
        event.preventDefault();
      } else if (nextSib && this.isEmptyPara(nextSib)) {
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

  // returns the current set of options
  getOptions() {
    return this.options;
  }
};

module.exports = HtmlEditor;
},{"./classes/Helper":3,"./classes/Selection":4}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module, console, window, document*/
'use strict';
class Selection {
  constructor() {
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
    if (document.selection) {
      range = document.selection.createRange();
      this.selectPos.x = range.boundingLeft;
      this.selectPos.y = range.boundingTop;
      this.selectPos.w = range.boundingWidth;
      this.selectPos.h = range.boundingHeight;
    } else if (window.getSelection) {
      sel = window.getSelection();
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
  }

  updateSelectionElement() {
    this.selectElem = this.getSelectionElement();
  }

  moveCursorToElement(element) {
    var range, selection;
    if(document.createRange) {
      range = document.createRange();//Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(element);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      selection = window.getSelection();//get the selection object (allows you to change selection)
      selection.removeAllRanges();//remove any selections already made
      selection.addRange(range);//make the range you have just created the visible selection
    } else if(document.selection) { 
      range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
      range.moveToElementText(element);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      range.select();//Select the range (make it the visible selection
    }
  }

  getSelectionObj() {
    if (document.selection) {
      return document.selection;
    }
    return window.getSelection();
  }

  getSelectionRange(selection) {
    var range;

    if (document.selection) {
      range = selection.createRange();
    } else {
      if (selection.getRangeAt) {
        if (selection.rangeCount > 0) {
          range = selection.getRangeAt(0);
        }
      } else {
        // Old WebKit
        range = document.createRange();
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.setEnd(selection.focusNode, selection.focusOffset);

        // Handle the case when the selection was selected backwards (from the end to the start in the document)
        if (range.collapsed !== selection.isCollapsed) {
          range.setStart(selection.focusNode, selection.focusOffset);
          range.setEnd(selection.anchorNode, selection.anchorOffset);
        }
      }
    }

    if (range) {
      // console.log(range);
      return range;
    }
    return false;
  }

  getSelectionText() {
    var sel = document.selection ? document.selection.createRange().text : window.getSelection().toString();
    return sel;
  }

  getElementDefaultDisplay(tag) {
    var cStyle,
        t = document.createElement(tag),
        gcs = "getComputedStyle" in window;

    document.body.appendChild(t);
    cStyle = (gcs ? window.getComputedStyle(t, "") : t.currentStyle).display; 
    document.body.removeChild(t);

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

    // everything below depends on finding the range using getRangeAt
    if (!selection.getRangeAt) {
      return [];
    }
    range = selection.getRangeAt(0);
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
      div = document.createElement('div');
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

  // getSharedElementParents(selection, range) {
  //   var ancestor = range.commonAncestorContainer,
  //       allSelected = [],
  //       nodes,
  //       style,
  //       tags = [],
  //       i,
  //       div,
  //       partial = false,
  //       nodeCount = 0,
  //       addTag = [];

  //   if (ancestor.nodeType === 3) {
  //     partial = true;
  //     ancestor = ancestor.parentNode;
  //     style = this.getElementDefaultDisplay(ancestor.tagName);
  //     while (style === 'inline') {
  //       ancestor = ancestor.parentNode;
  //       style = this.getElementDefaultDisplay(ancestor.tagName);
  //     }
  //     nodes = ancestor.getElementsByTagName("*");
  //   } else {
  //     div = document.createElement('div');
  //     div.appendChild(range.cloneContents());
  //     nodes = div.childNodes;
  //     style = this.getElementDefaultDisplay(ancestor.tagName);
  //     addTag = (style === 'inline') ? [ancestor.tagName] : [];
  //   }

  //   for (i = 0; i < nodes.length; i++) {
  //     if (partial) {
  //       if (selection.containsNode(nodes[i], true) ) {
  //         allSelected.push(nodes[i].tagName);
  //       }
  //     } else {
  //       if (nodes[i].nodeType === 3) {
  //         if (nodes[i].textContent.trim() !== '') {
  //           allSelected = [];
  //           break;
  //         }
  //       } else {
  //         tags = this.allTagsWithinElement(nodes[i], [nodes[i].tagName]);
  //         nodeCount++;
  //         if (nodeCount === 1) {
  //           allSelected = tags;
  //         } else {
  //           allSelected = this.arrayIntersect(allSelected, tags);
  //         }
  //       }
  //     }
  //   }

  //   return allSelected.concat();
  // }

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
    if (typeof window.getSelection !== "undefined") {
      sel = window.getSelection();
      if (sel.rangeCount) {
        container = document.createElement("div");
        for (i = 0; i < sel.rangeCount; ++i) {
          container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        html = container.innerHTML;
      }
    } else if (typeof document.selection !== "undefined") {
      if (document.selection.type === "Text") {
        html = document.selection.createRange().htmlText;
      }
    }
    if (html.length > 0 && this.currentHTML !== html) {
      this.currentHTML = html;
    }
    return html;
  }

  saveSelection(containerEl) {
    var range, preSelectionRange, start, selectedTextRange, preSelectionTextRange;
    if (window.getSelection && document.createRange) {
      range = window.getSelection().getRangeAt(0);
      preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerEl);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      start = preSelectionRange.toString().length;

      return {
          start: start,
          end: start + range.toString().length
      };
    } else if (document.selection) {
      selectedTextRange = document.selection.createRange();
      preSelectionTextRange = document.body.createTextRange();
      preSelectionTextRange.moveToElementText(containerEl);
      preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
      start = preSelectionTextRange.text.length;

      return {
          start: start,
          end: start + selectedTextRange.text.length
      };
    }
  }

  restoreSelection(containerEl, savedSel) {
    var charIndex, range, nodeStack, node, foundStart, stop, nextCharIndex, i, sel, textRange;
    if (window.getSelection && document.createRange) {
      charIndex = 0;
      range = document.createRange();
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

      sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (document.selection) {
      textRange = document.body.createTextRange();
      textRange.moveToElementText(containerEl);
      textRange.collapse(true);
      textRange.moveEnd("character", savedSel.end);
      textRange.moveStart("character", savedSel.start);
      textRange.select();
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
    if (window.getSelection) {
      sel = window.getSelection();
      if (this.isOrContainsNode(containerNode,sel.anchorNode) && this.isOrContainsNode(containerNode,sel.focusNode)) {
        return true;
      }
      // selection at least partly outside editor
      if (!force) {
        return false;
      }
      // force selection to editor
      range = document.createRange();
      range.selectNodeContents(containerNode);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (document.selection) {
      sel = document.selection;
      // e.g. an image selected
      if (sel.type === 'Control') {
        // http://msdn.microsoft.com/en-us/library/ie/hh826021%28v=vs.85%29.aspx
        range = sel.createRange();
        // test only the first element
        if (range.length !== 0 && this.isOrContainsNode(containerNode,range(0))) {
          return true;
        }
      // if (sel.type === 'Text' || sel.type === 'None')
      } else {
        // Range of container
        // http://stackoverflow.com/questions/12243898/how-to-select-all-text-in-contenteditable-div
        rangeContainer = document.body.createTextRange();
        rangeContainer.moveToElementText(containerNode);
        // Compare with selection range
        range = sel.createRange();
        if (rangeContainer.inRange(range)) {
          return true;
        }
      }
      // selection at least partly outside editor
      if (!force) {
        return false;
      }
      // force selection to editor
      // http://stackoverflow.com/questions/12243898/how-to-select-all-text-in-contenteditable-div
      range = document.body.createTextRange();
      range.moveToElementText(containerNode);
      range.setEndPoint('StartToEnd',range); // collapse
      range.select();
    }
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
    
    if (document.selection) {
      range.collapse(isStart);
      return range.parentElement();
    } else {
      if (range) {
        container = range[isStart ? "startContainer" : "endContainer"];

        // Check if the container is a text node and return its parent if so
        return container.nodeType === 3 ? container.parentNode : container;
      }
    }

    return false;
  }
};

module.exports = Selection;
},{}],5:[function(require,module,exports){
/*jshint -W032, esnext:true */ /* -W032 = ignore unnecessary semicolon */
/*globals module, require*/
var HtmlEditor = require("./js/CoreEditor");


function WysHtmlEditor(element, options) {
  'use strict';

  return new HtmlEditor(element, options);
}

module.exports = WysHtmlEditor;
},{"./js/CoreEditor":2}]},{},[1]);
