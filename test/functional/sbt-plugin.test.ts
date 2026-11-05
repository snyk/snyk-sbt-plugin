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

test('check build args asks every project in a multi-module build for its tree', () => {
  const result = plugin.buildArgs(
    undefined,
    false,
    false,
    ['root', 'api', 'worker'],
    '1.10.7',
  );
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    'set ThisBuild / asciiGraphWidth := 999999999; project root; dependencyTree; project api; dependencyTree; project worker; dependencyTree',
  ]);
});

test('check build args sets the graph width per project on sbt 0.13', () => {
  const result = plugin.buildArgs(
    undefined,
    false,
    false,
    ['root', 'api'],
    '0.13.18',
  );
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    'project root; set asciiGraphWidth := 999999999; dependencyTree; project api; set asciiGraphWidth := 999999999; dependencyTree',
  ]);
});

test('check build args for coursier asks every project in a multi-module build', () => {
  const result = plugin.buildArgs(
    undefined,
    true,
    false,
    ['root', 'api'],
    '1.3.5',
  );
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    'project root; coursierDependencyTree; project api; coursierDependencyTree',
  ]);
});

test('check build args is unchanged for a single project build', () => {
  const result = plugin.buildArgs(undefined, false, false, ['root'], '1.10.7');
  expect(result).toEqual([
    '-Dsbt.log.noformat=true',
    'set asciiGraphWidth := 999999999',
    'dependencyTree',
  ]);
});

test('parse the projects of a multi-module build', () => {
  const result = plugin.parseProjects([
    '[info] welcome to sbt 1.10.7 (GraalVM Community Java 25)',
    '[info] loading project definition from /tmp/multi-module/project',
    '[info] In file:/tmp/multi-module/',
    '[info] \t   api',
    '[info] \t * root',
    '[info] \t   worker',
    '[success] Total time: 1 s',
  ]);

  expect(result).toEqual(['api', 'root', 'worker']);
});

test('parse the projects of a build without a project listing', () => {
  const result = plugin.parseProjects([
    '[info] welcome to sbt 1.10.7 (GraalVM Community Java 25)',
    '[error] Not a valid command: projects',
  ]);

  expect(result).toEqual([]);
});
