/*globals module, require, console, window, document, setTimeout, CustomEvent*/
class ToolbarButtonObservable {
    constructor() {
        this.observers = [];
    }

    register(observer) {
        this.observers.push(observer);
    }

    notify(btnclass) {
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i].notify(btnclass);
        }
    }
}

module.exports = ToolbarButtonObservable;