import { run } from './test-utils';

jest.mock('browserslist', () => () => ['chrome 76']);

it('Overrides all themes from default', () => {
  const config = {
    default: {
      light: {
        color: 'red',
      },
      dark: {
        color: 'blue',
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
        color: var(--color, red);
      }

      
      .dark {
        --color: blue;
      }

      .mint.light {
        --color: teal;
      }
    `,
    {
      config,
    }
  );
});

it('Overrides dark themes from default', () => {
  const config = {
    default: {
      light: {
        color: 'red',
      },
      dark: {
        color: 'blue',
      },
    },
    mint: {
      light: {
        color: 'purple',
      },
      dark: {
        color: 'teal',
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
        --color: blue;
      }

      .mint.light {
        --color: purple;
      }

      .mint.dark {
        --color: teal;
      }
    `,
    {
      config,
    }
  );
});

it('Merges missing variables from single theme', () => {
  const config = {
    default: {
      light: {
        color: 'red',
        bgColor: 'orange',
      },
      dark: {
        color: 'blue',
        bgColor: 'magenta',
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
        background-color: @theme bgColor;
      }
    `,
    `
      .test {
        color: var(--color, teal);
        background-color: var(--bgColor, orange);
      }
      
      .dark {
        --color: blue;
        --bgColor: magenta;
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
    }
  );
});

it('Merges single theme but leaves variables by default', () => {
  const config = {
    default: {
      color: 'red',
      bgColor: 'orange',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-color: @theme bgColor;
      }
    `,
    `
      .test {
        color: var(--color, teal);
        background-color: var(--bgColor, orange);
      }

    `,
    {
      config,
      forceSingleTheme: 'mint',
    }
  );
});

it('Merges single theme but omits variables when optimized', () => {
  const config = {
    default: {
      color: 'red',
      bgColor: 'orange',
    },
    mint: {
      color: 'teal',
    },
  };

  return run(
    `
      .test {
        color: @theme color;
        background-color: @theme bgColor;
      }
    `,
    `
      .test {
        color: teal;
        background-color: orange;
      }
    `,
    {
      config,
      forceSingleTheme: 'mint',
      optimizeSingleTheme: true,
    }
  );
});
