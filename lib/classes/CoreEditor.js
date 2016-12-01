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