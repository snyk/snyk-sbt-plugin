var test = require('tap-only');
var plugin = require('../../lib').__tests;

test('check build args with array', function (t) {
  var result = plugin.buildArgs(null, null, [
    '-Paxis',
    '-Pjaxen',
  ]);
  t.deepEqual(result, [
    'dependencyTree',
    '-Paxis',
    '-Pjaxen',
  ]);
  t.end();
});

test('check build args with string', function (t) {
  var result = plugin.buildArgs(null, null, '-Paxis -Pjaxen');
  t.deepEqual(result, [
    'dependencyTree',
    '-Paxis -Pjaxen',
  ]);
  t.end();
});
