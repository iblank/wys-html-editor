/*jslint browser:true */
'use strict';

var wys_html_editor = require('../lib/wys-html-editor');
var MockBrowser = require('mock-browser').mocks.MockBrowser;

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
        options = { 'doc': document };
    
    newEl.setAttribute('class', 'wyseditorClass');
    newEl.innerHTML = 'Inner content.';
    this.wyseditor = new wys_html_editor(newEl, options);
    // setup here
    done();
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
