# stylelint-plugin-postcss-themed

Validate your usage of postcss-themed.

## Installation

First install the plugin.

```sh
npm i --save-dev stylelint-plugin-postcss-themed
# or with yarn
yarn add -D stylelint-plugin-postcss-themed
```

## Usage

Then include the plugin in your `stylelint` configuration.
This plugin accepts the `config` and `defaultTheme` options from `postcss-themed`.

**`.stylelintrc.js`**

```js
const { themes } = require('@cgds/themes');

module.exports = {
  plugins: ['stylelint-plugin-postcss-themed'],
  rules: {
    'postcss-themed/valid': [true, { config: themes }],
  },
};
```
