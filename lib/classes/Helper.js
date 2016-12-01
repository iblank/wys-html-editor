/*jshint -W032 */ /* ignore unnecessary semicolon */
/*globals module*/
'use strict';
class Helper {
  static mergeObjs(obj1, obj2) {
    var obj3 = {},
        attrname;

    for (attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }

  static hasClass(el, className) {
    var reg;

    if (el.classList) {
      return el.classList.contains(className);
    } else {
      reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      return !!el.className.match(reg);
    }
  }

  static addClass(el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else if (!this.hasClass(el, className)) {
      el.className += ' ' + className;
    }
  }

  static removeClass(el, className) {
    var reg;

    if (el.classList) {
      el.classList.remove(className);
    } else if (this.hasClass(el, className)) {
      reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      el.className = el.className.replace(reg, ' ');
    }
  }

  static toggleClass(el, className) {
    if (this.hasClass(el, className)) {
      this.removeClass(el, className);
    } else {
      this.addClass(el, className);
    }
  }

  static findWordWithPrefix(prefix, str) {
    var regex = new RegExp("\\b" + prefix + "(\\S+)", "gi"),
        match = str.match(regex);

    if (match) {
      return match[0].replace(prefix, '');
    }

    return '';
  }
};

module.exports = Helper;