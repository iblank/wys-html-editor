(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*global require*/
var wyshtml = require("../lib/wys-html-editor");

var elem = document.getElementById('wyseditor'),
    editor = new wyshtml(elem);

},{"../lib/wys-html-editor":5}],2:[function(require,module,exports){
/*jshint -W032, esnext:true */ /* ignore unnecessary semicolon */
/*globals module, require, console, window, document, setTimeout*/
'use strict';
var Helper = require("./Helper"),
    Selections = require("./Selection");

class HtmlEditor {
  constructor(e, o) {
    var defaults = {
          'disableMultiEmptyLines' : true,
          'disableShiftEnter' : true,
          'toolbar' : ['b', 'i', 'ul', 'ol', 'indent', 'outdent']
        };

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

    this.buttonClassPrefix = 'wys-tb-';
    this.parentElem = e;
    this.options = Helper.mergeObjs(defaults, o);
    if (!this.options.doc) {
      this.options['doc'] = document;
    }
    this.selection = new Selections();
    this.events = [];
    this.selText = '';
    this.toolbarFocus = false;
    this.key = {
      'ENTER': 13,
      'ARROWUP': 38,
      'ARROWDOWN': 40,
      'ARROWLEFT': 37,
      'ARROWRIGHT': 39
    };

    this.init();
  }

  init() {
    var context = this,
        buttons,
        cleanedHTML;

    this.editor = this.options['doc'].createElement('div');
    this.editor.setAttribute('contentEditable', true);
    this.editor.classList.add('wys-html-editor-element');
    this.editor.setAttribute('role', 'textbox');
    this.editor.setAttribute('aria-multiline', true);
    
    this.toolbar = this.options['doc'].createElement('div');
    this.toolbar.classList.add('wys-html-editor-toolbar');
    this.createToolbarButtons();
    
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
        ul.appendChild(this.createButton(btns[i]));
      }
    }

    this.toolbar.appendChild(ul);
  }

  createButton(btn) {
    var li = this.options['doc'].createElement('li'),
        btnNode = this.options['doc'].createElement('button'),
        context = this;

    btnNode.setAttribute('class', this.buttonClassPrefix + this.buttonMap[btn][2]);
    btnNode.innerHTML = this.buttonMap[btn][1];

    btnNode.addEventListener("click", function(event) {
      context.toolbarButtonClick(event.target.className);
    }, false);

    this.buttonObjs[this.buttonMap[btn][2]] = btnNode;

    li.appendChild(btnNode);

    return li;
  }

  toolbarButtonClick(btnclass) {
    var savedSel;
    
    // find className that starts with "wys-tb-" (buttonClassPrefix)
    btnclass = Helper.findWordWithPrefix(this.buttonClassPrefix, btnclass);

    switch (btnclass) {
      case 'strong':
        this.execCommand('bold');
        savedSel = this.selection.saveSelection(this.editor);
        this.replaceDomTags(this.editor, 'b', 'strong');
        this.removeEmptyDomTags(this.editor, 'strong');
        this.selection.restoreSelection(this.editor, savedSel);
        this.updateActiveToolbarButtons();
        break;
      case 'em':
        this.execCommand('italic');
        savedSel = this.selection.saveSelection(this.editor);
        this.replaceDomTags(this.editor, 'i', 'em');
        this.removeEmptyDomTags(this.editor, 'em');
        this.selection.restoreSelection(this.editor, savedSel);
        this.updateActiveToolbarButtons();
        break;
      case 'list':
        this.execCommand('insertUnorderedList');
        // this.replaceDomTags(this.editor, 'i', 'em');
        // this.removeEmptyDomTags(this.editor, 'em');
        // this.selection.restoreSelection(this.editor, savedSel);
        break;
      case 'ordered-list':
        this.execCommand('insertOrderedList');
        // this.replaceDomTags(this.editor, 'i', 'em');
        // this.removeEmptyDomTags(this.editor, 'em');
        // this.selection.restoreSelection(this.editor, savedSel);
        break;
    }

    this.updateValue();
  }

  cleanHTML(dom) {
    var i, nodes, content, newHTML = '', tag, internalHTML;

    this.replaceDomTags(dom, 'b', 'strong');
    this.replaceDomTags(dom, 'i', 'em');
    nodes = dom.childNodes;
    for (i = 0; i < nodes.length; i++) {
      content = nodes[i].textContent.replace(/\s+/g, "");
      if (content !== "" && nodes[i].tagName) {
        tag = nodes[i].tagName.toLowerCase();
        
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

  cleanInternalChild(child, tag) {
    var childTag = (child.tagName) ? child.tagName.toLowerCase() : 'textnode',
        tagBlock = false,
        internalHTML;

    if (tag === 'ul' || tag === 'ol') {
      if (childTag !== 'textnode') {
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

    // if the child node has no tagName just include text
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

  removeEmptyDomTags(node, tag) {
    var elems = node.getElementsByTagName(tag), i, inner;

    for (i = elems.length - 1; i >= 0; i--) {
      inner = elems[i].textContent;
      if (inner.trim() === '') {
        node.removeChild(elems[i]);
      }
    }
  }

  replaceDomTags(node, oldtag, newtag) {
    var elems = node.getElementsByTagName(oldtag), i;

    for (i = elems.length - 1; i >= 0; i--) {
      this.swapTags(elems[i], newtag);
    }
  }

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

  removeEmptyTags(html, tag) {
    var newHTML = html.replace(/<strong>\s+<\/strong>/g, '\n');

    return newHTML;
  }

  replaceTags(html, find, replace) {
    // var regex = new RegExp("(<\\s*\/?\\s*)" + find + "(\\s*([^>]*)?\\s*>)", "gi"),
    var regex = new RegExp("(<\/?\\s*)" + find + "(\\s|>)", "gi"),
        newHTML = html.replace(regex,'$1' + replace + '$2');

    return newHTML;
  }

  addButtonListener(button) {
    var context = this;
    button.addEventListener("click", function(event) {
      context.execBold();
      context.updateValue();
    }, false);
  }

  checkOnBlur(event) {
    if (this.toolbar.style.display === 'block' && !this.toolbarFocus) { 
      this.toolbar.style.display = 'none';
    }
  }

  setToolbarPos(dims) {
    var tb_width = this.toolbar.offsetWidth,
        tb_height = this.toolbar.offsetHeight + 8,
        top = dims.y - tb_height,
        left = dims.x + (dims.w / 2) - (tb_width / 2);

    if (this.isEmptyPara(this.selection.selectElem)) {
      top = this.selection.selectElem.offsetTop - tb_height;
      left = this.selection.selectElem.offsetLeft - (tb_width / 2);
    }
    if (left < 0) {
      left = 0;
    }
    if (top < 0) {
      top = 0;
    }
    this.toolbar.style.top = top+'px';
    this.toolbar.style.left = left+'px';
  }

  isEmpty(el) {
    var text = el.textContent || el.innerText || "";
    return text.trim() === "";
  }

  isEmptyPara(el) {
    var empty = this.isEmpty(el);
    return empty && el.tagName.toLowerCase() === 'p';
  }

  updateActiveToolbarButtons(text) {
      var tags;
      
      this.selText = (typeof text !== "undefined") ? text : this.selection.getSelectionHTML();
      tags = this.findTagWrappers(this.selText);
      this.highlightToolbarButtons(tags);
  }

  highlightToolbarButtons(tags) {
    var i;
    
    this.unHighlightToolbarButtons();
    for (i = 0; i < tags.length; i++) {
      if (tags[i] in this.buttonObjs) {
        Helper.addClass(this.buttonObjs[tags[i]], 'active');
      }
    }
  }

  unHighlightToolbarButtons() {
    var i;

    for (i in this.buttonObjs) {
      Helper.removeClass(this.buttonObjs[i], 'active');
    }
  }

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

  textSelection() {
    var text = this.selection.getSelectionHTML(),
        tags,
        sameSelection = (this.selText === text);
    
    this.updateActiveToolbarButtons(text);
    if (text.length > 0 && !sameSelection) {
      // A selection has been made!!!
      this.toolbarFocus = false;
      this.toolbar.style.display = 'block';
      this.setToolbarPos(this.selection.selectPos);
    } else {
      this.toolbar.style.display = 'none';
    }
    // this.selText = text;
  }

  checkKeyUp(event) {
    var key = event.which || event.keyCode;
    // shift+arrow selections
    if (event.shiftKey &&
        (key === this.key.ARROWUP ||
        key === this.key.ARROWDOWN ||
        key === this.key.ARROWLEFT ||
        key === this.key.ARROWRIGHT)) {
        this.textSelection();
    }
  }

  execBold() {
    var savedSel = this.selection.saveSelection(this.editor);

    this.execCommand('bold');
    this.replaceDomTags(this.editor, 'b', 'strong');
    this.removeEmptyDomTags(this.editor, 'strong');
    this.selection.restoreSelection(this.editor, savedSel);
    // curVal = this.editor.innerHTML;
    // curVal = this.replaceTags(curVal, 'b', 'strong');
    // curVal = this.removeEmptyTags(curVal, 'strong');

    // this.changeEditorHTML(curVal);
  }

  updateValue() {
    var preElem = this.options['doc'].getElementById('output-code'),
        curVal = this.editor.innerHTML;

    preElem.innerText = curVal;
  }

  changeEditorHTML(html) {
    var savedSel = this.selection.saveSelection(this.editor);
    this.editor.innerHTML = html;
    this.selection.restoreSelection(this.editor, savedSel);
  }

  // exec command
  // https://developer.mozilla.org/en-US/docs/Web/API/document.execCommand
  // http://www.quirksmode.org/dom/execCommand.html
  execCommand(command, param, force_selection) {
    // give selection to contenteditable element
    // restoreSelection(this.editor, popup_saved_selection);
    // tried to avoid forcing focus(), but ... - https://github.com/wysiwygjs/wysiwyg.js/issues/51
    this.editor.focus();
    // returns 'selection inside editor'
    if (!this.selection.isSelectionInside(this.editor, force_selection)) {
      return false;
    }
    
    // for webkit, mozilla, opera
    if(window.getSelection) {
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


  checkKeyDown(event) {
    var key = event.which || event.keyCode;
    // disable shift+enter
    if (this.options.disableShiftEnter && key === this.key.ENTER && event.shiftKey) {
      event.preventDefault();
    }
    // disable multiple empty lines
    if (this.options.disableMultiEmptyLines && key === this.key.ENTER && event.shiftKey === false) {
      var selElem = this.selection.getBaseChildSelectionElement(true, this.editor),
          nextSib = selElem.nextElementSibling;
      
      if (this.isEmptyPara(selElem)) {
        // current element is an empty paragraph
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

  getElement() {
    return this.editor;
  }

  getOptions() {
    return this.options;
  }
};

module.exports = HtmlEditor;
},{"./Helper":3,"./Selection":4}],3:[function(require,module,exports){
/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module*/
'use strict';
class Helper {
  static mergeObjs(obj1, obj2) {
    var obj3 = {},
        attrname;

    for (attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }

  static hasClass(el, className) {
    var reg;

    if (el.classList) {
      return el.classList.contains(className);
    } else {
      reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      return !!el.className.match(reg);
    }
  }

  static addClass(el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else if (!this.hasClass(el, className)) {
      el.className += ' ' + className;
    }
  }

  static removeClass(el, className) {
    var reg;

    if (el.classList) {
      el.classList.remove(className);
    } else if (this.hasClass(el, className)) {
      reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      el.className = el.className.replace(reg, ' ');
    }
  }

  static toggleClass(el, className) {
    if (this.hasClass(el, className)) {
      this.removeClass(el, className);
    } else {
      this.addClass(el, className);
    }
  }

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
      // range.collapse(true);
      this.selectPos.x = range.boundingLeft;
      this.selectPos.y = range.boundingTop;
      this.selectPos.w = range.boundingWidth;
      this.selectPos.h = range.boundingHeight;
    } else if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount) {
        range = sel.getRangeAt(0).cloneRange();
        if (range.getClientRects) {
          // range.collapse(true);
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

  getSelectionRange() {
    var range, sel;
    if (document.selection) {
      range = document.selection.createRange();
    } else {
      sel = window.getSelection();
      if (sel.getRangeAt) {
        if (sel.rangeCount > 0) {
          range = sel.getRangeAt(0);
        }
      } else {
        // Old WebKit
        range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset);
        range.setEnd(sel.focusNode, sel.focusOffset);

        // Handle the case when the selection was selected backwards (from the end to the start in the document)
        if (range.collapsed !== sel.isCollapsed) {
          range.setStart(sel.focusNode, sel.focusOffset);
          range.setEnd(sel.anchorNode, sel.anchorOffset);
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

  getSharedElementParents(selection, range) {
    var ancestor = range.commonAncestorContainer,
        allSelected = [],
        nodes,
        style,
        tags = [],
        allTags = [],
        contents,
        i,
        div,
        partial = false,
        nodeCount = 0,
        addTag = [];

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
      addTag = (style === 'inline') ? [ancestor.tagName] : [];
    }

    for (i = 0; i < nodes.length; i++) {
      if (partial) {
        if (selection.containsNode(nodes[i], true) ) {
          allSelected.push(nodes[i].tagName);
        }
      } else {
        if (nodes[i].nodeType === 3) {
          if (nodes[i].textContent.trim() !== '') {
            allSelected = [];
            break;
          }
        } else {
          tags = this.allTagsWithinElement(nodes[i], [nodes[i].tagName]);
          nodeCount++;
          if (nodeCount === 1) {
            allSelected = tags;
          } else {
            allSelected = this.arrayIntersect(allSelected, tags);
          }
        }
      }
    }

    return allSelected.concat(addTag);
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
    if (typeof window.getSelection !== "undefined") {
      sel = window.getSelection();
      if (sel.rangeCount) {
        container = document.createElement("div");
        for (i = 0; i < sel.rangeCount; ++i) {
          // sharedElems = this.getSharedElementParents(sel, sel.getRangeAt(i));
          // console.log('shared: ' + sharedElems);
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
    var range = this.getSelectionRange(),
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
var HtmlEditor = require("./classes/CoreEditor");


function WysHtmlEditor(element, options) {
  'use strict';

  return new HtmlEditor(element, options);
}

module.exports = WysHtmlEditor;
},{"./classes/CoreEditor":2}]},{},[1]);
