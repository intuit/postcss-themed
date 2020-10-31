import postcss from "postcss";
import crypto from 'crypto';
import fs from 'fs';

import localizeIdentifier from "../localize-identifier";
import { ColorScheme, LightDarkTheme, PostcssStrictThemeConfig, PostcssThemeOptions, ScopedNameFunction, SimpleTheme } from "../types";
import { hasDarkMode, parseThemeKey, replaceTheme, replaceThemeRoot } from "../common";

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
}

const getLocalizeFunction = (
  modules: string | ScopedNameFunction | undefined,
  resourcePath: string | undefined
) => {
  if (typeof modules === 'function' || modules === 'default') {
    let fileContents = '';
    if (resourcePath) {
      fileContents = fs.readFileSync(resourcePath, 'utf8');
    }

    const localize = typeof modules === 'function' ? modules : defaultLocalizeFunction;
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
  globalConfig: PostcssStrictThemeConfig,
  options: PostcssThemeOptions
) => {
  const usage = new Set<string>();
  const defaultTheme = options.defaultTheme || 'default';
  const singleTheme = options.forceSingleTheme || undefined;
  const optimizeSingleTheme = options.optimizeSingleTheme;
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

  // 1. Walk each declaration and replace theme vars with CSS vars
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
          decl.value = replaceTheme(decl.value, `var(--${localize(key)})`);
        }

        usage.add(key);
      }
    });
  });

  // 2. Create variable declaration blocks
  const filterUsed = (
    colorScheme: ColorScheme,
    theme: string,
    themeConfig: LightDarkTheme
  ): SimpleTheme =>
    Object.entries(themeConfig[colorScheme])
      .filter(
        ([name]) => usage.has(name) || !globalConfig[theme][colorScheme][name]
      )
      .reduce((acc, [name, value]) => ({ ...acc, [name]: value }), {});

  // 2a. If generating a single theme, simply generate the default
  if (singleTheme) {
    const rules: (postcss.Rule | undefined)[] = [];

    if (hasMergedDarkMode) {
      rules.push(
        createModernTheme(
          ':root',
          filterUsed('light', singleTheme, mergedSingleThemeConfig),
          localize
        ),
        createModernTheme(
          '.dark',
          filterUsed('dark', singleTheme, mergedSingleThemeConfig),
          localize
        )
      );
    } else if (!optimizeSingleTheme) {
      rules.push(
        createModernTheme(
          ':root',
          filterUsed('light', singleTheme, mergedSingleThemeConfig),
          localize
        )
      );
    }

    root.append(...rules.filter((x): x is postcss.Rule => Boolean(x)));
    return;
  }

  // 2b. Under normal operation, generate CSS variable blocks for each theme
  Object.entries(componentConfig).forEach(([theme, themeConfig]) => {
    const rules: (postcss.Rule | undefined)[] = [];
    const isDefault = theme === defaultTheme;
    const rootClass = isDefault ? ':root' : `.${theme}`;

    if (hasDarkMode(themeConfig)) {
      rules.push(
        createModernTheme(
          isDefault ? rootClass : `${rootClass}.light`,
          filterUsed('light', theme, themeConfig),
          localize
        ),
        createModernTheme(
          isDefault ? '.dark' : `${rootClass}.dark`,
          filterUsed('dark', theme, themeConfig),
          localize
        )
      );
    } else if (hasRootDarkMode) {
      rules.push(
        createModernTheme(
          isDefault ? rootClass : `${rootClass}.light`,
          filterUsed('light', theme, themeConfig),
          localize
        )
      );
    } else {
      rules.push(
        createModernTheme(
          rootClass,
          filterUsed('light', theme, themeConfig),
          localize
        )
      );
    }

    root.append(...rules.filter((x): x is postcss.Rule => Boolean(x)));
  });
};

