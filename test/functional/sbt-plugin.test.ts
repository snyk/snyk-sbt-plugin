import * as test from 'tap-only';
import * as plugin from '../../lib';

test('check build args with array', (t) => {
  const result = plugin.buildArgs([
    '-Paxis',
    '-Pjaxen',
  ]);
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
    '-Paxis',
    '-Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});

test('check build args with string', (t) => {
  const result = plugin.buildArgs('-Paxis -Pjaxen');
  t.deepEqual(result, [
    '-Dsbt.log.noformat=true',
    '-Paxis -Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});
