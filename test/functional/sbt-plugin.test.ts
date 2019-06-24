import * as test from 'tap-only';
import * as plugin from '../../lib';

test('check build args with array not coursier', (t) => {
  const result = plugin.buildArgs([
    '-Paxis',
    '-Pjaxen',
  ], false);
  t.deepEqual(result, [
    '-debug',
    '"-J-Dsbt.log.noformat=true"',
    '-Paxis',
    '-Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});

test('check build args with string not coursier', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', false);
  t.deepEqual(result, [
    '-debug',
    '"-J-Dsbt.log.noformat=true"',
    '-Paxis -Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});

test('check build args with array for coursier', (t) => {
  const result = plugin.buildArgs([
    '-Paxis',
    '-Pjaxen',
  ], true);
  t.deepEqual(result, [
    '-debug',
    '"-J-Dsbt.log.noformat=true"',
    '-Paxis',
    '-Pjaxen',
    'coursierDependencyTree',
  ]);
  t.end();
});

test('check build args with string for coursier', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', true);
  t.deepEqual(result, [
    '-debug',
    '"-J-Dsbt.log.noformat=true"',
    '-Paxis -Pjaxen',
    'coursierDependencyTree',
  ]);
  t.end();
});
