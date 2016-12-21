/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
var Helper = require("./Helper"),
    ToolbarButtonObservable = require("./ToolbarButtonObservable");

class ToolbarButton extends ToolbarButtonObservable {
    constructor(buttonMap) {
        super();
        this.li = null;
        this.btnNode = null;
        this.buttonMap = buttonMap;
    }

    clicked(btnclass) {
        this.notifyToolbarBtnClick(btnclass);
    }

    static create(btn, buttonMap, options) {
        var button = new ToolbarButton(buttonMap),
            context = this;

        button.li = options['doc'].createElement('li');
        button.btnNode = options['doc'].createElement('button');

        // add the button class (ex: wys-editor-btn-strong)
        button.btnNode.setAttribute('class', options.classPrefix + 'btn-' + button.buttonMap[btn][2]);
        // if there are additional classes...
        if (button.buttonMap[btn][3]) {
            Helper.addClass(button.btnNode, button.buttonMap[btn][3]);
        }
        // add the button title (ex: bold)
        button.btnNode.title = button.buttonMap[btn][0];
        // add button html (ex: <strong>B</strong>)
        button.btnNode.innerHTML = button.buttonMap[btn][1];

        // add button click listener, with function to respond to event
        button.btnNode.addEventListener("click", function (event) {
            button.clicked(event.target.className);
        }, false);

        button.li.appendChild(button.btnNode);

        return button;
    }
}

module.exports = ToolbarButton;