/*jslint browser:true */
var Toolbar = require("../lib/js/classes/Toolbar"),
    MockBrowser = require('mock-browser').mocks.MockBrowser;


exports['Toolbar'] = {
    setUp: function (done) {
        // setup here
        done();
    },
    // createToolbar
    'create a new toolbar element': function (test) {
        var mockBrow = new MockBrowser(),
            options = {
                'doc': mockBrow.getDocument(),
                'toolbar': ['b', 'i', 'ol', 'indent', 'outdent'],
                'classPrefix': 'wys-editor-'
            }, 
            newToolbar = Toolbar.createInstance(options).bar;

        test.expect(1);
        test.equal(newToolbar.className, 'wys-html-editor-toolbar');
        test.done();
    }
};