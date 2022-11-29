import * as test from 'tap-only';
import * as plugin from '../../lib';

test('check build args with array not coursier', (t) => {
  const result = plugin.buildArgs([
    '-Paxis',
    '-Pjaxen',
  ], false);
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
    '-Paxis',
    '-Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});

test('check build args with string not coursie', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', false);
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
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
    '-Dsbt.log.noformat=true',
    '-Paxis',
    '-Pjaxen',
    'coursierDependencyTree',
  ]);
  t.end();
});

test('check build args with string for coursier', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', true);
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'coursierDependencyTree',
  ]);
  t.end();
});

test('check build args with string for snykRenderTree', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', false, true);
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'snykRenderTree',
  ]);
  t.end();
});

test('check build args with string for coursier and not snykRenderTree', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', true, false);
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'coursierDependencyTree',
  ]);
  t.end();
});

test('check build args with string for not coursier and not snykRenderTree', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen', false, false);
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});
