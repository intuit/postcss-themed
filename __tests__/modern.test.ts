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
      config
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
        color: var(--color);
      }

      :root {
        --color: beige;
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
        color: var(--color);
      }

      :root {
        --color: teal;
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
        color: var(--color);
      }

      :root {
        --color: teal;
      }
    `,
    {
      config,
      forceSingleTheme: 'mint'
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
