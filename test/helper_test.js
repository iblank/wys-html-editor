/*jslint browser:true */
'use strict';

var Helper = require("../lib/js/classes/Helper"),
    sinon = require("sinon"),
    sandbox;

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

exports['Helper'] = {
  setUp: function(done) {
    sandbox = sinon.sandbox.create();
    done();
  },
  tearDown: function(done) {
      sandbox.restore();
      done();
  },
  // mergeObjs
  'merge properties of 2 objects together into one': function(test) {
      var obj1 = {
            class: 'sports',
            type: 'car'
        },
        obj2 = {
            class: 'luxury',
            heatedSeats: true
        },
        expected = {
            class: 'luxury',
            type: 'car',
            heatedSeats: true
        };

    test.expect(1);
    test.deepEqual(Helper.mergeObjs(obj1, obj2), expected);
    test.done();
  },
  // objOverrideValues
  'use 2nd object to override property values of 1st object': function(test) {
    var obj1 = {
            class: 'sports',
            type: 'car'
        },
        obj2 = {
            class: 'luxury',
            heatedSeats: true
        },
        expected = {
            class: 'luxury',
            type: 'car'
        };

    test.expect(1);
    test.deepEqual(Helper.objOverrideValues(obj1, obj2), expected);
    test.done();
  },
  // arrayIntersect
  'return array of intersecting values between 2 arrays': function(test) {
    var arr1 = [1,3,5],
        arr2 = [5,8,1],
        expect = [1,5];

    test.expect(1);
    test.deepEqual(Helper.arrayIntersect(arr1, arr2), expect);
    test.done();
  },
  // arrayAddUnique
  'add unique values from the 2nd array into the 1st': function(test) {
    var arr1 = [1,3,5],
        arr2 = [5,8,1],
        expect = [1,3,5,8];

    test.expect(1);
    test.deepEqual(Helper.arrayAddUnique(arr1, arr2), expect);
    test.done();
  },
  // hasClass
  'element has a specified class': function(test) {
    var el = {
            classList: {
                contains: function() { return true; }
            }
        },
        containStub = sandbox.stub(el.classList, 'contains');

    Helper.hasClass(el, 'something');
    test.expect(1);
    test.ok(containStub.calledOnce);
    test.done();
  },
  // hasClass
  'element has a specified class, using regex': function(test) {
    var el = {
            className: 'random something object'
        };

    test.expect(1);
    test.ok(Helper.hasClass(el, 'something'));
    test.done();
  },
  // addClass
  'add class to element': function(test) {
    var el = {
            classList: {
                add: function() {}
            }
        },
        addStub = sandbox.stub(el.classList, 'add');

    Helper.addClass(el, 'something');
    test.expect(1);
    test.ok(addStub.calledOnce);
    test.done();
  },
  // addClass
  'do not add class name if it already exists': function(test) {
    var classStr = 'random something object',
        el = {
            className: classStr
        };

    sandbox.stub(Helper, 'hasClass').returns(true);
    Helper.addClass(el, 'something');
    test.expect(1);
    test.equal(el.className, classStr);
    test.done();
  },
  // addClass
  'add class name to element without classList': function(test) {
    var classStr = 'random something object',
        el = {
            className: classStr
        };

    sandbox.stub(Helper, 'hasClass').returns(false);
    Helper.addClass(el, 'else');
    test.expect(1);
    test.equal(el.className, classStr + ' else');
    test.done();
  },
  // removeClass
  'remove class from element': function(test) {
    var el = {
            classList: {
                remove: function() {}
            }
        },
        removeStub = sandbox.stub(el.classList, 'remove');

    Helper.removeClass(el, 'something');
    test.expect(1);
    test.ok(removeStub.calledOnce);
    test.done();
  },
  // removeClass
  'do not remove class name if it does not exist': function(test) {
    var classStr = 'random something object',
        el = {
            className: classStr
        };

    sandbox.stub(Helper, 'hasClass').returns(false);
    Helper.removeClass(el, 'else');
    test.expect(1);
    test.equal(el.className, classStr);
    test.done();
  },
  // removeClass
  'remove class name from element without classList': function(test) {
    var classStr = 'random something object',
        el = {
            className: classStr
        };

    sandbox.stub(Helper, 'hasClass').returns(true);
    Helper.removeClass(el, 'something');
    test.expect(1);
    test.equal(el.className, 'random object');
    test.done();
  },
  // toggleClass
  'add class name not on element': function(test) {
      var addStub = sandbox.stub(Helper, 'addClass');
      
      sandbox.stub(Helper, 'hasClass').returns(false);
      Helper.toggleClass({}, 'something');
      test.expect(1);
      test.ok(addStub.calledOnce);
      test.done();
  },
  // toggleClass
  'remove class name already on element': function(test) {
      var removeStub = sandbox.stub(Helper, 'removeClass');
      
      sandbox.stub(Helper, 'hasClass').returns(true);
      Helper.toggleClass({}, 'something');
      test.expect(1);
      test.ok(removeStub.calledOnce);
      test.done();
  },
  // findWordWithPrefix
  'find word in string that has a particular prefix': function(test) {
      var checkStr = 'random something rd3-word more',
        result = Helper.findWordWithPrefix('rd3-', checkStr);
    
      test.expect(1);
      test.equal(result, 'word');
      test.done();
  },
  // findWordWithPrefix
  'return empty string when prefixed word not found': function(test) {
      var checkStr = 'random something word more',
        result = Helper.findWordWithPrefix('rd3-', checkStr);
    
      test.expect(1);
      test.equal(result, '');
      test.done();
  }
};
