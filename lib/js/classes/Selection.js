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