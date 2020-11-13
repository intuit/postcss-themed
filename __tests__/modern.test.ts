import crypto from 'crypto';

import { run } from './test-utils';

jest.mock('browserslist', () => () => ['chrome 76']);

it('Creates a simple css variable based theme', () => {
  const config = {
    default: {
      color: 'purple',
      extras: 'black'
    },
    mint: {
      color: 'teal'
    }
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
        color: var(--color, purple);
        background-image: linear-gradient(to right, var(--color, purple), var(--color, purple))
      }

      .mint {
        --color: teal
      }
    `,
    {
      config
    }
  );
});

it('inlineRootThemeVariables false', () => {
  const config = {
    default: {
      color: 'purple',
      extras: 'black'
    },
    mint: {
      color: 'teal'
    }
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
      inlineRootThemeVariables: false
    }
  );
});

it('Creates a simple css variable based theme with light and dark', () => {
  const config = {
    default: {
      light: {
        color: 'purple'
      },
      dark: {
        color: 'black'
      }
    },
    mint: {
      color: 'teal'
    },
    chair: {
      light: {
        color: 'beige'
      },
      dark: {
        color: 'darkpurple'
      }
    }
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
        color: var(--color, purple);
        background-image: linear-gradient(to right, var(--color, purple), var(--color, purple))
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
      config
    }
  );
});

it('Produces a single theme', () => {
  const config = {
    default: {
      light: {
        color: 'purple'
      },
      dark: {
        color: 'black'
      }
    },
    mint: {
      color: 'teal'
    },
    chair: {
      light: {
        color: 'beige'
      },
      dark: {
        color: 'darkpurple'
      }
    }
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
      forceSingleTheme: 'chair'
    }
  );
});

it('Produces a single theme with dark mode if default has it', () => {
  const config = {
    default: {
      light: {
        color: 'purple'
      },
      dark: {
        color: 'black'
      }
    },
    mint: {
      color: 'teal'
    }
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
      forceSingleTheme: 'mint'
    }
  );
});

it('Produces a single theme with variables by default', () => {
  const config = {
    default: {
      color: 'purple'
    },
    mint: {
      color: 'teal'
    }
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
      forceSingleTheme: 'mint'
    }
  );
});

it('Produces a single theme with variables by default with inlineRootThemeVariables off', () => {
  const config = {
    default: {
      color: 'purple'
    },
    mint: {
      color: 'teal'
    }
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
      inlineRootThemeVariables: false
    }
  );
});
it('Optimizes single theme by removing variables', () => {
  const config = {
    default: {
      color: 'purple'
    },
    mint: {
      color: 'teal'
    }
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
      optimizeSingleTheme: true
    }
  );
});

it('works with nested', () => {
  const config = {
    default: {
      color: 'purple'
    },
    light: {
      color: 'white'
    }
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
        color: var(--color, purple);
      }

      .foo .another {
        color: var(--color, purple);
      }

      .light {
        --color: white;
      }
    `,
    {
      config
    }
  );
});

it('scoped variable names', () => {
  const config = {
    default: {
      color: 'purple'
    },
    light: {
      color: 'white'
    }
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
        color: var(--app-foo-color, purple);
        background-image: linear-gradient(to right, var(--app-foo-color, purple), var(--app-foo-color, purple))
      }

      .light {
        --app-foo-color: white
      }
    `,
    {
      config,
      modules: '[folder]-[name]-[local]'
    },
    '/app/foo.css'
  );
});

it('scoped variable names with custom function', () => {
  const config = {
    default: {
      color: 'purple'
    },
    light: {
      color: 'white'
    }
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
        color: var(--test-color-da3, purple);
        background-image: linear-gradient(to right, var(--test-color-da3, purple), var(--test-color-da3, purple))
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
      }
    }
  );
});

it('scoped variable names with default function', () => {
  const config = {
    default: {
      color: 'purple'
    },
    light: {
      color: 'white'
    }
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
        color: var(--default-color-d41d8c, purple);
        background-image: linear-gradient(to right, var(--default-color-d41d8c, purple), var(--default-color-d41d8c, purple))
      }

      .light {
        --default-color-d41d8c: white
      }
    `,
    {
      config,
      modules: 'default'
    }
  );
});

it('Wrong key mentioned in theme configuration', () => {
  const config = {
    default: {
      color: 'purple'
    },
    light: {
      color: 'white'
    }
  };

  return run(
    `
      .test {
        background-color: @theme background-color;
      }
    `,
    `
      .test {
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
      optimizeSingleTheme: true
    }
  );
});

it('With component Config', () => {
  const config = {
    default: {
      light: {
        background: 'purple',
        extras: 'black'
      },
      dark: {
        background: 'black'
      }
    },
    mint: {
      background: 'teal'
    }
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
        color: var(--background, yellow);
        background-image: linear-gradient(to right, var(--background, yellow), var(--background, yellow))
      }

      .dark {
        --background: pink
      }
      .mint.light {
        --background: teal
      }
    `,
    {
      config
    },
    './__tests__/test-modern-themes-ts/test.css'
  );
});
