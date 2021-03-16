import path from 'path';

import rule, { messages } from '../src';

// eslint-disable-next-line
testRule({
  plugins: [path.join(__dirname, '../dist')],
  ruleName: rule.ruleName,
  config: [true, { config: { default: { foo: 'red' } } }],
  accept: [
    {
      code: 'a { color: @theme foo }',
      description: 'Should not break for normal usage',
    },
  ],
  reject: [
    {
      code: 'a { color: @themefoo }',
      message: messages.spacing,
      description: 'Should break when no space',
    },
    {
      code: 'a { color: @theme $foo }',
      message: messages.dollar,
      description: 'Should break when dollar sign used',
    },
    {
      code: 'a { color: @theme bar }',
      message: messages.variableNotFound({}, 'bar'),
      description: 'Should break when undefined variable used',
    },
  ],
});
