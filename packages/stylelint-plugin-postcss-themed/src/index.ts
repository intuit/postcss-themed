import stylelint from 'stylelint';
import get from 'dlv';
import endent from 'endent';
import meant from 'meant';
import flat from 'flat';
import {
  configForComponent,
  PostcssStrictThemeConfig,
  PostcssThemeOptions,
  SimpleTheme,
  normalizeTheme,
} from 'postcss-themed';

const THEME_USAGE_REGEX = /@theme\s+\$?([a-zA-Z-_0-9.]+)/;

export const ruleName = 'postcss-themed/valid';

export const messages = stylelint.utils.ruleMessages(ruleName, {
  spacing: 'There needs to be some form of whitespace after @theme',
  dollar: 'The $ sign is not needed when pulling from a theme',
  variableNotFound: (variables: SimpleTheme, variable: string) => {
    const names = Object.keys(flat(variables)).filter(
      (key) => typeof variables[key] !== 'object'
    );
    const suggestions = meant(variable, names).slice(0, 3);

    return endent`
      You used a variable with no base value: ${variable}
      ${suggestions.length ? `. Did you mean: ${suggestions.join(', ')}` : ''}
    `;
  },
});

export default stylelint.createPlugin(
  ruleName,
  (
    enabled: boolean,
    options: Pick<PostcssThemeOptions, 'config' | 'defaultTheme'> | undefined
  ) => {
    return (root, result) => {
      const validOptions = stylelint.utils.validateOptions(result, ruleName, {
        actual: enabled,
        possible: [true, false],
      });

      if (!validOptions) {
        return;
      }

      const defaultThemeName = options?.defaultTheme || 'default';
      let theme: PostcssStrictThemeConfig = normalizeTheme(options?.config || {});

      if (options?.config && root.source?.input.file) {
        theme = configForComponent(root.source.input.file, options);
        console.log('here')
      }

      root.walkDecls((decl) => {
        if (decl.value.includes('@theme')) {
          if (decl.value.match(/@theme\S+/)) {
            stylelint.utils.report({
              message: messages.spacing,
              node: decl,
              result,
              ruleName,
            });
          } else if (decl.value.match(/@theme\s\$/)) {
            stylelint.utils.report({
              message: messages.dollar,
              node: decl,
              result,
              ruleName,
            });
          } else if (decl.value.match(THEME_USAGE_REGEX)) {
            const [, variable] = decl.value.match(THEME_USAGE_REGEX) || [];
            const variables = theme[defaultThemeName]?.light || {};

            if (!get(variables, variable)) {
              stylelint.utils.report({
                message: messages.variableNotFound(variables, variable),
                node: decl,
                result,
                ruleName,
              });
            }
          }
        }
      });
    };
  }
);
