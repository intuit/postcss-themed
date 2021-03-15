import postcss from 'postcss';
import fs from 'fs';
import debug from 'debug';
import merge from 'deepmerge';
import * as caniuse from 'caniuse-api';
import browserslist from 'browserslist';
import * as tsNode from 'ts-node';

import {
  getThemeFilename,
  normalizeTheme,
  resolveThemeExtension,
} from './common';
import { modernTheme } from './modern';
import { legacyTheme } from './legacy';
import {
  ComponentTheme,
  PostcssThemeConfig,
  PostcssThemeOptions,
  ThemeResolver,
} from './types';

const log = debug('postcss-themed');

tsNode.register({
  compilerOptions: { module: 'commonjs' },
  transpileOnly: true,
});

/** Try to load component theme from same directory as css file */
export const configForComponent = (
  cssFile: string | undefined,
  rootTheme: PostcssThemeConfig,
  resolveTheme?: ThemeResolver
): PostcssThemeConfig | {} => {
  if (!cssFile) {
    return {};
  }

  try {
    let componentConfig: ComponentTheme | { default: ComponentTheme };

    if (resolveTheme) {
      componentConfig = resolveTheme(cssFile);
    } else {
      const theme = getThemeFilename(cssFile);
      delete require.cache[require.resolve(theme)];
      // eslint-disable-next-line security/detect-non-literal-require, global-require
      componentConfig = require(theme);
    }

    const fn =
      'default' in componentConfig ? componentConfig.default : componentConfig;
    return fn(rootTheme);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw error;
    } else {
      log(error);
    }

    return {};
  }
};

/** Generate a theme */
const themeFile = (options: PostcssThemeOptions = {}) => (
  root: postcss.Root,
  result: postcss.Result
) => {
  // Postcss-modules runs twice and we only ever want to process the CSS once
  // @ts-ignore
  if (root.source.processed) {
    return;
  }

  const { config, resolveTheme } = options;

  if (!config) {
    throw Error('No config provided to postcss-themed');
  }

  if (!root.source) {
    throw Error('No source found');
  }

  const globalConfig = normalizeTheme(config);
  const componentConfig = normalizeTheme(
    configForComponent(root.source.input.file, config, resolveTheme)
  );
  const mergedConfig = merge(globalConfig, componentConfig);

  resolveThemeExtension(mergedConfig);

  if (caniuse.isSupported('css-variables', browserslist())) {
    modernTheme(root, mergedConfig, options);
  } else {
    legacyTheme(root, mergedConfig, options);
  }

  // @ts-ignore
  root.source.processed = true;

  if (!resolveTheme && root.source.input.file) {
    const themeFilename = getThemeFilename(root.source.input.file);

    if (fs.existsSync(themeFilename)) {
      result.messages.push({
        plugin: 'postcss-themed',
        type: 'dependency',
        file: themeFilename,
      });
    }
  }
};

export * from './types';
export default postcss.plugin('postcss-themed', themeFile);
