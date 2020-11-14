import postcss from 'postcss';
import crypto from 'crypto';
import fs from 'fs';

import localizeIdentifier from '../localize-identifier';
import {
  ColorScheme,
  LightDarkTheme,
  PostcssStrictThemeConfig,
  PostcssThemeOptions,
  ScopedNameFunction,
  SimpleTheme
} from '../types';
import {
  hasDarkMode,
  parseThemeKey,
  replaceTheme,
  replaceThemeRoot
} from '../common';

/** Create a CSS variable override block for a given selector */
const createModernTheme = (
  selector: string,
  theme: SimpleTheme,
  transform: (value: string) => string
) => {
  const rule = postcss.rule({ selector });
  const decls = Object.entries(theme).map(([prop, value]) =>
    postcss.decl({
      prop: `--${transform(prop)}`,
      value: `${value}`
    })
  );

  if (decls.length === 0) {
    return;
  }

  rule.append(decls);

  return rule;
};

/** Merge a given theme with a base theme */
const mergeConfigs = (theme: LightDarkTheme, defaultTheme: LightDarkTheme) => {
  const merged = defaultTheme;

  for (const [colorScheme, values] of Object.entries(theme)) {
    for (const [key, value] of Object.entries(values)) {
      merged[colorScheme as ColorScheme][key] = value;
    }
  }

  return merged;
};

const defaultLocalizeFunction = (
  name: string,
  filePath: string,
  css: string
) => {
  const hash = crypto
    .createHash('md5')
    .update(css)
    .digest('hex')
    .slice(0, 6);
  return `${filePath || 'default'}-${name}-${hash}`;
};

const getLocalizeFunction = (
  modules: string | ScopedNameFunction | undefined,
  resourcePath: string | undefined
) => {
  if (typeof modules === 'function' || modules === 'default') {
    let fileContents = '';
    if (resourcePath) {
      fileContents = fs.readFileSync(resourcePath, 'utf8');
    }

    const localize =
      typeof modules === 'function' ? modules : defaultLocalizeFunction;
    return (name: string) => {
      return localize(name, resourcePath || '', fileContents);
    };
  }

  return (name: string) =>
    localizeIdentifier({ resourcePath }, modules || '[local]', name);
};

/** Accomplish theming by creating CSS variable overrides  */
export const modernTheme = (
  root: postcss.Root,
  componentConfig: PostcssStrictThemeConfig,
  options: PostcssThemeOptions
) => {
  const usage = new Map<string, number>();
  const defaultTheme = options.defaultTheme || 'default';
  const singleTheme = options.forceSingleTheme || undefined;
  const optimizeSingleTheme = options.optimizeSingleTheme;
  const inlineRootThemeVariables =
    typeof options.inlineRootThemeVariables === 'undefined'
      ? true
      : options.inlineRootThemeVariables;
  const resourcePath = root.source ? root.source.input.file : '';
  const localize = getLocalizeFunction(options.modules, resourcePath);

  const defaultThemeConfig = Object.entries(componentConfig).find(
    ([theme]) => theme === defaultTheme
  );
  const hasRootDarkMode =
    defaultThemeConfig && hasDarkMode(defaultThemeConfig[1]);

  // For single theme mode, we need to handle themes that may be incomplete
  // In that case, we merge the theme with default so all variables are present
  const singleThemeConfig = Object.entries(componentConfig).find(
    ([theme]) => theme === singleTheme
  );

  let mergedSingleThemeConfig = defaultThemeConfig
    ? defaultThemeConfig[1]
    : { light: {}, dark: {} };

  if (defaultThemeConfig && singleThemeConfig && defaultTheme !== singleTheme) {
    mergedSingleThemeConfig = mergeConfigs(
      singleThemeConfig[1],
      defaultThemeConfig[1]
    );
  }

  const hasMergedDarkMode =
    mergedSingleThemeConfig && hasDarkMode(mergedSingleThemeConfig);

  // 1a. walk again to optimize inline default values
  root.walkRules(rule => {
    rule.selector = replaceThemeRoot(rule.selector);

    rule.walkDecls(decl => {
      decl.value.split(/(?=@theme)/g).forEach(chunk => {
        const key = parseThemeKey(chunk);
        if (key) {
          const count = usage.has(key) ? usage.get(key)! + 1 : 1;
          usage.set(key, count);
        }
      });
    });
  });

  // 1b. Walk each declaration and replace theme vars with CSS vars
  root.walkRules(rule => {
    rule.selector = replaceThemeRoot(rule.selector);

    rule.walkDecls(decl => {
      while (decl.value.includes('@theme')) {
        const key = parseThemeKey(decl.value);
        if (singleTheme && !hasMergedDarkMode && optimizeSingleTheme) {
          // If we are only building a single theme with light mode, we can optionally insert the value
          if (mergedSingleThemeConfig.light[key]) {
            decl.value = replaceTheme(
              decl.value,
              mergedSingleThemeConfig.light[key]
            );
          } else {
            root.warn(
              root.toResult(),
              `Could not find key ${key} in theme configuration. Removing declaration.`,
              { node: decl }
            );
            decl.remove();
            break;
          }
        } else {
          if (
            inlineRootThemeVariables &&
            usage.has(key) &&
            usage.get(key) === 1
          ) {
            decl.value = replaceTheme(
              decl.value,
              `var(--${localize(key)}, ${
                mergedSingleThemeConfig['light'][key]
              })`
            );
          } else {
            decl.value = replaceTheme(decl.value, `var(--${localize(key)})`);
          }
        }
      }
    });
  });

  // 2. Create variable declaration blocks
  const filterUsed = (
    colorScheme: ColorScheme,
    themeConfig: LightDarkTheme,
    filterFunction = ([name]: string[]) => usage.has(name)
  ): SimpleTheme =>
    Object.entries(themeConfig[colorScheme])
      .filter(filterFunction)
      .reduce((acc, [name, value]) => ({ ...acc, [name]: value }), {});

  const addRootTheme = (themConfig: LightDarkTheme) => {
    // if inlineRootThemeVariables then only add vars to root that are used more than once
    const func = inlineRootThemeVariables
      ? ([name]: string[]) => usage.has(name) && usage.get(name)! > 1
      : undefined;

    return createModernTheme(
      ':root',
      filterUsed('light', themConfig, func),
      localize
    );
  };

  // 2a. If generating a single theme, simply generate the default
  if (singleTheme) {
    const rules: (postcss.Rule | undefined)[] = [];
    const rootRules = addRootTheme(mergedSingleThemeConfig);

    if (hasMergedDarkMode) {
      rules.push(
        createModernTheme(
          '.dark',
          filterUsed('dark', mergedSingleThemeConfig),
          localize
        )
      );
      rules.push(rootRules);
    }
    if (!optimizeSingleTheme) {
      rules.push(rootRules);
    }

    root.append(...rules.filter((x): x is postcss.Rule => Boolean(x)));
    return;
  }

  // 2b. Under normal operation, generate CSS variable blocks for each theme
  Object.entries(componentConfig).forEach(([theme, themeConfig]) => {
    const rules: (postcss.Rule | undefined)[] = [];

    if (theme !== defaultTheme) {
      if (hasDarkMode(themeConfig)) {
        rules.push(
          createModernTheme(
            `.${theme}.light`,
            filterUsed('light', themeConfig),
            localize
          ),
          createModernTheme(
            `.${theme}.dark`,
            filterUsed('dark', themeConfig),
            localize
          )
        );
      } else {
        rules.push(
          createModernTheme(
            hasRootDarkMode ? `.${theme}.light` : `.${theme}`,
            filterUsed('light', themeConfig),
            localize
          )
        );
      }
    } else {
      rules.push(addRootTheme(themeConfig));
      rules.push(
        createModernTheme('.dark', filterUsed('dark', themeConfig), localize)
      );
    }

    root.append(...rules.filter((x): x is postcss.Rule => Boolean(x)));
  });
};
