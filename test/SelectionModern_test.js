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
            return 'selection text';
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
  }
};
