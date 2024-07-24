import { Helpers, Root } from 'postcss';
import get from 'dlv';
import {
  LightDarkTheme,
  PostcssStrictThemeConfig,
  PostcssThemeOptions,
} from '../types';
import { createCssVariable } from './declaration-utils';

export function generateThemeCss({
  baseTheme,
  alternateThemes,
  variableNames,
  root,
  helpers,
  options,
  localize,
}: {
  baseTheme: LightDarkTheme;
  alternateThemes: PostcssStrictThemeConfig;
  variableNames: Map<string, string>;
  root: Root;
  helpers: Helpers;
  options: PostcssThemeOptions;
  localize: (name: string) => string;
}) {
  for (const [themeName, themeObject] of Object.entries(alternateThemes)) {
    const baseSelector = new helpers.Rule({
      selector: `.${themeName}`,
    });

    const lightSelector = new helpers.Rule({
      selector: `.${themeName}${options.lightClass}`,
    });

    const darkSelector = new helpers.Rule({
      selector: `.${themeName}${options.darkClass}`,
    });

    for (const key of variableNames.values()) {
      const themeValueLight = get(themeObject.light, key);
      const themeValueDark = get(themeObject.dark, key);
      const baseThemeValueLight = get(baseTheme.light, key);
      const baseThemeValueDark = get(baseTheme.dark, key);
      const variableName = localize(key);

      /**
       * Ugly, but cleans up variables declarations that match either the base
       * theme or the themes own light color, while also ensuring it's not a
       * deeply nested object.
       */
      if (typeof themeValueLight === 'string' && /**
         * None of these apply if the themes light value matches the default
         * themes light value, leaving only the dark value
         */
        themeValueLight !== baseThemeValueLight) {
          /**
           * Apply to simplier specificity theme selector if:
           *
           * 1. There is no dark value for this key
           * 2. The light and dark values are equal for this key
           */
          if (
            !themeValueDark ||
            themeValueLight === themeValueDark ||
            themeValueDark === baseThemeValueDark
          ) {
            baseSelector.append(
              createCssVariable(helpers, variableName, themeValueLight),
            );
          } else if (themeValueDark && themeValueDark !== baseThemeValueDark) {
            lightSelector.append(
              createCssVariable(helpers, variableName, themeValueLight),
            );

            darkSelector.append(
              createCssVariable(helpers, variableName, themeValueDark),
            );
          }
        }

      if (!themeValueLight && typeof themeValueDark === 'string' && themeValueDark !== baseThemeValueDark) {
          darkSelector.append(
            createCssVariable(helpers, variableName, themeValueDark),
          );
        }
    }

    for (const sel of [baseSelector, lightSelector, darkSelector]) {
      if (sel.nodes.length > 0) {
        root.append(sel);
      }
    }
  }
}
