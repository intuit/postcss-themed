import crypto from 'crypto';

import { run } from './test-utils';

jest.mock('browserslist', () => () => ['chrome 76']);

it('Creates a simple css variable based theme', () => {
  const config = {
    default: {
      color: 'purple',
      extras: 'black',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme color, @theme color)
      }
    `,
    `
      .test {
        color: var(--color);
        background-image: linear-gradient(to right, var(--color), var(--color))
      }

      :root {
        --color: purple
      }

      .mint {
        --color: teal
      }
    `,
    {
      config,
    }
  );
});

it('Can use alternative theme syntax', () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: theme('color');
      }
    `,
    `
      .test {
        color: var(--color, purple);
      }

      .mint {
        --color: teal;
      }
    `,
    {
      config,
    }
  );
});

it('Can use alternative theme syntax - multiline', () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: theme(
          'color'
        );
      }
    `,
    `
      .test {
        color: var(--color, purple);
      }

      .mint {
        --color: teal;
      }
    `,
    {
      config,
    }
  );
});

it('inlineRootThemeVariables false', () => {
  const config = {
    default: {
      color: 'purple',
      extras: 'black',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme color, @theme color)
      }
    `,
    `
      .test {
        color: var(--color);
        background-image: linear-gradient(to right, var(--color), var(--color))
      }

      :root {
        --color: purple
      }

      .mint {
        --color: teal
      }
    `,
    {
      config,
      inlineRootThemeVariables: false,
    }
  );
});

it('Creates a simple css variable based theme with light and dark', () => {
  const config = {
    default: {
      light: {
        color: 'purple',
      },
      dark: {
        color: 'black',
      },
    },

    mint: {
      color: 'teal',
    },
    chair: {
      light: {
        color: 'beige',
      },
      dark: {
        color: 'darkpurple',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme color, @theme color)
      }
    `,
    `
      .test {
        color: var(--color);
        background-image: linear-gradient(to right, var(--color), var(--color))
      }
      :root {
        --color: purple
      }

      .dark {
        --color: black
      }

      .mint.light {
        --color: teal
      }

      .chair.light {
        --color: beige
      }

      .chair.dark {
        --color: darkpurple
      }
    `,
    {
      config,
    }
  );
});

it('Produces a single theme', () => {
  const config = {
    default: {
      light: {
        color: 'purple',
      },
      dark: {
        color: 'black',
      },
    },
    mint: {
      color: 'teal',
    },
    chair: {
      light: {
        color: 'beige',
      },
      dark: {
        color: 'darkpurple',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, beige);
      }

      .dark {
        --color: darkpurple;
      }
    `,
    {
      config,
      forceSingleTheme: 'chair',
    }
  );
});

it('Produces a single theme with dark mode if default has it', () => {
  const config = {
    default: {
      light: {
        color: 'purple',
      },
      dark: {
        color: 'black',
      },
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, teal);
      }

      .dark {
        --color: black;
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
    }
  );
});

it("Don't produce extra variables for matching values", () => {
  const config = {
    default: {
      light: {
        color: 'black',
      },
      dark: {
        color: 'black',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, black);
      }
    `,
    {
      config,
    }
  );
});

it("Don't produce extra variables for matching values in theme", () => {
  const config = {
    default: {
      light: {
        color: 'black',
      },
      dark: {
        color: 'black',
      },
    },
    someTheme: {
      light: {
        color: 'black',
      },
      dark: {
        color2: 'black',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, black);
      }
    `,
    {
      config,
    }
  );
});

it("Don't produce extra variables for matching values in theme", () => {
  const config = {
    default: {
      light: {
        color: 'red',
      },
      dark: {
        color: 'black',
      },
    },
    someTheme: {
      light: {
        color: 'blue',
      },
      dark: {
        color: 'black',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, red);
      }

      .dark {
        --color: black;
      }

      .someTheme.light {
        --color: blue;
      }
    `,
    {
      config,
    }
  );
});

it("Don't included deep values in theme", () => {
  const config = {
    default: {
      // Component theme defines a "color" variable that clashes
      // with "color" object on themes
      color: 'red',
    },
    someTheme: {
      // Theme doesn't set a "color" but get the "color" tokens
      color: {
        red: 'red2',
        green: 'green2',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, red);
      }
    `,
    {
      config,
    }
  );
});

it('Produces a single theme with variables by default', () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, teal);
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
    }
  );
});

it('Gets deep paths', () => {
  const config = {
    default: {
      colors: {
        purple: 'purple',
      },
    },
    mint: {
      colors: {
        purple: 'purple2',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme colors.purple;
      }
    `,
    `
      .test {
        color: var(--colors-purple, purple);
      }

      .mint {
        --colors-purple: purple2;
      }
    `,
    {
      config,
    }
  );
});

it('Errors on unknown deep paths', () => {
  const config = {
    default: {
      colors: {
        purple: 'purple',
      },
    },
    mint: {
      colors: {
        purple: 'purple2',
      },
    },
  };

  return run(
    `
      .test {
        color: @theme colors.black;
      }
    `,
    `
      .test {
        color: var(--colors-purple, purple);
      }

      .mint {
        --colors-purple: purple2;
      }
    `,
    {
      config,
    }
  ).catch((e) => {
    expect(e.message).toEqual(
      'postcss-themed: <css input>:3:16: Could not find key colors.black in theme configuration.'
    );
  });
});

it("doesn't hang on $Variable", () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme $color;
      }
    `,
    `
      .test {
        color: var(--color, teal);
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
    }
  );
});

it("doesn't error on multi-line declaration", () => {
  const config = {
    default: {
      color: 'purple',
      otherColor: 'red',
    },
    mint: {
      color: 'teal',
      otherColor: 'green',
    },
  };

  return run(
    `
      .test {
        background: @theme
         $color, @theme otherColor;
      }
    `,
    `
      .test {
        background: var(--color, teal), var(--otherColor, green);
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
    }
  );
});

it('should error on missing space', () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @themecolor;
      }
    `,
    `
      .test {
        color: var(--color, teal);
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
    }
  ).catch((e) => {
    expect(e.message).toEqual(
      'postcss-themed: <css input>:3:16: Invalid theme usage: @themecolor'
    );
  });
});

it('should error on invalid alt usage space', () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: theme ('color');
      }
    `,
    '',
    {
      config,
      forceSingleTheme: 'mint',
    }
  ).catch((e) => {
    expect(e.message).toEqual(
      "postcss-themed: <css input>:3:16: Invalid theme usage: theme ('color')"
    );
  });
});

it('Produces a single theme with variables by default with inlineRootThemeVariables off', () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color);
      }

      :root {
        --color: teal;
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
      inlineRootThemeVariables: false,
    }
  );
});

it('Optimizes single theme by removing variables', () => {
  const config = {
    default: {
      color: 'purple',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: teal;
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
      optimizeSingleTheme: true,
    }
  );
});

it('works with nested', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .foo {
        &.test {
          color: @theme color;
        }

        .another {
          color: @theme color;
        }
      }
    `,
    `
      .foo.test {
        color: var(--color);
      }

      .foo .another {
        color: var(--color);
      }

      :root {
        --color: purple;
      }

      .light {
        --color: white;
      }
    `,
    {
      config,
    }
  );
});

it('scoped variable names', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme color, @theme color)
      }
    `,
    `
      .test {
        color: var(--app-foo-color);
        background-image: linear-gradient(to right, var(--app-foo-color), var(--app-foo-color))
      }

      :root {
        --app-foo-color: purple
      }

      .light {
        --app-foo-color: white
      }
    `,
    {
      config,
      modules: '[folder]-[name]-[local]',
    },
    '/app/foo.css'
  );
});

it('scoped variable names with custom function', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme color, @theme color)
      }
    `,
    `
      .test {
        color: var(--test-color-da3);
        background-image: linear-gradient(to right, var(--test-color-da3), var(--test-color-da3))
      }

      :root {
        --test-color-da3: purple
      }

      .light {
        --test-color-da3: white
      }
    `,
    {
      config,
      modules: (name: string, filename: string, css: string) => {
        const hash = crypto
          .createHash('sha1')
          .update(css)
          .digest('hex')
          .slice(0, 3);
        return `${filename || 'test'}-${name}-${hash}`;
      },
    }
  );
});

it('scoped variable names with default function', () => {
  const config = {
    default: {
      color: 'purple',
    },
    light: {
      color: 'white',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme color, @theme color)
      }
    `,
    `
      .test {
        color: var(--default-color-d41d8c);
        background-image: linear-gradient(to right, var(--default-color-d41d8c), var(--default-color-d41d8c))
      }

      :root {
        --default-color-d41d8c: purple
      }

      .light {
        --default-color-d41d8c: white
      }
    `,
    {
      config,
      modules: 'default',
    }
  );
});

it('With component Config', () => {
  const config = {
    default: {
      light: {
        background: 'purple',
        extras: 'black',
      },
      dark: {
        background: 'black',
      },
    },
    mint: {
      background: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme background;
        background-image: linear-gradient(to right, @theme background, @theme background)
      }
    `,
    `
      .test {
        color: var(--background);
        background-image: linear-gradient(to right, var(--background), var(--background))
      }

      :root {
        --background: yellow
      }

      .dark {
        --background: pink
      }
      .mint.light {
        --background: teal
      }
    `,
    {
      config,
    },
    './__tests__/test-modern-themes-ts/test.css'
  );
});

it('Some variables show inline and some show in root', () => {
  const config = {
    default: {
      color: 'purple',
      extras: 'black',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-image: linear-gradient(to right, @theme extras, @theme extras)
      }
    `,
    `
      .test {
        color: var(--color, purple);
        background-image: linear-gradient(to right, var(--extras), var(--extras))
      }

      :root {
        --extras: black
      }

      .mint {
        --color: teal
      }
    `,
    {
      config,
    }
  );
});

it('can extend another theme', () => {
  const config = {
    default: {
      color: 'purple',
    },
    turbotax: {
      color: 'teal',
    },
    mytt: {
      extends: 'turbotax',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, purple);
      }

      .turbotax,
      .mytt {
        --color: teal;
      }
    `,
    {
      config,
    }
  );
});

it('can extend another theme that extends a theme', () => {
  const config = {
    default: {
      color: 'purple',
    },
    turbotax: {
      color: 'teal',
    },
    mytt: {
      extends: 'turbotax',
    },
    ttlive: {
      extends: 'mytt',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
      }
    `,
    `
      .test {
        color: var(--color, purple);
      }

      .turbotax,
      .mytt,
      .ttlive {
        --color: teal;
      }
    `,
    {
      config,
    }
  );
});
