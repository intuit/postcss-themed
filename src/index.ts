import fs from 'node:fs';
import type { PluginCreator, Rule } from 'postcss';
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
  generateThemeCss,
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
      let alternateThemes: PostcssStrictThemeConfig | undefined;

      const localize = createLocalizer(options.modules, result);

      const selectors = new Map<string, Rule>();
      const variableNames = new Map<string, string>();
      const multiUseKeys = new Set<string>();

      return {
        /**
         * Remove any CSS variable defaults for tokens that are used more than once
         */
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
            multiUseKeys.has(variableNames.get(key)!)
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
            const themeValueLight = get(baseTheme.light, key);
            const themeValueDark = get(baseTheme.dark, key);

            if (!themeValueLight) {
              throw decl.error(
                `Could not find key ${key} in theme configuration.`,
                { word: decl.value },
              );
            }

            if (typeof themeValueLight !== 'string') {
              return;
            }

            if (options.forceSingleTheme && options.optimizeSingleTheme) {
              decl.value = themeValueLight;
            } else if (
              multiUseKeys.has(key) &&
              options.inlineRootThemeVariables
            ) {
              decl.value = replaceTheme(decl.value, `var(--${variableName})`);
            } else {
              decl.value = replaceTheme(
                decl.value,
                `var(--${variableName}, ${themeValueLight})`,
              );
            }

            if (variableNames.has(variableName)) {
              multiUseKeys.add(key);
            } else {
              variableNames.set(variableName, key);

              if (themeValueDark && themeValueDark !== themeValueLight) {
                const darkModeSelector = selectors.get(options.darkClass)!;
                const darkDeclaration = new helpers.Declaration({
                  prop: `--${variableName}`,
                  value: `${themeValueDark}`,
                });
                darkModeSelector.append(darkDeclaration);
                selectors.set(options.darkClass, darkModeSelector);
              }
            }
          }
        },
        OnceExit(root, helpers) {
          /**
           * First, handle adding :root
           */
          if (options?.inlineRootThemeVariables && multiUseKeys.size > 0) {
            const rootSelector = new helpers.Rule({ selector: ':root' });

            for (const key of multiUseKeys) {
              const declaration = new helpers.Declaration({
                prop: `--${localize(key)}`,
                value: `${get(baseTheme.light, key)}`,
              });

              rootSelector.append(declaration);
            }

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

          /**
           * Lastly, walk through the remaining themes and create rules
           */
          if (alternateThemes) {
            generateThemeCss({
              baseTheme,
              alternateThemes,
              variableNames,
              root,
              helpers,
              options,
              localize,
            });
          }
        },
        async Once(root, helpers) {
          if (!root.source) {
            throw new Error('No source found');
          }

          const configs = await createThemeConfigs(options, result);
          theme = configs.theme;
          baseTheme = configs.baseTheme;
          alternateThemes = configs.alternateThemes;

          /**
           * Setup dark class name selector to allow appending of declarations
           */
          selectors.set(
            options.darkClass,
            new helpers.Rule({
              selector: options.darkClass,
            }),
          );

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
