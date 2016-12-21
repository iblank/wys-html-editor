/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
var ToolbarButton = require("./ToolbarButton"),
    ToolbarButtonObservable = require("./ToolbarButtonObservable"),
    Helper = require("./Helper");

class Toolbar extends ToolbarButtonObservable {
    constructor(options) {
        super();
        this.focus = false;
        this.buttonObjs = {};
        this.options = options || null;
        this.bar = options['doc'].createElement('div');
        this.bar.style.display = 'none';
        this.buttonMap = {
            'b': ['bold', '<strong>B</strong>', 'strong'],
            'i': ['italic', '<em>I</em>', 'em'],
            'ul': ['list', '&bullet;', 'ul'],
            'ol': ['ordered-list', '1.', 'ol'],
            'indent': ['indent', '--&gt;', 'indent', 'special'],
            'outdent': ['outdent', '&lt;--', 'outdent', 'special']
        };
    }

    static createInstance(options) {
        if (!this.instance) {
            this.instance = new Toolbar(options);
            this.instance.bar.classList.add('wys-html-editor-toolbar');
            this.instance.bar.appendChild(this.instance.createButtons());
        }

        return this.instance;
    }

    setFocus(focus) {
        this.focus = focus;
    }

    hasFocus() {
        return this.focus;
    }

    show() {
        this.bar.style.display = 'block';
    }

    hide() {
        this.bar.style.display = 'none';
    }

    isHidden() {
        return this.bar.style.display === 'none';
    }

    createButtons() {
        var ul = this.options['doc'].createElement('ul'),
            btns = this.options.toolbar,
            i, toolBarButton;

        for (i = 0; i < btns.length; i++) {
            // if it's a recognized button
            if (btns[i] in this.buttonMap) {
                toolBarButton = ToolbarButton.create(btns[i], this.buttonMap, this.options);
                // add each button to an array, to keep track of them
                toolBarButton.register(this);
                this.buttonObjs[this.buttonMap[btns[i]][2]] = toolBarButton.btnNode;
                ul.appendChild(toolBarButton.li);

            }
        }

        return ul;
    }

    setPosition(dims) {
        var scrollPos = this.options.win.pageYOffset,
            tb_width = this.bar.offsetWidth,
            tb_height = this.bar.offsetHeight + 8,
            top = Math.round(dims.y - tb_height),
            left = Math.round(dims.x + (dims.w / 2) - (tb_width / 2));

        // TODO: this will be useful for the widget button later...
        // if (this.domHelper.isEmptyPara(this.selection.selectElem)) {
        //   top = this.selection.selectElem.offsetTop - tb_height;
        //   left = this.selection.selectElem.offsetLeft - (tb_width / 2);
        // }

        // keep toolbar from overflowing left of screen
        if (left < 0) {
            left = 0;
        }
        // keep toolbar from overflowing top of screen
        if (top < 0) {
            top = Math.round(dims.y + dims.h + 8);
            Helper.addClass(this.bar, 'below');
        } else {
            Helper.removeClass(this.bar, 'below');
        }

        // apply the position
        this.bar.style.top = top + 'px';
        this.bar.style.left = left + 'px';
    }

    // matches the current tags from the selection against
    // the buttons in the toolbar
    highlightButtons(tags) {
        var i, tag, listShown = false;

        // remove active class from all the buttons
        this.unHighlightButtons();
        for (i = tags.length - 1; i >= 0; i--) {
            tag = tags[i].toLowerCase();
            // if the tag matches a button, set it to active
            if (tag in this.buttonObjs) {
                Helper.addClass(this.buttonObjs[tag], 'active');
            }
            if (tag === 'li' && !listShown) {
                if (this.buttonObjs['indent']) {
                    Helper.addClass(this.buttonObjs['indent'], 'show');
                }
                if (this.buttonObjs['outdent']) {
                    Helper.addClass(this.buttonObjs['outdent'], 'show');
                }
                listShown = true;
            }
            if (tag === 'ul' || tag === 'ol') {
                break;
            }
        }
    }

    // remove active class from all buttons
    unHighlightButtons() {
        var i;

        for (i in this.buttonObjs) {
            Helper.removeClass(this.buttonObjs[i], 'show');
            Helper.removeClass(this.buttonObjs[i], 'active');
        }
    }
}

module.exports = Toolbar;