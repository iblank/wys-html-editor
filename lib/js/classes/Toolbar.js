 /*globals module, require, console, window, document, setTimeout, CustomEvent*/
 var ToolbarButton = require("./ToolbarButton"),
     ToolbarButtonObservable = require("./ToolbarButtonObservable");

 class Toolbar extends ToolbarButtonObservable {
     constructor(options) {
         super();
         this.buttonObjs = {};
         this.options = options || null;
         this.bar = options['doc'].createElement('div');
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
             this.instance.bar.appendChild(this.instance.createToolbarButtons());
         }

         return this.instance;
     }

     createToolbarButtons() {
         var ul = this.options['doc'].createElement('ul'),
             btns = this.options.toolbar,
             i, toolBarButton;

         for (i = 0; i < btns.length; i++) {
             // if it's a recognized button
             if (btns[i] in this.buttonMap) {
                 toolBarButton = ToolbarButton.create(btns[i], this.options);
                     // add each button to an array, to keep track of them
                 toolBarButton.register(this);
                 this.buttonObjs[this.buttonMap[btns[i]][2]] = toolBarButton.btnNode;
                 ul.appendChild(toolBarButton.li);

             }
         }

         return ul;
     }
 }

 module.exports = Toolbar;