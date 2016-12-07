/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module, console, window, document*/
'use strict';
class SelectionOld {
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

//   updateCursorPosition() {
//     var range, sel, rects, rightMax, leftMin, i;
//     range = this.doc.selection.createRange();
//     this.selectPos.x = range.boundingLeft;
//     this.selectPos.y = range.boundingTop;
//     this.selectPos.w = range.boundingWidth;
//     this.selectPos.h = range.boundingHeight;
//   }

//   updateSelectionElement() {
//     this.selectElem = this.getSelectionElement();
//   }

//   moveCursorToElement(element) {
//     var range, selection;
//     range = this.doc.body.createTextRange();//Create a range (a range is a like the selection but invisible)
//     range.moveToElementText(element);//Select the entire contents of the element with the range
//     range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
//     range.select();//Select the range (make it the visible selection
//   }

//   getSelectionObj() {
//     return this.doc.selection;
//   }

//   getSelectionRange(selection) {
//     var range;

//     range = selection.createRange();

//     if (range) {
//       // console.log(range);
//       return range;
//     }
//     return false;
//   }

//   getSelectionText() {
//     return this.doc.selection.createRange().text;
//   }

//   getElementDefaultDisplay(tag) {
//     var cStyle,
//         t = this.doc.createElement(tag),
//         gcs = "getComputedStyle" in this.win;

//     this.doc.body.appendChild(t);
//     cStyle = (gcs ? this.win.getComputedStyle(t, "") : t.currentStyle).display; 
//     this.doc.body.removeChild(t);

//     return cStyle;
//   }

//   getSelectionHierarchy(toplevel) {
//     var selection = this.getSelectionObj(),
//         range,
//         ancestor,
//         selectedTags = [],
//         nodes,
//         style,
//         tags = [],
//         i,
//         div,
//         partial = false,
//         nodeCount = 0,
//         ancestorTags = [];

//     // everything below depends on finding the range using getRangeAt
//     if (!selection.getRangeAt) {
//       return [];
//     }
//     range = selection.getRangeAt(0);
//     ancestor = range.commonAncestorContainer;
//     if (ancestor.nodeType === 3) {
//       partial = true;
//       ancestor = ancestor.parentNode;
//       style = this.getElementDefaultDisplay(ancestor.tagName);
//       while (style === 'inline') {
//         ancestor = ancestor.parentNode;
//         style = this.getElementDefaultDisplay(ancestor.tagName);
//       }
//       nodes = ancestor.getElementsByTagName("*");
//     } else {
//       div = this.doc.createElement('div');
//       div.appendChild(range.cloneContents());
//       nodes = div.childNodes;
//       style = this.getElementDefaultDisplay(ancestor.tagName);
//     }

//     // find all the common parent tags within the element
//     while (ancestor && ancestor !== toplevel) {
//       ancestorTags.unshift(ancestor.tagName);
//       ancestor = ancestor.parentNode;
//     }

//     for (i = 0; i < nodes.length; i++) {
//       if (partial) {
//         if (selection.containsNode(nodes[i], true) ) {
//           selectedTags.push(nodes[i].tagName);
//         }
//       } else {
//         if (nodes[i].nodeType === 3) {
//           if (nodes[i].textContent.trim() !== '') {
//             selectedTags = [];
//             break;
//           }
//         } else {
//           tags = this.allTagsWithinElement(nodes[i], [nodes[i].tagName]);
//           nodeCount++;
//           if (nodeCount === 1) {
//             selectedTags = tags;
//           } else {
//             selectedTags = this.arrayIntersect(selectedTags, tags);
//           }
//         }
//       }
//     }

//     return ancestorTags.concat(selectedTags);
//   }

//   arrayIntersect(a1, a2) {
//     var i, aNew = [];

//     for (i = 0; i < a1.length; i++) {
//       if (aNew.indexOf(a1[i]) === -1 && a2.indexOf(a1[i]) !== -1) {
//         aNew.push(a1[i]);
//       }
//     }
//     return aNew;
//   }

//   allTagsWithinElement(el, tags) {
//     var i, children, childTag, newTags = [];

//     children = el.childNodes;
//     if (children.length === 1 && children[0].nodeType === 3) {
//       return tags;
//     }
//     for (i = 0; children && i < children.length; i++) {
//       if (children[i].nodeType === 3) {
//         if (children[i].textContent.trim() !== '') {
//           newTags = [];
//           children = false;
//         }
//       } else {
//         childTag = children[i].tagName;
//         if (tags.indexOf(childTag) === -1 && newTags.indexOf(childTag) === -1) {
//           newTags.push(childTag);
//           newTags = this.allTagsWithinElement(children[i], newTags);
//         }
//       }
//     }

//     return tags.concat(newTags);
//   }

//   getSelectionHTML() {
//     var html = "", sel, container, i, sharedElems;
//     if (this.doc.selection.type === "Text") {
//         html = this.doc.selection.createRange().htmlText;
//     }
//     if (html.length > 0 && this.currentHTML !== html) {
//       this.currentHTML = html;
//     }
//     return html;
//   }

//   saveSelection(containerEl) {
//     var range, preSelectionRange, start, selectedTextRange, preSelectionTextRange;

//     selectedTextRange = this.doc.selection.createRange();
//     preSelectionTextRange = this.doc.body.createTextRange();
//     preSelectionTextRange.moveToElementText(containerEl);
//     preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
//     start = preSelectionTextRange.text.length;

//     return {
//         start: start,
//         end: start + selectedTextRange.text.length
//     };
//   }

//   restoreSelection(containerEl, savedSel) {
//     var charIndex, range, nodeStack, node, foundStart, stop, nextCharIndex, i, sel, textRange;

//     textRange = this.doc.body.createTextRange();
//     textRange.moveToElementText(containerEl);
//     textRange.collapse(true);
//     textRange.moveEnd("character", savedSel.end);
//     textRange.moveStart("character", savedSel.start);
//     textRange.select();
//   }

//   // http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
//   isOrContainsNode(ancestor, descendant) {
//     var node = descendant;
//     while (node) {
//       if (node === ancestor) {
//         return true;
//       }
//       node = node.parentNode;
//     }
//     return false;
//   }

//   isSelectionInside(containerNode, force) {
//     var sel, range, rangeContainer;
//     // selection inside editor?

//     sel = this.doc.selection;
//     // e.g. an image selected
//     if (sel.type === 'Control') {
//         // http://msdn.microsoft.com/en-us/library/ie/hh826021%28v=vs.85%29.aspx
//         range = sel.createRange();
//         // test only the first element
//         if (range.length !== 0 && this.isOrContainsNode(containerNode,range(0))) {
//             return true;
//         }
//         // if (sel.type === 'Text' || sel.type === 'None')
//     } else {
//         // Range of container
//         // http://stackoverflow.com/questions/12243898/how-to-select-all-text-in-contenteditable-div
//         rangeContainer = this.doc.body.createTextRange();
//         rangeContainer.moveToElementText(containerNode);
//         // Compare with selection range
//         range = sel.createRange();
//         if (rangeContainer.inRange(range)) {
//             return true;
//         }
//     }
//     // selection at least partly outside editor
//     if (!force) {
//         return false;
//     }
//     // force selection to editor
//     // http://stackoverflow.com/questions/12243898/how-to-select-all-text-in-contenteditable-div
//     range = this.doc.body.createTextRange();
//     range.moveToElementText(containerNode);
//     range.setEndPoint('StartToEnd',range); // collapse
//     range.select();

//     return true;
//   }

//   getBaseChildSelectionElement(isStart, container) {
//     var selEl = this.getSelectionElement(isStart);

//     while (selEl) {
//       if (selEl.parentNode === container) {
//         return selEl;
//       }
//       selEl = selEl.parentNode;
//     }
//   }

//   // get the parent element of the current selection
//   getSelectionElement(isStart) {
//     var sel = this.getSelectionObj(),
//         range = this.getSelectionRange(sel),
//         container;
    
//     range.collapse(isStart);
//     return range.parentElement();
//   }
};

module.exports = SelectionOld;