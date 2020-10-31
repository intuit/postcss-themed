import postcss from 'postcss';
import debug from 'debug';

import { parseThemeKey, replaceTheme, replaceThemeRoot } from '../common';
import { ColorScheme, PostcssStrictThemeConfig, PostcssThemeOptions } from '../types';

const log = debug('postcss-themed');

/** Find all the theme variables in a CSS value and replace them with the configured theme values */
const replaceThemeVariables = (
  config: PostcssStrictThemeConfig,
  theme: string,
  decl: postcss.Declaration,
  colorScheme: 'light' | 'dark' = 'light',
  defaultTheme = 'default',
) => {
  const hasMultiple = (decl.value.match(/@theme/g) || []).length > 1;

  // Found a theme reference
  while (decl.value.includes('@theme')) {
    const themeKey = parseThemeKey(decl.value);

    // Check for issues with theme
    try {
      const themeDefault = config[defaultTheme][colorScheme][themeKey];
      const newValue = config[theme][colorScheme][themeKey];

      decl.value = replaceTheme(
        decl.value,
        hasMultiple ? newValue || themeDefault : newValue
      );

      if (decl.value === 'undefined') {
        decl.remove();
      }
    } catch (error) {
      log(error);
      throw decl.error(`Theme '${theme}' does not contain key '${themeKey}'`, {
        plugin: 'postcss-themed'
      });
    }
  }
}

/** Apply a transformation to a selector */
const applyToSelectors = (selector: string, fn: (selector: string) => string) => {
  return selector
    .replace(/\n/gm, '')
    .split(',')
    .map(fn)
    .join(',');
}

/** Create a new rule by inject injecting theme vars into a class with theme usage */
const createNewRule = (
  componentConfig: PostcssStrictThemeConfig,
  rule: postcss.Rule,
  themedDeclarations: postcss.Declaration[],
  originalSelector: string,
  defaultTheme: string
) => (theme: string, colorScheme: ColorScheme) => {
  if (theme === defaultTheme && colorScheme === 'light') {
    return;
  }

  if (Object.keys(componentConfig[theme][colorScheme]).length === 0) {
    return;
  }

  const themeClass =
    (colorScheme !== 'dark' && `.${theme}`) ||
    (theme === defaultTheme && `.${colorScheme}`) ||
    `.${theme}.${colorScheme}`;

  let newSelector = applyToSelectors(
    originalSelector,
    s => `${themeClass} ${s}`
  );

  if (originalSelector.includes(':theme-root')) {
    rule.selector = replaceThemeRoot(rule.selector);

    if (rule.selector === '*') {
      newSelector = applyToSelectors(rule.selector, s => `${s}${themeClass}`);
    } else {
      newSelector = applyToSelectors(rule.selector, s => `${themeClass}${s}`);
    }
  }

  if (themedDeclarations.length > 0) {
    // Add theme to selector, clone to retain source maps
    const newRule = rule.clone({
      selector: newSelector
    });

    newRule.removeAll();

    // Only add themed declarations to override
    for (const property of themedDeclarations) {
      const declaration = postcss.decl(property);
      replaceThemeVariables(
        componentConfig,
        theme,
        declaration,
        colorScheme,
        defaultTheme
      );

      if (declaration.value !== 'undefined') {
        newRule.append(declaration);
      }
    }

    return newRule;
  }
};

/** Create theme override rule for every theme */
const createNewRules = (
  componentConfig: PostcssStrictThemeConfig,
  rule: postcss.Rule,
  themedDeclarations: postcss.Declaration[],
  defaultTheme: string
) => {
  // Need to remember original selector because we overwrite rule.selector
  // once :theme-root is found. If we don't remember the original value then
  // multiple themes break
  const originalSelector = rule.selector;
  const themes = Object.keys(componentConfig);
  const rules: postcss.Rule[] = [];

  // Create new rules for theme overrides
  for (const themeKey of themes) {
    const theme = componentConfig[themeKey];
    const themeRule = createNewRule(
      componentConfig,
      rule,
      themedDeclarations,
      originalSelector,
      defaultTheme
    );

    for (const colorScheme in theme) {
      const newRule = themeRule(themeKey, colorScheme as ColorScheme);

      if (newRule) {
        rules.push(newRule);
      }
    }
  }

  return rules;
}

/** Accomplish theming by creating new classes to override theme values  */
export const legacyTheme = (
  root: postcss.Root,
  componentConfig: PostcssStrictThemeConfig,
  options: PostcssThemeOptions
) => {
  const {
    defaultTheme = 'default',
    forceSingleTheme = undefined,
    forceEmptyThemeSelectors
  } = options;
  let newRules: postcss.Rule[] = [];

  root.walkRules(rule => {
    const themedDeclarations: postcss.Declaration[] = [];

    // Walk each declaration and find themed values
    rule.walkDecls(decl => {
      const { value } = decl;

      if (value.includes('@theme')) {
        themedDeclarations.push(decl.clone());
        // Replace defaults in original CSS rule
        replaceThemeVariables(
          componentConfig,
          defaultTheme,
          decl,
          'light',
          defaultTheme
        );
      }
    });

    let createNewThemeRules: postcss.Rule[];
    if (forceSingleTheme) {
      createNewThemeRules = [];
    } else {
      createNewThemeRules = createNewRules(
        componentConfig,
        rule,
        themedDeclarations,
        defaultTheme
      );
    }

    newRules = [...newRules, ...createNewThemeRules];
  });

  if (forceEmptyThemeSelectors) {
    const themes = Object.keys(componentConfig);
    const extra = new Set<string>();

    for (const themeKey of themes) {
      const theme = componentConfig[themeKey];

      extra.add(themeKey);

      for (const colorScheme in theme) {
        extra.add(colorScheme);
      }
    }

    extra.forEach(selector =>
      newRules.push(postcss.rule({ selector: `.${selector}` }))
    );
  }

  newRules.forEach(r => {
    if (forceEmptyThemeSelectors || (r.nodes && r.nodes.length > 0)) {
      root.append(r);
    }
  });
};
