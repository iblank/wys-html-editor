/*jslint browser:true */
'use strict';

var DOMHelper = require("../lib/js/classes/DOMHelper"),
    MockBrowser = require('mock-browser').mocks.MockBrowser,
    sinon = require("sinon"),
    sandbox;

exports['DOMHelper'] = {
    domhelper: {},
    setUp: function(done) {
        var mockBrow = new MockBrowser(),
            document = mockBrow.getDocument();
        
        this.domhelper = new DOMHelper(document);
        sandbox = sinon.sandbox.create();
        done();
    },
    tearDown: function(done) {
        sandbox.restore();
        done();
    },
    // isEmpty
    'is the element empty': function(test) {
        var el = {
                textContent: ' something  '
            };

        test.expect(1);
        test.ok(!this.domhelper.isEmpty(el));
        test.done();
    },
    // isEmptyPara
    'is the element empty and a paragraph': function(test) {
        var el = {
                textContent: '',
                tagName: 'P'
            };

        test.expect(1);
        test.ok(this.domhelper.isEmptyPara(el));
        test.done();
    },
    // cleanHTML
    'standardizes html within dom element': function(test) {
        var html = '<p>something here.</p>Random text<badtag>Bad <b>tag</b> sentence.</badtag>',
            expect = '<p>something here.</p><p>Random text</p><p>Bad <strong>tag</strong> sentence.</p>',
            element = this.domhelper.doc.createElement('div'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanHTML(element);
        test.expect(1);
        test.equal(cleaned, expect);
        test.done();
    },
    // cleanInternal
    'deep cleans the html within a dom node': function(test) {
        var html = '<blockquote><p>something</p> random <strong>here</strong>.</blockquote>',
            expect = '<blockquote><p>something</p><p>random <strong>here</strong>.</p></blockquote>',
            element = this.domhelper.doc.createElement('div'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanInternal(element, 'div', true);
        test.expect(1);
        test.equal(cleaned, expect);
        test.done();
    },
    // cleanInternalFirstChild
    'return valid html and wraps textnode in p tag': function(test) {
        var expect = ['something ', 'p'],
            element = this.domhelper.doc.createTextNode('something '),
            result;

        result = this.domhelper.cleanInternalFirstChild(element);
        test.expect(1);
        test.deepEqual(result, expect);
        test.done();
    },
    // cleanInternalFirstChild
    'return valid html and wraps inline node in p tag': function(test) {
        var expect = ['<strong>bolded text</strong>', 'p'],
            element = this.domhelper.doc.createElement('strong'),
            result;

        element.innerHTML = 'bolded text';
        result = this.domhelper.cleanInternalFirstChild(element);
        test.expect(1);
        test.deepEqual(result, expect);
        test.done();
    },
    // cleanInternalFirstChild
    'return valid html and replaces invalid block tag with p tag': function(test) {
        var html = 'some <strong>bolded</strong> text.',
            expect = ['<p>some <strong>bolded</strong> text.</p>', ''],
            element = this.domhelper.doc.createElement('address'),
            result;

        element.innerHTML = html;
        result = this.domhelper.cleanInternalFirstChild(element);
        test.expect(1);
        test.deepEqual(result, expect);
        test.done();
    },
    // cleanInternalChild
    'returns valid html with particular node, tag is list, child is li': function(test) {
        var html = 'something <strong>here</strong>',
            expect = '<li>something <strong>here</strong></li>',
            element = this.domhelper.doc.createElement('li'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanInternalChild(element, 'ul');
        test.expect(2);
        test.equal(cleaned[0], expect);
        test.equal(cleaned[1], '');
        test.done();
    },
    // cleanInternalChild
    'returns valid html with particular node, tag is list, child is not li': function(test) {
        var html = 'something <strong>here</strong>',
            expect = 'something <strong>here</strong>',
            element = this.domhelper.doc.createElement('div'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanInternalChild(element, 'ul');
        test.expect(2);
        test.equal(cleaned[0], expect);
        test.equal(cleaned[1], 'li');
        test.done();
    },
    // cleanInternalChild
    'returns valid html with particular node, tag is li': function(test) {
        var html = '<li>item1</li><li>item2</li>',
            expect = '<ol><li>item1</li><li>item2</li></ol>',
            element = this.domhelper.doc.createElement('ol'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanInternalChild(element, 'li');
        test.expect(2);
        test.equal(cleaned[0], expect);
        test.equal(cleaned[1], '');
        test.done();
    },
    // cleanInternalChild
    'returns valid html with particular node, tag is blockquote': function(test) {
        var html = '<li>item1</li> <li>item2</li>',
            expect = 'item1 item2',
            element = this.domhelper.doc.createElement('div'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanInternalChild(element, 'blockquote');
        test.expect(2);
        test.equal(cleaned[0], expect);
        test.equal(cleaned[1], 'p');
        test.done();
    },
    // cleanInternalChild
    'returns valid html with particular node, tag is footer, child is cite': function(test) {
        var html = 'something <strong>here</strong>',
            expect = '<cite>something <strong>here</strong></cite>',
            element = this.domhelper.doc.createElement('cite'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanInternalChild(element, 'footer');
        test.expect(2);
        test.equal(cleaned[0], expect);
        test.equal(cleaned[1], '');
        test.done();
    },
    // cleanInternalChild
    'returns valid html with particular node, tag is footer, child is not cite': function(test) {
        var html = 'something <strong>here</strong>',
            expect = 'something <strong>here</strong>',
            element = this.domhelper.doc.createElement('div'),
            cleaned;

        element.innerHTML = html;
        cleaned = this.domhelper.cleanInternalChild(element, 'footer');
        test.expect(2);
        test.equal(cleaned[0], expect);
        test.equal(cleaned[1], 'cite');
        test.done();
    },
    // cleanInternalChild
    'returns valid html with particular node, tag is empty textnode inside block element': function(test) {
        var html = '<li>something</li>    <strong>here</strong>',
            element = this.domhelper.doc.createElement('ul'),
            nodes,
            emptyEl,
            cleaned;

        element.innerHTML = html;
        nodes = element.childNodes;
        emptyEl = nodes[1]; // spaces textnode
        cleaned = this.domhelper.cleanInternalChild(emptyEl, 'ul');
        test.expect(2);
        test.equal(cleaned[0], '');
        test.equal(cleaned[1], '');
        test.done();
    },
    // inlineOnly
    'returns tag if it is inline': function(test) {
        var tag = 'strong',
            newTag;

        newTag = this.domhelper.inlineOnly(tag);
        test.expect(1);
        test.equal(newTag, tag);
        test.done();
    },
    // inlineOnly
    'returns empty string if it is not inline and not exception': function(test) {
        var tag = 'p',
            newTag;

        newTag = this.domhelper.inlineOnly(tag, ['ul']);
        test.expect(1);
        test.equal(newTag, '');
        test.done();
    },
    // inlineOnly
    'returns tag if it is an exception': function(test) {
        var tag = 'p',
            newTag;

        newTag = this.domhelper.inlineOnly(tag, ['p']);
        test.expect(1);
        test.equal(newTag, tag);
        test.done();
    },
    // wrapHTML
    'wrap html in given tag, also trims inside of block tag': function(test) {
        var html = '    something <strong>here</strong>.    ',
            tag = 'p',
            expect = '<p>something <strong>here</strong>.</p>',
            result = this.domhelper.wrapHTML(html, tag);

        test.expect(1);
        test.equal(result, expect);
        test.done();
    },
    // wrapHTML
    'return html if tag is empty string': function(test) {
        var html = 'something <strong>here</strong>.',
            tag = '',
            expect = 'something <strong>here</strong>.',
            result = this.domhelper.wrapHTML(html, tag);

        test.expect(1);
        test.equal(result, expect);
        test.done();
    },
    // removeEmptyDomTags
    'finds empty nodes with given tag and removes them': function(test) {
        var html = '<p>something <strong>here</strong>.</p><p>And, <strong> </strong> this.</p>',
            tag = 'strong',
            element = this.domhelper.doc.createElement('div'),
            removeChildStub = sandbox.stub(element, 'removeChild');

        element.innerHTML = html;
        this.domhelper.removeEmptyDomTags(element, tag);
        test.expect(1);
        test.ok(removeChildStub.calledOnce);
        test.done();
    },
    // swapTags
    'copies all elements of one tag and moves it to a new tag': function(test) {
        var html = 'something <strong>here</strong>.',
            tag = 'div',
            element = this.domhelper.doc.createElement('p'),
            parent = this.domhelper.doc.createElement('div'),
            replaceChildStub;

        element.innerHTML = html;
        element.setAttribute('class', 'someClass');
        parent.appendChild(element);
        replaceChildStub = sandbox.stub(element.parentNode, 'replaceChild');
        this.domhelper.swapTags(element, tag);
        test.expect(1);
        test.ok(replaceChildStub.calledOnce);
        test.done();
    },
    // removeEmptyTags
    'use regex to remove empty tags in html string': function(test) {
        var html = '<p>something <strong>here</strong>.</p><p>And, more < strong >   </  strong >.</p>',
            expect = '<p>something <strong>here</strong>.</p><p>And, more .</p>',
            result = this.domhelper.removeEmptyTags(html, 'strong');

        test.expect(1);
        test.equal(expect, result);
        test.done();
    },
    // replaceTags
    'use regex to replace certain tags with another': function(test) {
        var html = '<p>something <strong>here</strong>.</p><p>And, more <b>here</b>.</p>',
            expect = '<p>something <strong>here</strong>.</p><p>And, more <strong>here</strong>.</p>',
            result = this.domhelper.replaceTags(html, 'b', 'strong');

        test.expect(1);
        test.equal(expect, result);
        test.done();
    }
};
