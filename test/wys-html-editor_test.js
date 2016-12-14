/*jslint browser:true */
'use strict';

var wys_html_editor = require('../lib/wys-html-editor'),
  Helper = require("../lib/js/classes/Helper"),
  MockBrowser = require('mock-browser').mocks.MockBrowser,
  sinon = require("sinon");

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports['WysHtmlEditor'] = {
  wyseditor: {},
  setUp: function (done) {
    var mockBrow = new MockBrowser(),
      document = mockBrow.getDocument(),
      window = mockBrow.getWindow(),
      newEl = document.createElement('div'),
      options;

    window.getSelection = function () {};
    document.execCommand = function () {};
    document.queryCommandSupported = function () {
      return true;
    };
    options = {
      'doc': document,
      'win': window,
      'toolbar': ['b', 'i', 'ol', 'indent', 'outdent']
    };

    newEl.setAttribute('class', 'wyseditorClass');
    newEl.innerHTML = 'Inner content.';
    this.wyseditor = new wys_html_editor(newEl, options);
    // setup here
    done();
  },
  // init
  'init empty editor': function (test) {
    var mockBrow = new MockBrowser(),
      document = mockBrow.getDocument(),
      newEl = document.createElement('div'),
      options = {
        'doc': document
      },
      wyseditor1,
      eventSpy = sinon.spy(document, 'createEvent');

    newEl.setAttribute('class', 'wyseditorClass');
    wyseditor1 = new wys_html_editor(newEl, options);

    test.expect(2);
    // tests here
    test.equal(wyseditor1.getValue(), '<p><br></p>');
    test.ok(eventSpy.calledOnce);
    test.done();
  },
  // createEditor
  'create a new editor element': function (test) {
    var newEditor = this.wyseditor.createEditor();

    test.expect(1);
    test.equal(newEditor.className, 'wys-html-editor-element');
    test.done();
  },
  // addEventListeners
  'addEventListeners are added': function (test) {
    var editstub = sinon.stub(this.wyseditor.editor, 'addEventListener'),
      toolstub = sinon.stub(this.wyseditor.toolbar.bar, 'addEventListener');

    this.wyseditor.addEventListeners();
    test.expect(2);
    test.ok(editstub.callCount, 4);
    test.ok(toolstub.callCount, 2);
    test.done();
  },
  // createToolbarButtons
  'create toolbar buttons': function (test) {
    var result = this.wyseditor.toolbar.createToolbarButtons(),
      btns = result.getElementsByTagName('button')[0];
    test.expect(1);
    test.equal(btns.className, 'wys-editor-btn-strong');
    test.done();
  },
  // notify: bold
  'bold button clicked': function (test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
      saveSelStub = sinon.stub(this.wyseditor.selection, 'saveSelection').returns(false),
      restoreSelStub = sinon.stub(this.wyseditor.selection, 'restoreSelection'),
      updateBtnsStub = sinon.stub(this.wyseditor, 'updateActiveToolbarButtons'),
      prefixClass = this.wyseditor.options.classPrefix + 'btn-strong';

    sinon.stub(this.wyseditor.selection, 'getSelectionHTML').returns('');
    this.wyseditor.notify(prefixClass);
    test.expect(4);
    test.ok(saveSelStub.calledOnce);
    test.ok(restoreSelStub.calledOnce);
    test.ok(updateBtnsStub.calledOnce);
    test.ok(execStub.withArgs('bold'));
    test.done();
  },
  // notify: italic
  'italic button clicked': function (test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
      saveSelStub = sinon.stub(this.wyseditor.selection, 'saveSelection').returns(false),
      restoreSelStub = sinon.stub(this.wyseditor.selection, 'restoreSelection'),
      updateBtnsStub = sinon.stub(this.wyseditor, 'updateActiveToolbarButtons'),
      prefixClass = this.wyseditor.options.classPrefix + 'btn-em';

    sinon.stub(this.wyseditor.selection, 'getSelectionHTML').returns('');
    this.wyseditor.notify(prefixClass);
    test.expect(4);
    test.ok(saveSelStub.calledOnce);
    test.ok(restoreSelStub.calledOnce);
    test.ok(updateBtnsStub.calledOnce);
    test.ok(execStub.withArgs('italic'));
    test.done();
  },
  // notify: ul
  'unordered-list button clicked': function (test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
      prefixClass = this.wyseditor.options.classPrefix + 'btn-ul';

    this.wyseditor.notify(prefixClass);
    test.expect(1);
    test.ok(execStub.withArgs('insertUnorderedList'));
    test.done();
  },
  // notify: ol
  'ordered-list button clicked': function (test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
      prefixClass = this.wyseditor.options.classPrefix + 'btn-ol';

    this.wyseditor.notify(prefixClass);
    test.expect(1);
    test.ok(execStub.withArgs('insertOrderedList'));
    test.done();
  },
  // checkOnBlur
  'check on editor blur, if toolbar does not have focus': function (test) {
    this.wyseditor.toolbarFocus = false;
    this.wyseditor.toolbar.bar.style.display = 'block';

    this.wyseditor.checkOnBlur();
    test.expect(1);
    test.equal(this.wyseditor.toolbar.bar.style.display, 'none');
    test.done();
  },
  // checkOnBlur
  'check on editor blur, if toolbar does have focus': function (test) {
    this.wyseditor.toolbarFocus = true;
    this.wyseditor.toolbar.bar.style.display = 'block';

    this.wyseditor.checkOnBlur();
    test.expect(1);
    test.equal(this.wyseditor.toolbar.bar.style.display, 'block');
    test.done();
  },
  // setToolbarPos
  'set the toolbar position based on the selection': function (test) {
    // mock dimensions of the current selection...
    var dims = {
      x: 30,
      y: 35,
      w: 40,
      h: 45
    };
    // mock the current toolbar offsets
    this.wyseditor.toolbar.bar.offsetWidth = 50;
    this.wyseditor.toolbar.bar.offsetHeight = 20;
    // Math involved:
    // left: 30 + (40 / 2) - (50 / 2) = 25px
    // top: 35 - 20 + 8 (height of down arrow on toolbar) = 7px

    this.wyseditor.setToolbarPos(dims);
    test.expect(2);
    test.equal(this.wyseditor.toolbar.bar.style.left, '25px');
    test.equal(this.wyseditor.toolbar.bar.style.top, '7px');
    test.done();
  },
  // setToolbarPos
  'set the toolbar position based on the selection, and adjust when close to screen edge': function (test) {
    // mock dimensions of the current selection...
    var dims = {
      x: 10,
      y: 5,
      w: 40,
      h: 45
    };
    // mock the current toolbar offsets
    this.wyseditor.toolbar.bar.offsetWidth = 80;
    this.wyseditor.toolbar.bar.offsetHeight = 20;
    // Math involved:
    // left: 10 + (40 / 2) - (80 / 2) = -10px
    // top: 5 - 20 + 8 (height of down arrow on toolbar) = -7px

    this.wyseditor.setToolbarPos(dims);
    test.expect(2);
    test.equal(this.wyseditor.toolbar.bar.style.left, '0px');
    test.equal(this.wyseditor.toolbar.bar.style.top, '0px');
    test.done();
  },
  // updateActiveToolbarButtons
  'get current hierarchy of DOM selection and call highlight function': function (test) {
    var returnTags = ['p', 'em'],
      highlightSpy = sinon.stub(this.wyseditor, 'highlightToolbarButtons');

    sinon.stub(this.wyseditor.selection, 'getSelectionHierarchy').returns(returnTags);
    this.wyseditor.updateActiveToolbarButtons();
    test.expect(1);
    test.ok(highlightSpy.calledWith(returnTags));
    test.done();
  },
  // highlightToolbarButtons
  'highlight buttons based on tags given': function (test) {
    var tags = ['div', 'ul', 'li', 'ol', 'li', 'strong'],
      HelperStub = sinon.stub(Helper, 'addClass');

    sinon.stub(this.wyseditor, 'unHighlightToolbarButtons');
    this.wyseditor.highlightToolbarButtons(tags);
    test.expect(1);
    test.equal(HelperStub.callCount, 4); // strong + ol + indent + outdent
    test.done();
  },
  // unHighlightToolbarButtons
  'unhighlight buttons': function (test) {
    var HelperStub = sinon.stub(Helper, 'removeClass');

    this.wyseditor.unHighlightToolbarButtons();
    test.expect(1);
    test.equal(HelperStub.callCount, 10); // removeClass called twice for 5 buttons ['b', 'i', 'ol', 'indent', 'outdent']
    test.done();
  },
  // textSelection
  'text selection returns string': function (test) {
    this.wyseditor.toolbar.bar.style.display = 'none';
    sinon.stub(this.wyseditor.selection, 'getSelectionHTML').returns('<strong>text</strong>');
    sinon.stub(this.wyseditor, 'updateActiveToolbarButtons');
    sinon.stub(this.wyseditor, 'setToolbarPos');
    this.wyseditor.textSelection();
    test.expect(1);
    test.equal(this.wyseditor.toolbar.bar.style.display, 'block');
    test.done();
  },
  // textSelection
  'text selection returns empty string': function (test) {
    this.wyseditor.toolbar.bar.style.display = 'block';
    sinon.stub(this.wyseditor.selection, 'getSelectionHTML').returns('');
    this.wyseditor.textSelection();
    test.expect(1);
    test.equal(this.wyseditor.toolbar.bar.style.display, 'none');
    test.done();
  },
  // checkKeyUp
  'check event after keyup fired': function (test) {
    var eventObj = {
        which: 38, // ARROWUP key
        shiftKey: true
      },
      textSelectStub = sinon.stub(this.wyseditor, 'textSelection');

    this.wyseditor.checkKeyUp(eventObj);
    test.expect(1);
    test.ok(textSelectStub.calledOnce);
    test.done();
  },
  // checkKeyUp
  'check event after keyup fired, not a shift+key': function (test) {
    var eventObj = {
        which: 38, // ARROWUP key
        shiftKey: false
      },
      textSelectStub = sinon.stub(this.wyseditor, 'textSelection');

    this.wyseditor.checkKeyUp(eventObj);
    test.expect(1);
    test.ok(!textSelectStub.called); // not called
    test.done();
  },
  // updateValue
  'updates value and dispatches custom event': function (test) {
    var dispatchStub = sinon.stub(this.wyseditor.parentElem, 'dispatchEvent');

    this.wyseditor.updateValue();
    test.expect(1);
    test.ok(dispatchStub.calledOnce);
    test.done();
  },
  // execCommand
  'exec called when selection outside of editor': function (test) {
    sinon.stub(this.wyseditor.selection, 'isSelectionInside').returns(false);

    test.expect(1);
    test.ok(!this.wyseditor.execCommand('bold'));
    test.done();
  },
  // execCommand
  'do nothing, in < IE9': function (test) {
    var result;

    sinon.stub(this.wyseditor.selection, 'isSelectionInside').returns(true);
    result = this.wyseditor.execCommand('bold');

    test.expect(1);
    test.ok(!result);
    test.done();
  },
  // execCommand
  'exec bold called on document, in modern browsers': function (test) {
    var result,
      execStub = sinon.stub(this.wyseditor.options.doc, 'execCommand').returns('exec called');

    // modern browsers has a window.getSelection function
    this.wyseditor.options.win.getSelection = function () {};
    sinon.stub(this.wyseditor.selection, 'isSelectionInside').returns(true);
    sinon.stub(this.wyseditor.options.doc, 'queryCommandSupported').returns(true);
    result = this.wyseditor.execCommand('bold');

    test.expect(2);
    test.ok(execStub.called);
    test.equal(result, 'exec called');
    test.done();
  },
  // execCommand
  'exec bold called on document, in modern browsers... queryCommandSupported false': function (test) {
    var result;

    // modern browsers has a window.getSelection function
    this.wyseditor.options.win.getSelection = function () {};
    sinon.stub(this.wyseditor.selection, 'isSelectionInside').returns(true);
    sinon.stub(this.wyseditor.options.doc, 'queryCommandSupported').returns(false);
    result = this.wyseditor.execCommand('bold');

    test.expect(1);
    test.ok(!result);
    test.done();
  },
  // checkKeyDown
  'does nothing when criteria not met': function (test) {
    var eventObj = {
        which: 38, // ARROWUP key
        shiftKey: false,
        preventDefault: function () {}
      },
      preventStub = sinon.stub(eventObj, 'preventDefault');

    test.expect(1);
    test.ok(!preventStub.calledOnce); // not called
    test.done();
  },
  // checkKeyDown
  'enter is pressed with shift key': function (test) {
    var eventObj = {
        which: 13, // ENTER key
        shiftKey: true,
        preventDefault: function () {}
      },
      preventStub = sinon.stub(eventObj, 'preventDefault');

    this.wyseditor.checkKeyDown(eventObj);
    test.expect(1);
    test.ok(preventStub.calledOnce);
    test.done();
  },
  // checkKeyDown
  'enter is pressed without shift key, selected element empty': function (test) {
    var eventObj = {
        which: 13, // ENTER key
        shiftKey: false,
        preventDefault: function () {}
      },
      elemObj = {
        nextElementSibling: {}
      },
      preventStub = sinon.stub(eventObj, 'preventDefault');

    sinon.stub(this.wyseditor.selection, 'getBaseChildSelectionElement').returns(elemObj);
    sinon.stub(this.wyseditor.domHelper, 'isEmptyPara').returns(true);
    this.wyseditor.checkKeyDown(eventObj);
    test.expect(1);
    test.ok(preventStub.calledOnce);
    test.done();
  },
  // checkKeyDown
  'enter is pressed without shift key, next sibling is empty': function (test) {
    var eventObj = {
        which: 13, // ENTER key
        shiftKey: false,
        preventDefault: function () {}
      },
      elemObj = {
        nextElementSibling: {}
      },
      isEmptyStub = sinon.stub(this.wyseditor.domHelper, 'isEmptyPara'),
      removeStub = sinon.stub(this.wyseditor.editor, 'removeChild');

    sinon.stub(this.wyseditor.selection, 'getBaseChildSelectionElement').returns(elemObj);
    isEmptyStub.withArgs(elemObj).returns(false);
    isEmptyStub.withArgs(elemObj.nextElementSibling).returns(true);
    this.wyseditor.checkKeyDown(eventObj);
    test.expect(1);
    test.ok(removeStub.calledOnce);
    test.done();
  },
  // getEditor
  'returns the editor element': function (test) {
    test.expect(1);
    test.equal(this.wyseditor.getElement(), this.wyseditor.editor);
    test.done();
  },
  // getValue
  'returns current WYSIWYG value': function (test) {
    test.expect(1);
    test.equal(this.wyseditor.getValue(), '<p>Inner content.</p>', 'should be awesome.');
    test.done();
  },
  // getOptions
  'returns the options object': function (test) {
    test.expect(1);
    test.equal(this.wyseditor.getOptions(), this.wyseditor.options);
    test.done();
  }
};