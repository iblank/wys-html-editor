/*jslint browser:true */
'use strict';

var wys_html_editor = require('../lib/wys-html-editor');
var MockBrowser = require('mock-browser').mocks.MockBrowser;
var sinon = require("sinon");

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

/*exports['awesome'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(1);
    // tests here
    test.equal(wys_html_editor.awesome(), 'awesome', 'should be awesome.');
    test.done();
  }
};*/
exports['WysHtmlEditor'] = {
  wyseditor: {},
  setUp: function(done) {
    var mockBrow = new MockBrowser(),
        document = mockBrow.getDocument(),
        newEl = document.createElement('div'),
        options = { 'doc': document, 'toolbar': ['b', 'i'] };
    
    newEl.setAttribute('class', 'wyseditorClass');
    newEl.innerHTML = 'Inner content.';
    this.wyseditor = new wys_html_editor(newEl, options);
    // setup here
    done();
  },
  'init empty editor': function(test) {
    var mockBrow = new MockBrowser(),
        document = mockBrow.getDocument(),
        newEl = document.createElement('div'),
        options = { 'doc': document },
        wyseditor1;
    
    newEl.setAttribute('class', 'wyseditorClass');
    wyseditor1 = new wys_html_editor(newEl, options);

    test.expect(1);
    // tests here
    test.equal(wyseditor1.getValue(), '<p><br></p>');
    test.done();
  },
  'create a new editor element': function(test) {
    var newEditor = this.wyseditor.createEditor();

    test.expect(1);
    test.equal(newEditor.className, 'wys-html-editor-element');
    test.done();
  },
  'create a new toolbar element': function(test) {
    var newToolbar = this.wyseditor.createToolbar();

    test.expect(1);
    test.equal(newToolbar.className, 'wys-html-editor-toolbar');
    test.done();
  },
  'addEventListeners are added': function(test) {
    var editstub = sinon.mock(this.wyseditor.editor).expects('addEventListener'),
        toolstub = sinon.mock(this.wyseditor.toolbar).expects('addEventListener');

    test.expect(2);
    test.ok(editstub.exactly(4));
    test.ok(toolstub.exactly(2));
    test.done();
  },
  'create toolbar buttons': function(test) {
    var result = this.wyseditor.createToolbarButtons(),
        expect = '<li><button class="wys-editor-btn-strong" title="bold"><strong>B</strong></button></li><li><button class="wys-editor-btn-em" title="italic"><em>I</em></button></li>';
    test.expect(1);
    test.equal(result.innerHTML, expect);
    test.done();
  },
  'create a toolbar button': function(test) {
    var result = this.wyseditor.createToolbarButton('b'),
        expect = '<button class="wys-editor-btn-strong" title="bold"><strong>B</strong></button>';
    test.expect(1);
    test.equal(result.innerHTML, expect);
    test.done();
  },
  'bold button clicked': function(test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
        saveSelStub = sinon.stub(this.wyseditor.selection, 'saveSelection').returns(false),
        restoreSelStub = sinon.stub(this.wyseditor.selection, 'restoreSelection'),
        updateBtnsStub = sinon.stub(this.wyseditor, 'updateActiveToolbarButtons'),
        prefixClass = this.wyseditor.options.classPrefix + 'btn-strong';

    this.wyseditor.toolbarButtonClick(prefixClass);
    test.expect(4);
    test.ok(saveSelStub.calledOnce);
    test.ok(restoreSelStub.calledOnce);
    test.ok(updateBtnsStub.calledOnce);
    test.ok(execStub.withArgs('bold'));
    test.done();
  },
  'italic button clicked': function(test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
        saveSelStub = sinon.stub(this.wyseditor.selection, 'saveSelection').returns(false),
        restoreSelStub = sinon.stub(this.wyseditor.selection, 'restoreSelection'),
        updateBtnsStub = sinon.stub(this.wyseditor, 'updateActiveToolbarButtons'),
        prefixClass = this.wyseditor.options.classPrefix + 'btn-em';

    this.wyseditor.toolbarButtonClick(prefixClass);
    test.expect(4);
    test.ok(saveSelStub.calledOnce);
    test.ok(restoreSelStub.calledOnce);
    test.ok(updateBtnsStub.calledOnce);
    test.ok(execStub.withArgs('italic'));
    test.done();
  },
  'unordered-list button clicked': function(test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
        prefixClass = this.wyseditor.options.classPrefix + 'btn-ul';

    this.wyseditor.toolbarButtonClick(prefixClass);
    test.expect(1);
    test.ok(execStub.withArgs('insertUnorderedList'));
    test.done();
  },
  'ordered-list button clicked': function(test) {
    var execStub = sinon.mock(this.wyseditor).expects('execCommand'),
        prefixClass = this.wyseditor.options.classPrefix + 'btn-ol';

    this.wyseditor.toolbarButtonClick(prefixClass);
    test.expect(1);
    test.ok(execStub.withArgs('insertOrderedList'));
    test.done();
  },
  'create toolbar button': function(test) {
    var expected = this.wyseditor.options.classPrefix + 'btn-strong',
        result,
        btn;
    test.expect(1);

    result = this.wyseditor.createToolbarButton('b');
    btn = result.getElementsByTagName('button')[0];

    test.equal(btn.className, expected);

    test.done();
  },
  'returns element used': function(test) {
    test.expect(1);
    // tests here
    test.equal(this.wyseditor.getValue(), '<p>Inner content.</p>', 'should be awesome.');
    test.done();
  }
};
