import { resolveThemeExtension, normalizeTheme } from '../src/common';

it('should be able to extend a simple theme', () => {
  expect(
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red'
        },
        myTheme: {
          color: 'blue'
        },
        myChildTheme: {
          extends: 'myTheme'
        }
      })
    )
  ).toStrictEqual({
    default: {
      light: { color: 'red' },
      dark: {}
    },
    myTheme: {
      light: { color: 'blue' },
      dark: {}
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: {}
    }
  });
});

it('should be able to extend a dark/light theme from root', () => {
  expect(
    resolveThemeExtension({
      default: {
        light: { color: 'white' },
        dark: { color: 'black' }
      },
      myTheme: {
        light: { color: 'blue' },
        dark: { color: 'red' }
      },
      myChildTheme: {
        extends: 'myTheme',
        light: {},
        dark: {}
      }
    })
  ).toStrictEqual({
    default: {
      light: { color: 'white' },
      dark: { color: 'black' }
    },
    myTheme: {
      light: { color: 'blue' },
      dark: { color: 'red' }
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: { color: 'red' }
    }
  });
});

it('should be able to extend a theme that extends another theme', () => {
  expect(
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red'
        },
        myTheme: {
          color: 'blue'
        },
        myChildTheme: {
          extends: 'myTheme'
        },
        myOtherChildTheme: {
          extends: 'myChildTheme'
        }
      })
    )
  ).toStrictEqual({
    default: {
      light: { color: 'red' },
      dark: {}
    },
    myTheme: {
      light: { color: 'blue' },
      dark: {}
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: {}
    },
    myOtherChildTheme: {
      light: { color: 'blue' },
      dark: {}
    }
  });
});

it('should be able to extend a theme that extends another theme - out of order', () => {
  expect(
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red'
        },
        myTheme: {
          color: 'blue'
        },
        myOtherChildTheme: {
          extends: 'myChildTheme'
        },
        myChildTheme: {
          extends: 'myTheme'
        }
      })
    )
  ).toStrictEqual({
    default: {
      light: { color: 'red' },
      dark: {}
    },
    myTheme: {
      light: { color: 'blue' },
      dark: {}
    },
    myChildTheme: {
      light: { color: 'blue' },
      dark: {}
    },
    myOtherChildTheme: {
      light: { color: 'blue' },
      dark: {}
    }
  });
});

it('should error on unknown themes', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red'
        },
        myTheme: {
          color: 'blue'
        },
        myChildTheme: {
          extends: 'myThemes'
        }
      })
    )
  ).toThrow("Theme to extend from not found! 'myThemes'");
});

it('should when extending itself', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red'
        },
        myTheme: {
          extends: 'myTheme'
        }
      })
    )
  ).toThrow("A theme cannot extend itself! 'myTheme' extends 'myTheme'");
});

it('should when cycles detected', () => {
  expect(() =>
    resolveThemeExtension({
      default: {
        light: { color: 'white' },
        dark: { color: 'black' }
      },
      myTheme: {
        extends: 'myChildTheme',
        light: { color: 'blue' },
        dark: {}
      },
      myChildTheme: {
        extends: 'myTheme',
        light: {},
        dark: {}
      }
    })
  ).toThrow(
    "Circular theme extension found! 'myTheme' => 'myChildTheme' => 'myTheme'"
  );
});

it('should when cycles detected - subthemes', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red'
        },
        myTheme: {
          extends: 'myChildTheme'
        },
        myChildTheme: {
          extends: 'myTheme'
        }
      })
    )
  ).toThrow(
    "Circular theme extension found! 'myTheme' => 'myChildTheme' => 'myTheme'"
  );
});


it('should when cycles detected - complicated', () => {
  expect(() =>
    resolveThemeExtension(
      normalizeTheme({
        default: {
          color: 'red'
        },
        one: {
          extends: 'five'
        },
        two: {
          extends: 'one'
        },
        three: {
          extends: 'two'
        },
        four: {
          extends: 'three'
        },
        five: {
          extends: 'four'
        }
      })
    )
  ).toThrow(
    "Circular theme extension found! 'one' => 'five' => 'four' => 'three' => 'two' => 'one'"
  );
});
