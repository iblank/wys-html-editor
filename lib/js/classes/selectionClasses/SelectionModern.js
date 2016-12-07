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