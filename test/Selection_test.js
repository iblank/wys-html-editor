/*jslint browser:true */
'use strict';

var Selection = require("../lib/js/classes/Selection");

exports['Selection'] = {
  // createNew
  'return null for <IE9 based selections': function(test) {
    test.expect(1);
    test.equal(Selection.createNew({}, {}), null);
    test.done();
  },
  // createNew
  'return new Selections class instance': function(test) {
    var win = {
            getSelection: function() {}
        },
        selection = Selection.createNew(win, {});

    test.expect(1);
    test.equal(selection.constructor.name, 'SelectionModern');
    test.done();
  }
};
