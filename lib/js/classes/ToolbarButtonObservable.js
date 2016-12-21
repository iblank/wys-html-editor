/*globals module, require, console, window, document, setTimeout, CustomEvent*/
'use strict';
class ToolbarButtonObservable {
    constructor() {
        this.observers = [];
    }

    register(observer) {
        this.observers.push(observer);
    }

    notifyToolbarBtnClick(btnclass) {
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i].notifyToolbarBtnClick(btnclass);
        }
    }
}

module.exports = ToolbarButtonObservable;