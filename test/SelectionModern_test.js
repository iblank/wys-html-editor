/*jslint browser:true */
'use strict';

var Selection = require("../lib/js/classes/selectionClasses/SelectionModern"),
    MockBrowser = require('mock-browser').mocks.MockBrowser,
    sinon = require("sinon"),
    sandbox;

exports['SelectionModern'] = {
  selection: {},
  setUp: function(done) {
    var mockBrow = new MockBrowser(),
        window = mockBrow.getWindow(),
        document = mockBrow.getDocument();

    window.getSelection = function() {};
    document.createRange = function() {};
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
    
    sandbox.stub(this.selection.win, 'getSelection').returns(selObj);
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

    sandbox.stub(this.selection.doc, 'createRange').returns(rangeObj);
    sandbox.stub(this.selection.win, 'getSelection').returns(selObj);
    this.selection.moveCursorToElement();
    test.expect(1);
    test.ok(addRangeStub.calledOnce);
    test.done();
  },
  // getSelectionObj
  'returns the window.getSelection object': function(test) {
      var getSelStub = sandbox.stub(this.selection.win, 'getSelection');

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

      sandbox.stub(this.selection.doc, 'createRange').returns(rangeObj);
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

    sandbox.stub(this.selection.win, 'getSelection').returns(selObj);
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
    
    this.selection.win.getComputedStyle = function() {};
    styleStub = sandbox.stub(this.selection.win, 'getComputedStyle').returns(styleObj);
    result = this.selection.getElementDefaultDisplay('em');
    test.expect(2);
    test.ok(styleStub.calledOnce);
    test.equal(result, 'inline');
    test.done();
  }
};
