# wys-html-editor

A lightweight Javascript WYSIWYG editor.

## Getting Started
### On the server
Install the module with: `npm install wys-html-editor`

```javascript
var wys_html_editor = require('wys-html-editor'),
    elem = document.getElementById('wyseditor'),
    editor = new wys_html_editor(elem);
```

### In the browser
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/iblank/wys-html-editor/master/dist/wys-html-editor.min.js
[max]: https://raw.github.com/iblank/wys-html-editor/master/dist/wys-html-editor.js

Check out the current demo:
[Sample demo](http://htmlpreview.github.io/?https://github.com/iblank/wys-html-editor/blob/develop/demo/index.html)

In your web page:

```html
<script src="dist/wys-html-editor.min.js"></script>
<script>
awesome(); // "awesome"
</script>
```

In your code, you can attach wys-html-editor's methods to any object.

```html
<script>
var exports = Bocoup.utils;
</script>
<script src="dist/wys-html-editor.min.js"></script>
<script>
Bocoup.utils.awesome(); // "awesome"
</script>
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
