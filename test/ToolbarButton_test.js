/*jslint browser:true */
var ToolbarButton = require("../lib/js/classes/ToolbarButton"),
    MockBrowser = require('mock-browser').mocks.MockBrowser,
    sinon = require('sinon');


exports['ToolbarButton'] = {
    button: {},
    setUp: function (done) {
        var mockBrow = new MockBrowser(),
            options = {
                'doc': mockBrow.getDocument(),
                'classPrefix': 'wys-editor-'
            },
            btnMap = {
                'b': ['bold', '<strong>B</strong>', 'strong'],
                'i': ['italic', '<em>I</em>', 'em'],
                'ul': ['list', '&bullet;', 'ul'],
                'ol': ['ordered-list', '1.', 'ol'],
                'indent': ['indent', '--&gt;', 'indent', 'special'],
                'outdent': ['outdent', '&lt;--', 'outdent', 'special']
            };
        
        this.button = ToolbarButton.create('b', btnMap, options);
        
        done();
    },
    // createToolbarButton
    'create a toolbar button': function (test) {
        var expected = 'wys-editor-btn-strong',
            btn = this.button.li.getElementsByTagName('button')[0];

        test.expect(1);
        test.equal(btn.className, expected);
        test.done();
    },
    // clicked
    'toolbar button clicked': function (test) {
        var notifySpy = sinon.spy(this.button, 'notifyToolbarBtnClick');

        this.button.clicked('btn-class');
        test.expect(1);
        test.ok(notifySpy.calledWith('btn-class'));
        test.done();
    }
};