/*jslint browser:true */
'use strict';

var Selection = require("../lib/js/classes/selectionClasses/SelectionModern"),
    MockBrowser = require('mock-browser').mocks.MockBrowser,
    sinon = require("sinon"),
    sandbox;

exports['SelectionModern'] = {
  selection: {},
  win: {},
  doc: {},
  setUp: function(done) {
    var mockBrow = new MockBrowser(),
        window = mockBrow.getWindow(),
        document = mockBrow.getDocument();

    window.getSelection = function() {};
    document.createRange = function() {};
    this.win = window;
    this.doc = document;
    this.selection = new Selection(window, document);
    sandbox = sinon.sandbox.create();
    done();
  },
  tearDown: function(done) {
    sandbox.restore();
    done();
  },
  // updateCursorPosition
  'update position coordinates based on the cursor': function(test) {
    var rects = [{ top: 10, right: 40, bottom: 30, left: 10 }],
        expect = { x: 10, y: 10, w: 30, h: 20 },
        rangeObj = {
            getClientRects: function() {
                return rects;
            }
        },
        selObj = {
            rangeCount: 1,
            getRangeAt: function() {
                return {
                    cloneRange: function() {
                        return rangeObj;
                    }
                };
            }
        },
        rangeStub = sandbox.spy(rangeObj, 'getClientRects'),
        rangeAtStub = sandbox.spy(selObj, 'getRangeAt');
    
    sandbox.stub(this.win, 'getSelection').returns(selObj);
    this.selection.updateCursorPosition();
    
    test.expect(3);
    test.ok(rangeStub.calledOnce);
    test.ok(rangeAtStub.calledOnce);
    test.deepEqual(this.selection.selectPos, expect);
    test.done();
  },
  // updateSelectionElement
  'update the selection element stored on the class': function(test) {
      var getElStub = sandbox.stub(this.selection, 'getSelectionElement');

      this.selection.updateSelectionElement();
      test.expect(1);
      test.ok(getElStub.calledOnce);
      test.done();
  },
  // moveCursorToElement
  'move the cursor to DOM element': function(test) {
    var rangeObj = {
          selectNodeContents: function() {},
          collapse: function() {}
        },
        selObj = {
          removeAllRanges: function() {},
          addRange: function() {}
        },
        addRangeStub = sandbox.stub(selObj, 'addRange');

    sandbox.stub(this.doc, 'createRange').returns(rangeObj);
    sandbox.stub(this.win, 'getSelection').returns(selObj);
    this.selection.moveCursorToElement();
    test.expect(1);
    test.ok(addRangeStub.calledOnce);
    test.done();
  },
  // getSelectionObj
  'returns the window.getSelection object': function(test) {
      var getSelStub = sandbox.stub(this.win, 'getSelection');

      this.selection.getSelectionObj();
      test.expect(1);
      test.ok(getSelStub.calledOnce);
      test.done();
  },
  // getSelectionRange
  'returns the range object based on the selection given': function(test) {
      var selObj = {
            getRangeAt: function() {},
            rangeCount: 1
          },
          getSelStub = sandbox.stub(selObj, 'getRangeAt');

      this.selection.getSelectionRange(selObj);
      test.expect(1);
      test.ok(getSelStub.calledOnce);
      test.done();
  },
  // getSelectionRange
  'returns the range object when getRangeAt not available': function(test) {
      var selObj = {
            isCollapsed: true
          },
          rangeObj = {
            setStart: function() {},
            setEnd: function() {},
            collapsed: false
          },
          startStub = sandbox.stub(rangeObj, 'setStart'),
          endStub = sandbox.stub(rangeObj, 'setEnd');

      sandbox.stub(this.doc, 'createRange').returns(rangeObj);
      this.selection.getSelectionRange(selObj);
      test.expect(2);
      test.ok(startStub.calledTwice);
      test.ok(endStub.calledTwice);
      test.done();
  },
  // getSelectionText
  'returns the string value of the current selection': function(test) {
    var selObj = {
          toString: function() {}
        },
        result;

    sandbox.stub(this.win, 'getSelection').returns(selObj);
    sandbox.stub(selObj, 'toString').returns('this is the string');
    result = this.selection.getSelectionText();
    test.expect(1);
    test.equal(result, 'this is the string');
    test.done();
  },
  // getElementDefaultDisplay
  'returns the default display style of the given tag, when getComputedStyle not available': function(test) {
    var result;

    result = this.selection.getElementDefaultDisplay('p');
    test.expect(1);
    test.equal(result, 'block');
    test.done();
  },
  // getElementDefaultDisplay
  'returns the default display style of the given tag': function(test) {
    var styleStub,
        styleObj = {
          display: 'inline'
        },
        result;
    
    this.win.getComputedStyle = function() {};
    styleStub = sandbox.stub(this.win, 'getComputedStyle').returns(styleObj);
    result = this.selection.getElementDefaultDisplay('em');
    test.expect(2);
    test.ok(styleStub.calledOnce);
    test.equal(result, 'inline');
    test.done();
  },
  // getSelectionHierarchy
  'returns a tag hierarchy array, when ancestor is a textnode': function(test) {
    var html = '<p>something <strong><em>text</em> more</strong>.</p>',
        expect = ['P', 'STRONG', 'EM'],
        div = this.doc.createElement('div'),
        em,
        textnode,
        rangeObj = {},
        result;
    
    // example mocks that the text selected is in the em tag ('text')
    div.innerHTML = html;
    em = div.getElementsByTagName('em')[0];
    textnode = em.firstChild;
    rangeObj.commonAncestorContainer = textnode;
    sandbox.stub(this.selection, 'getSelectionObj');
    sandbox.stub(this.selection, 'getSelectionRange').returns(rangeObj);

    result = this.selection.getSelectionHierarchy(div);
    test.expect(1);
    test.deepEqual(result, expect);
    test.done();
  },
  // getSelectionHierarchy
  'returns a tag hierarchy array, when ancestor is NOT a textnode': function(test) {
    var html = '<p>something <strong><em>text</em>.</strong></p><p><strong>more</strong>.</p>',
        selectionHTML = '<p><strong><em>text</em>.</strong></p><p><strong>more</strong></p>',
        expect = ['P', 'STRONG'],
        div = this.doc.createElement('div'),
        cloneDiv = this.doc.createElement('div'),
        clone = this.doc.createDocumentFragment(),
        children,
        rangeObj = {
          cloneContents: function() {}
        },
        result;
    
    // example mocks that the text selected is 'text' through 'more'
    div.innerHTML = html;
    // you can't create a documentFragment with innerHTML, so we have to create
    // a div and move all it's children into the documentFragment...
    cloneDiv.innerHTML = selectionHTML;
    children = cloneDiv.childNodes;
    while (cloneDiv.hasChildNodes()) {
      clone.appendChild(cloneDiv.removeChild(cloneDiv.firstChild));
    }

    rangeObj.commonAncestorContainer = div;
    sandbox.stub(this.selection, 'getSelectionObj');
    sandbox.stub(this.selection, 'getSelectionRange').returns(rangeObj);
    sandbox.stub(rangeObj, 'cloneContents').returns(clone);

    result = this.selection.getSelectionHierarchy(div);
    test.expect(1);
    test.deepEqual(result, expect);
    test.done();
  },
  // allTagsWithinElement
  'return all the intersecting tags in firstChild nodes': function(test) {
    var html = '<p><strong><em>text</em>.</strong></p><p><strong>more</strong></p>',
        expect = ['P', 'STRONG'],
        div = this.doc.createElement('div'),
        result;
    
    
    div.innerHTML = html;
    
    // the 3rd argument is the firstChild boolean
    result = this.selection.allTagsWithinElement(div, [], true);
    test.expect(1);
    test.deepEqual(result, expect);
    test.done();
  },
  // allTagsWithinElement
  'return all the unique tags in all the child nodes': function(test) {
    var html = '<p><strong><em>text</em></strong></p><p><strong>more</strong></p>',
        expect = ['P', 'STRONG', 'EM'],
        div = this.doc.createElement('div'),
        result;
    
    
    div.innerHTML = html;
    
    result = this.selection.allTagsWithinElement(div, []);
    test.expect(1);
    test.deepEqual(result, expect);
    test.done();
  },
  // getSelectionHTML
  'if selection does not have rangeCount return empty string': function(test) {
    var result;
    sandbox.stub(this.win, 'getSelection').returns({});
    
    result = this.selection.getSelectionHTML();
    test.expect(1);
    test.equal(result, '');
    test.done();
  },
  // getSelectionHTML
  'get html string from text selection': function(test) {
    var result,
        html = '<p>content</p>',
        selObj = {
          rangeCount: 4,
          getRangeAt: function() { return { cloneContents: function() {} }; }
        },
        elemObj = {
          appendChild: function() {},
          innerHTML: html
        },
        appendStub = sandbox.stub(elemObj, 'appendChild');
    
    sandbox.stub(this.win, 'getSelection').returns(selObj);
    sandbox.stub(this.doc, 'createElement').returns(elemObj);
    result = this.selection.getSelectionHTML();
    test.expect(2);
    test.equal(appendStub.callCount, 4);
    test.equal(result, html);
    test.done();
  },
  // saveSelection
  'save the current text selection': function(test) {
    var rangeObj = {
          cloneRange: function() {},
          toString: function() {
            return 'selection text'; // 14 characters long
          }
        },
        preRangeObj = {
          selectNodeContents: function() {},
          setEnd: function() {},
          toString: function() {
            return '';
          }
        },
        expect = {
          start: 0,
          end: 14
        },
        result;
    
    sandbox.stub(this.selection, 'getSelectionObj');
    sandbox.stub(this.selection, 'getSelectionRange').returns(rangeObj);
    sandbox.stub(rangeObj, 'cloneRange').returns(preRangeObj);
    sandbox.stub(preRangeObj, 'selectNodeContents');
    sandbox.stub(preRangeObj, 'setEnd');
    result = this.selection.saveSelection();
    test.expect(1);
    test.deepEqual(result, expect);
    test.done();
  },
  // restoreSelection
  'restore a saved text selection': function(test) {
    var rangeObj = {
          setStart: function() {},
          setEnd: function() {},
          collapse: function() {}
        },
        selObj = {
          removeAllRanges: function() {},
          addRange: function() {}
        },
        saveObj = {
          start: 3,
          end: 19
        },
        textNodes = [
          this.doc.createTextNode('some normal text '),
          this.doc.createTextNode('and bold'),
          this.doc.createTextNode(' text')   
        ],
        strEl = this.doc.createElement('strong'),
        div = this.doc.createElement('div'),
        startStub = sandbox.stub(rangeObj, 'setStart'),
        endStub = sandbox.stub(rangeObj, 'setEnd');
    
    strEl.appendChild(textNodes[1]);
    div.appendChild(textNodes[0]);
    div.appendChild(strEl);
    div.appendChild(textNodes[2]);
    // innerHTML = 'some normal text <strong>and bold</strong> text'
    // selection of saveObj {3,19} = 'e normal text an'
    sandbox.stub(this.doc, 'createRange').returns(rangeObj);
    sandbox.stub(this.win, 'getSelection').returns(selObj);

    this.selection.restoreSelection(div, saveObj);
    test.expect(3);
    test.ok(startStub.withArgs(div, 0).calledOnce);
    test.ok(startStub.withArgs(textNodes[0], 3).calledOnce); // start(3): 3rd char in 1st textnode
    test.ok(endStub.withArgs(textNodes[1], 2).calledOnce); // end(19): 2nd char in 2nd textnode
    test.done();
  },
  // isOrContainsNode
  'element does contain the node': function(test) {
    var div = this.doc.createElement('div'),
        html = 'some <strong>bold</strong> text',
        strNode,
        result;

    div.innerHTML = html;
    strNode = div.getElementsByTagName('strong')[0];
    result = this.selection.isOrContainsNode(div, strNode);
    test.expect(1);
    test.ok(result);
    test.done();
  },
  // isOrContainsNode
  'element does NOT contain the node': function(test) {
    var div = this.doc.createElement('div'),
        html = 'some <strong>bold</strong> text',
        emNode = this.doc.createElement('em'),
        result;

    div.innerHTML = html;
    result = this.selection.isOrContainsNode(div, emNode);
    test.expect(1);
    test.ok(!result);
    test.done();
  },
  // isSelectionInside
  'selection is inside the element': function(test) {
    var selObj = {
          anchorNode: {},
          focusNode: {}
        },
        div = this.doc.createElement('div'),
        result;

    sandbox.stub(this.win, 'getSelection').returns(selObj);
    sandbox.stub(this.selection, 'isOrContainsNode').returns(true);
    result = this.selection.isSelectionInside(div);
    test.expect(1);
    test.ok(result);
    test.done();
  },
  // isSelectionInside
  'selection is at least partially outside the element': function(test) {
    var selObj = {
          anchorNode: {},
          focusNode: {}
        },
        div = this.doc.createElement('div'),
        result;

    sandbox.stub(this.win, 'getSelection').returns(selObj);
    sandbox.stub(this.selection, 'isOrContainsNode').returns(false);
    result = this.selection.isSelectionInside(div);
    test.expect(1);
    test.ok(!result);
    test.done();
  },
  // isSelectionInside
  'selection is at least partially outside the element, but force selection inside': function(test) {
    var rangeObj = {
          selectNodeContents: function() {},
          collapse: function() {}
        },
        selObj = {
          removeAllRanges: function() {},
          addRange: function() {}
        },
        div = this.doc.createElement('div'),
        result,
        addRangeStub = sandbox.stub(selObj, 'addRange');

    sandbox.stub(this.win, 'getSelection').returns(selObj);
    sandbox.stub(this.selection, 'isOrContainsNode').returns(false);
    sandbox.stub(this.doc, 'createRange').returns(rangeObj);
    result = this.selection.isSelectionInside(div, true);
    test.expect(2);
    test.ok(result);
    test.ok(addRangeStub.calledOnce);
    test.done();
  },
  // getBaseChildSelectionElement
  'the child is not in the container, so container is returned': function(test) {
    var div = this.doc.createElement('div'),
        p = this.doc.createElement('p'),
        result;

    sandbox.stub(this.selection, 'getSelectionElement').returns(p);
    result = this.selection.getBaseChildSelectionElement(true, div);
    test.expect(1);
    test.equal(result, div);
    test.done();
  },
  // getBaseChildSelectionElement
  'find the base child ancestor of the current element': function(test) {
    var div = this.doc.createElement('div'),
        html = '<p>some text <strong><em>here</em></strong>.</p>',
        em, p,
        result;

    div.innerHTML = html;
    em = div.getElementsByTagName('em')[0];
    p = div.getElementsByTagName('p')[0];
    sandbox.stub(this.selection, 'getSelectionElement').returns(em);
    result = this.selection.getBaseChildSelectionElement(true, div);
    test.expect(1);
    test.equal(result, p);
    test.done();
  },
  // getSelectionElement
  'get the element for the current selection (start of selection)': function(test) {
    var startNode = this.doc.createElement('p'),
        endNode = this.doc.createElement('blockquote'),
        rangeObj = {
          'startContainer': startNode,
          'endContainer': endNode
        },
        result;

    sandbox.stub(this.selection, 'getSelectionRange').returns(rangeObj);
    result = this.selection.getSelectionElement(true);
    test.expect(1);
    test.equal(result, startNode);
    test.done();
  },
  // getSelectionElement
  'get the element for the current selection (end of selection)': function(test) {
    var startNode = this.doc.createElement('p'),
        endNode = this.doc.createElement('blockquote'),
        rangeObj = {
          'startContainer': startNode,
          'endContainer': endNode
        },
        result;

    sandbox.stub(this.selection, 'getSelectionRange').returns(rangeObj);
    result = this.selection.getSelectionElement();
    test.expect(1);
    test.equal(result, endNode);
    test.done();
  },
  // getSelectionElement
  'returns false when range not found': function(test) {
    var result;

    sandbox.stub(this.selection, 'getSelectionRange').returns(false);
    result = this.selection.getSelectionElement();
    test.expect(1);
    test.equal(result, false);
    test.done();
  }
};
