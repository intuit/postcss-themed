import fs from 'node:fs';
import type { PluginCreator, Result, Rule } from 'postcss';
import { setAutoFreeze } from 'immer';
import get from 'dlv';

import { getThemeFilename, parseThemeKey } from './common';
import {
  PostcssThemeOptions,
  PostcssStrictThemeConfig,
  LightDarkTheme,
} from './types';
import {
  createThemeConfigs,
  replaceTheme,
  createLocalizer,
  parseCssVariable,
  replaceCssVariable,
} from './utils';

setAutoFreeze(false);

const DEFAULT_OPTIONS: PostcssThemeOptions = {
  config: {},
  defaultTheme: 'default',
  lightClass: '.light',
  darkClass: '.dark',
  inlineRootThemeVariables: true,
};

const plugin: PluginCreator<Partial<PostcssThemeOptions>> = (
  opts: Partial<PostcssThemeOptions> = {},
) => {
  const options: PostcssThemeOptions = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };

  const { config, resolveTheme } = options;

  if (!config) {
    throw new Error('No config provided to postcss-themed');
  }

  return {
    postcssPlugin: 'postcss-themed',
    prepare(result) {
      let theme: PostcssStrictThemeConfig;
      let baseTheme: LightDarkTheme;

      const localize = createLocalizer(options.modules, result);

      const tokenUsage = new Map<string, number>();
      const selectors = new Map<string, Rule>();
      const variableNames = new Map<string, string>();

      return {
        DeclarationExit(decl) {
          if (!decl.value) {
            return;
          }

          if (!options.inlineRootThemeVariables) {
            return;
          }

          const key = parseCssVariable(decl.value);

          if (
            variableNames.has(key) &&
            tokenUsage.has(variableNames.get(key)!) &&
            tokenUsage.get(variableNames.get(key)!)! > 1
          ) {
            decl.value = replaceCssVariable(decl.value, `var(--${key})`);
          }
        },
        Declaration(decl, helpers) {
          if (!decl.value) {
            return;
          }

          const key = parseThemeKey(decl.value);

          if (key) {
            const variableName = localize(key);
            variableNames.set(variableName, key);
            const themeValueLight = get(baseTheme.light, key);
            const themeValueDark = get(baseTheme.dark, key);

            // console.log(key, variableName, themeValueLight);

            if (!themeValueLight) {
              throw decl.error(
                `Could not find key ${key} in theme configuration.`,
                { word: decl.value },
              );
            }

            if (tokenUsage.has(key) && options.inlineRootThemeVariables) {
              decl.value = replaceTheme(decl.value, `var(--${variableName})`);
            } else {
              decl.value = replaceTheme(
                decl.value,
                `var(--${variableName}, ${themeValueLight})`,
              );
            }

            if (!tokenUsage.has(key)) {
              tokenUsage.set(key, 1);

              if (themeValueDark && themeValueDark !== themeValueLight) {
                const darkModeSelector = selectors.get(options.darkClass)!;
                const darkDeclaration = new helpers.Declaration({
                  prop: `--${variableName}`,
                  value: `${themeValueDark}`,
                });
                darkModeSelector.append(darkDeclaration);
                selectors.set(options.darkClass, darkModeSelector);
              }

              return;
            }

            const count = tokenUsage.get(key) as number;
            tokenUsage.set(key, count + 1);
          }
        },
        OnceExit(root, helpers) {
          /**
           * First, handle adding root
           */
          const multiuseKeys = [...tokenUsage]
            .filter(([_, count]) => count > 1)
            .map(([key]) => key);

          if (multiuseKeys.length > 0) {
            const rootSelector = new helpers.Rule({ selector: ':root' });
            const declarations = multiuseKeys.map(
              (key) =>
                new helpers.Declaration({
                  prop: `--${localize(key)}`,
                  value: `${get(baseTheme.light, key)}`,
                }),
            );

            rootSelector.append(...declarations);
            // TODO: convert to prepend
            root.append(rootSelector);
          }

          /**
           * Second, append dark mode if there were declarations added
           *
           * This selector was created in Once
           */
          const darkModeSelector = selectors.get(options.darkClass)!;

          if (darkModeSelector?.nodes?.length > 0) {
            root.append(darkModeSelector);
          }
        },
        async Once(root, helpers) {
          if (!root.source) {
            throw new Error('No source found');
          }

          const configs = await createThemeConfigs(options, result);
          theme = configs.theme;
          baseTheme = configs.baseTheme;

          /**
           * Setup dark class name selector to allow appending of declarations
           */
          selectors.set(
            options.darkClass,
            new helpers.Rule({
              selector: options.darkClass,
            }),
          );

          // instead of combining common classnames, just let cssnano do that for the end user

          // modernTheme(root, configs.theme, options);

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
        },
      };
    },
  };
};

export * from './types';
// export default postcss.plugin('postcss-themed', themeFile);

plugin.postcss = true;
export default plugin;
