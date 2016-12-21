/*jslint browser:true */
var Toolbar = require("../lib/js/classes/Toolbar"),
    Helper = require("../lib/js/classes/Helper"),
    MockBrowser = require('mock-browser').mocks.MockBrowser,
    sinon = require("sinon"),
    sandbox;


exports['Toolbar'] = {
    toolbar: {},
    setUp: function (done) {
        var mockBrow = new MockBrowser(),
            options = {
                'doc': mockBrow.getDocument(),
                'win': mockBrow.getWindow(),
                'toolbar': ['b', 'i', 'ol', 'indent', 'outdent'],
                'classPrefix': 'wys-editor-'
            };
            
        sandbox = sinon.sandbox.create();
        this.toolbar = Toolbar.createInstance(options);
        done();
    },
    tearDown: function(done) {
        sandbox.restore();
        done();
    },
    // createToolbar
    'create a new toolbar element': function (test) {
        test.expect(1);
        test.equal(this.toolbar.bar.className, 'wys-editor-toolbar');
        test.done();
    },
    // createToolbarButtons
    'create toolbar buttons': function(test) {
      var result = this.toolbar.createButtons(),
          btns = result.getElementsByTagName('button')[0];
      
      test.expect(1);
      test.equal(btns.className, 'wys-editor-btn-strong');
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
        },
        helperSpy = sandbox.spy(Helper, 'removeClass');
    // mock the current toolbar offsets
    this.toolbar.bar.offsetWidth = 50;
    this.toolbar.bar.offsetHeight = 20;
    // Math involved:
    // left: 30 + (40 / 2) - (50 / 2) = 25px
    // top: 35 - 20 + 8 (height of down arrow on toolbar) = 7px

    this.toolbar.setPosition(dims);
    test.expect(3);
    test.ok(helperSpy.calledOnce);
    test.equal(this.toolbar.bar.style.left, '25px');
    test.equal(this.toolbar.bar.style.top, '7px');
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
        },
        helperSpy = sandbox.spy(Helper, 'addClass');
    // mock the current toolbar offsets
    this.toolbar.bar.offsetWidth = 80;
    this.toolbar.bar.offsetHeight = 20;
    // Math involved:
    // left: 10 + (40 / 2) - (80 / 2) = -10px
    // top: 5 - 20 + 8 (height of down arrow on toolbar) = -7px
    // (since -7 < 0) top: 0 + 5 + 45 + 8

    this.toolbar.setPosition(dims);
    test.expect(3);
    test.ok(helperSpy.calledOnce);
    test.equal(this.toolbar.bar.style.left, '0px');
    test.equal(this.toolbar.bar.style.top, '58px');
    test.done();
  },
  // highlightToolbarButtons
  'highlight buttons based on tags given': function (test) {
    var tags = ['div', 'ul', 'li', 'ol', 'li', 'strong'],
        HelperStub = sandbox.stub(Helper, 'addClass');
  
    sandbox.stub(this.toolbar, 'unHighlightButtons');
    this.toolbar.highlightButtons(tags);
    test.expect(1);
    test.equal(HelperStub.callCount, 4); // strong + ol + indent + outdent
    test.done();
  },
  // unHighlightToolbarButtons
  'unhighlight buttons': function(test) {
    var HelperStub = sandbox.stub(Helper, 'removeClass');
  
    this.toolbar.unHighlightButtons();
    test.expect(1);
    test.equal(HelperStub.callCount, 10); // removeClass called twice for 5 buttons ['b', 'i', 'ol', 'indent', 'outdent']
    test.done();
  }
};