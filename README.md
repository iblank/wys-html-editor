# wys-html-editor

A lightweight Javascript WYSIWYG editor.

## Currently in development
This project is just getting started, so please be patient. Bold and italicize work well, but lists/indention use the browser execCommand only. The plan is to fix those actions to be more consistent between browsers and to add several other features.

## Getting Started
### Try it out
[demo](https://rawgit.com/iblank/wys-html-editor/develop/demo/index.html)

### On the server
Install the module with: `npm install wys-html-editor`

```javascript
var wys_html_editor = require('wys-html-editor'),
    elem = document.getElementById('wyseditor'),
    editor = new wys_html_editor(elem);
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

_Also, please don't edit files in the "dist" subdirectory as they are generated via Grunt. You'll find source code in the "lib" subdirectory!_

## Release History
_(Nothing yet)_

## License
Copyright (c) 2016 Ian Collins  
Licensed under the MIT license.
