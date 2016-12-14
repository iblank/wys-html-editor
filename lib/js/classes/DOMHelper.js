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