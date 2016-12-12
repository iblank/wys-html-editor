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