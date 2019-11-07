import postcss from 'postcss';
import nested from 'postcss-nested';

import plugin, { PostcssThemeOptions } from '../src/index';

export function normalizeResult(input: string) {
  return input
    .split('\n')
    .map(tok => tok.trim())
    .join('');
}

export function run(
  input: string,
  output: string,
  opts: PostcssThemeOptions,
  inputPath?: string
) {
  return postcss([nested, plugin(opts)])
    .process(input, { from: inputPath })
    .then(result => {
      expect(normalizeResult(result.css)).toEqual(normalizeResult(output));
      expect(result.warnings()).toHaveLength(0);
    });
}
