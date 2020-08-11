import postcss from 'postcss';
import path from 'path';
import fs from 'fs';
import debug from 'debug';
import merge from 'deepmerge';
import * as caniuse from 'caniuse-api';
import browserslist from 'browserslist';
import * as tsNode from 'ts-node';

import localizeIdentifier from './localize-identifier';

const log = debug('postcss-themed');

tsNode.register({
  compilerOptions: { module: 'commonjs' },
  transpileOnly: true
});

type SimpleTheme = Record<string, string>;
type ColorScheme = 'light' | 'dark';
type LightDarkTheme = Record<ColorScheme, SimpleTheme>;
type Theme = SimpleTheme | LightDarkTheme;

interface Config<T> {
  [theme: string]: T;
}

type PostcssThemeConfig = Config<Theme>;
type PostcssStrictThemeConfig = Config<LightDarkTheme>;

export type ComponentTheme = (theme: PostcssThemeConfig) => PostcssThemeConfig;
export type ThemeResolver = (path: string) => ComponentTheme;

type ScopedNameFunction = (
  name: string,
  filename: string,
  css: string
) => string;

export interface PostcssThemeOptions {
  /** Configuration given to the postcss plugin */
  config?: PostcssThemeConfig;
  /** A function to resolve the theme file */
  resolveTheme?: ThemeResolver;
  /** LEGACY - Put empty selectors in final output */
  forceEmptyThemeSelectors?: boolean;
  /** The name of the default theme */
  defaultTheme?: string;
  /** Transform CSS variable names similar to CSS-Modules */
  modules?: string | ScopedNameFunction;
}

/** Get the theme variable name from a string */
function parseThemeKey(value: string) {
  const key = value.match(/@theme ([a-zA-Z-_0-9]+)/);
  return key ? key[1] : '';
}

/** Replace a theme variable reference with a value */
function replaceTheme(value: string, replace: string) {
  return value.replace(/@theme ([a-zA-Z-_0-9]+)/, replace);
}

/** Try to load component theme from same directory as css file */
function configForComponent(
  cssFile: string | undefined,
  rootTheme: PostcssThemeConfig,
  resolveTheme?: ThemeResolver
): PostcssThemeConfig | {} {
  if (!cssFile) {
    return {};
  }

  try {
    let componentConfig: ComponentTheme | { default: ComponentTheme };

    if (resolveTheme) {
      componentConfig = resolveTheme(cssFile);
    } else {
      const theme = path.join(path.dirname(cssFile), 'theme');
      delete require.cache[require.resolve(theme)];
      // eslint-disable-next-line security/detect-non-literal-require, global-require
      componentConfig = require(theme);
    }

    const fn =
      'default' in componentConfig ? componentConfig.default : componentConfig;
    return fn(rootTheme);
  } catch (error) {
    log(error);
    return {};
  }
}

/** Find all the theme variables in a CSS value and replace them with the configured theme values */
function replaceThemeVariables(
  config: PostcssStrictThemeConfig,
  theme: string,
  decl: postcss.Declaration,
  colorScheme: 'light' | 'dark' = 'light',
  defaultTheme = 'default'
) {
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
function applyToSelectors(selector: string, fn: (selector: string) => string) {
  return selector
    .replace(/\n/gm, '')
    .split(',')
    .map(fn)
    .join(',');
}

/** Remove :theme-root usage from a selector */
const replaceThemeRoot = (selector: string) =>
  selector.replace(/:theme-root\((\S+)\)/g, '$1').replace(/:theme-root/g, '');

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
function createNewRules(
  componentConfig: PostcssStrictThemeConfig,
  rule: postcss.Rule,
  themedDeclarations: postcss.Declaration[],
  defaultTheme: string
) {
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

/** Make a SimpleTheme into a LightDarkTheme */
const normalizeTheme = (
  config: PostcssThemeConfig | {}
): PostcssStrictThemeConfig => {
  return Object.assign(
    {},
    ...Object.entries(config).map(([theme, themeConfig]) => {
      if ('light' in themeConfig && 'dark' in themeConfig) {
        return { [theme]: themeConfig };
      }

      return { [theme]: { light: themeConfig, dark: {} } };
    })
  );
};

/** Accomplish theming by creating new classes to override theme values  */
const legacyTheme = (
  root: postcss.Root,
  componentConfig: PostcssStrictThemeConfig,
  options: PostcssThemeOptions
) => {
  const {
    defaultTheme = 'default',
    forceSingleTheme = false,
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

    let createNewThemeRules: postcss.Rule[] = [];
        if(forceSingleTheme) {
            createNewThemeRules;
        } else {
            createNewThemeRules = createNewRules(componentConfig, rule, themedDeclarations, defaultTheme)
        }
        newRules = [
            ...newRules,
            ...createNewThemeRules
        ];
  });

  if (options.forceEmptyThemeSelectors) {
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
    if (options.forceEmptyThemeSelectors || (r.nodes && r.nodes.length > 0)) {
      root.append(r);
    }
  });
};

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

const getLocalizeFunction = (
  modules: string | ScopedNameFunction | undefined,
  resourcePath: string | undefined
) => {
  if (typeof modules === 'function') {
    let fileContents = '';
    if (resourcePath) {
      fileContents = fs.readFileSync(resourcePath, 'utf8');
    }

    return (name: string) => {
      return modules(name, resourcePath || '', fileContents);
    };
  }

  return (name: string) =>
    localizeIdentifier({ resourcePath }, modules || '[local]', name);
};

/** Accomplish theming by creating CSS variable overrides  */
const modernTheme = (
  root: postcss.Root,
  componentConfig: PostcssStrictThemeConfig,
  globalConfig: PostcssStrictThemeConfig,
  options: PostcssThemeOptions
) => {
  const usage = new Set<string>();
  const defaultTheme = options.defaultTheme || 'default';
  const resourcePath = root.source ? root.source.input.file : '';
  const localize = getLocalizeFunction(options.modules, resourcePath);
  // 1. Walk each declaration and replace theme vars with CSS vars
  root.walkRules(rule => {
    rule.selector = replaceThemeRoot(rule.selector);

    rule.walkDecls(decl => {
      while (decl.value.includes('@theme')) {
        const key = parseThemeKey(decl.value);
        decl.value = replaceTheme(decl.value, `var(--${localize(key)})`);
        usage.add(key);
      }
    });
  });

  // 2. Create variable declaration blocks
  Object.entries(componentConfig).forEach(([theme, themeConfig]) => {
    const rules: (postcss.Rule | undefined)[] = [];
    const isDefault = theme === defaultTheme;
    const rootClass = isDefault ? ':root' : `.${theme}`;
    const filterUsed = (colorScheme: ColorScheme): SimpleTheme =>
      Object.entries(themeConfig[colorScheme])
        .filter(
          ([name]) => usage.has(name) || !globalConfig[theme][colorScheme][name]
        )
        .reduce((acc, [name, value]) => ({ ...acc, [name]: value }), {});

    if (
      Object.keys(themeConfig.dark).length > 0 &&
      Object.keys(themeConfig.light).length > 0
    ) {
      rules.push(
        createModernTheme(
          isDefault ? rootClass : `${rootClass}.light`,
          filterUsed('light'),
          localize
        ),
        createModernTheme(
          isDefault ? '.dark' : `${rootClass}.dark`,
          filterUsed('dark'),
          localize
        )
      );
    } else {
      rules.push(createModernTheme(rootClass, filterUsed('light'), localize));
    }

    root.append(...rules.filter((x): x is postcss.Rule => Boolean(x)));
  });
};

/** Generate a theme */
const themeFile = (options: PostcssThemeOptions = {}) => (
  root: postcss.Root
) => {
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

  // Postcss-modules runs twice and we only ever want to process the CSS once
  // @ts-ignore
  if (root.source.processed) {
    return;
  }

  if (caniuse.isSupported('css-variables', browserslist())) {
    modernTheme(root, mergedConfig, globalConfig, options);
  } else {
    legacyTheme(root, mergedConfig, options);
  }

  // @ts-ignore
  root.source.processed = true;
};

export default postcss.plugin('postcss-themed', themeFile);
