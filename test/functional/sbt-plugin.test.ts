import * as plugin from '../../lib';

test('check build args with array not coursier', () => {
  const result = plugin.buildArgs(['-Paxis', '-Pjaxen'], false);
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    '-Paxis',
    '-Pjaxen',
    'set asciiGraphWidth := 999999999',
    'dependencyTree',
  ]);
});

test('check build args with string not coursie', () => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', false);
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'set asciiGraphWidth := 999999999',
    'dependencyTree',
  ]);
});

test('check build args with array for coursier', () => {
  const result = plugin.buildArgs(['-Paxis', '-Pjaxen'], true);
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    '-Paxis',
    '-Pjaxen',
    'coursierDependencyTree',
  ]);
});

test('check build args with string for coursier', () => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', true);
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'coursierDependencyTree',
  ]);
});

test('check build args with string for snykRenderTree', () => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', false, true);
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'snykRenderTree',
  ]);
});

test('check build args with string for coursier and not snykRenderTree', () => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', true, false);
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'coursierDependencyTree',
  ]);
});

test('check build args with string for not coursier and not snykRenderTree', () => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', false, false);
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'set asciiGraphWidth := 999999999',
    'dependencyTree',
  ]);
});

describe('native dependencyTree command by sbt version', () => {
  const twoCommands = ['set asciiGraphWidth := 999999999', 'dependencyTree'];
  const oneCommand = ['set asciiGraphWidth := 999999999; dependencyTree'];

  test.each`
    sbtVersion      | expected
    ${undefined}    | ${twoCommands}
    ${'0.13.18'}    | ${twoCommands}
    ${'1.10.7'}     | ${twoCommands}
    ${'not-semver'} | ${twoCommands}
    ${'2.0.0-RC6'}  | ${oneCommand}
    ${'2.0.9'}      | ${oneCommand}
  `('sbt $sbtVersion', ({ sbtVersion, expected }) => {
    const result = plugin.buildArgs(['-Paxis'], false, false, sbtVersion);
    const runInForeground = expected === oneCommand ? ['--server'] : [];
    expect(result).toEqual([
      ...runInForeground,
      '-Dsbt.log.noformat=true',
      '-Paxis',
      ...expected,
    ]);
  });

  test('coursier and snykRenderTree are unaffected by sbt 2', () => {
    expect(plugin.buildArgs([], true, false, '2.0.9')).toEqual([
      '-Dsbt.log.noformat=true',
      'coursierDependencyTree',
    ]);
    expect(plugin.buildArgs([], false, true, '2.0.9')).toEqual([
      '-Dsbt.log.noformat=true',
      'snykRenderTree',
    ]);
  });
});
