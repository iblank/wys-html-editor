/*jslint browser:true */
var ToolbarButton = require("../lib/js/classes/ToolbarButton"),
    MockBrowser = require('mock-browser').mocks.MockBrowser;


exports['ToolbarButton'] = {
    setUp: function (done) {

        // setup here
        done();
    },
    // createToolbarButton
    'create a toolbar button': function (test) {
        var expected = 'wys-editor-btn-strong',
            result,
            btn, mockBrow = new MockBrowser();
        test.expect(1);

        result = ToolbarButton.create('b', {
            'doc': mockBrow.getDocument(),
            'classPrefix': 'wys-editor-'
        });

        btn = result.li.getElementsByTagName('button')[0];

        test.equal(btn.className, expected);

        test.done();
    },

};