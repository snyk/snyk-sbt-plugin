var test = require('tap-only');
var plugin = require('../../lib').__tests;

test('check build args with array', function(t) {
  var result = plugin.buildArgs([
    '-Paxis',
    '-Pjaxen',
  ]);
  t.deepEqual(result, [
    '-debug',
    '"-J-Dsbt.log.noformat=true"',
    '-Paxis',
    '-Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});

test('check build args with string', function(t) {
  var result = plugin.buildArgs('-Paxis -Pjaxen');
  t.deepEqual(result, [
    '-debug',
    '"-J-Dsbt.log.noformat=true"',
    '-Paxis -Pjaxen',
    'dependencyTree',
  ]);
  t.end();
});
