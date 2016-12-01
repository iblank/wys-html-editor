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
      var tags;
      
      // TODO: return wrapper tags from selection function instead...
      this.selText = (typeof text !== "undefined") ? text : this.selection.getSelectionHTML();
      tags = this.findTagWrappers(this.selText);

      this.highlightToolbarButtons(tags);
  }

  // matches the current tags from the selection against
  // the buttons in the toolbar
  highlightToolbarButtons(tags) {
    var i;
    
    // remove active class from all the buttons
    this.unHighlightToolbarButtons();
    for (i = 0; i < tags.length; i++) {
      // if the tag matches a button, set it to active
      if (tags[i] in this.buttonObjs) {
        Helper.addClass(this.buttonObjs[tags[i]], 'active');
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
    
    // update the toolbar buttons for current selection
    this.updateActiveToolbarButtons(text);

    if (text.length > 0 && !sameSelection) {
      // A text selection has been made!!!
      // TODO: show toolbar function...
      this.toolbarFocus = false;
      this.toolbar.style.display = 'block';
      this.setToolbarPos(this.selection.selectPos);
    } else {
      this.toolbar.style.display = 'none';
    }
    // this.selText = text;
  }

  // fires when keyboard key released
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

  // outputs the current value of the WYSIWYG to a pre tag
  updateValue() {
    var preElem = this.options['doc'].getElementById('output-code'),
        curVal = this.editor.innerHTML;

    preElem.innerText = curVal;
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
    if (this.options.disableShiftEnter && key === this.key.ENTER && event.shiftKey) {
      event.preventDefault();
    }
    // disable multiple empty lines
    if (this.options.disableMultiEmptyLines && key === this.key.ENTER && event.shiftKey === false) {
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