var fs = require('fs');
var path = require('path');
var test = require('tap-only');
var plugin = require('../../lib');

test('run inspect()', function (t) {
  t.plan(1);
  return plugin.inspect(path.join(
    __dirname, '..', 'fixtures', 'testproj'),
    'build.sbt')
  .then(function (result) {
    t.equal(result.package
      .dependencies['axis:axis']
      .dependencies['axis:axis-jaxrpc']
      .dependencies['org.apache.axis:axis-jaxrpc'].version,
      '1.4',
      'correct version found');
  });
});

test('run inspect() with no sbt plugin', function (t) {
  t.plan(1);
  return plugin.inspect(path.join(
    __dirname, '..', 'fixtures', 'testproj-noplugin'),
    'build.sbt')
  .then(function () {
    t.fail('should not be reached');
  })
  .catch(function (result) {
    t.pass('Error thrown correctly');
  });
});
