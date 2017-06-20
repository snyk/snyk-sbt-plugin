var test = require('tap-only');
var plugin = require('../../lib');
var fs = require('fs');

test('run inspect()', function (t) {
  t.plan(1);
  return plugin.inspect(
    __dirname + '/../fixtures/testproj/',
    'build.sbt')
  .then(function (result) {
    t.equal(result.package
      .dependencies['com.example:hello_2.12']
      .dependencies['axis:axis']
      .dependencies['axis:axis-jaxrpc']
      .dependencies['org.apache.axis:axis-jaxrpc'].version,
      '1.4',
      'correct version found');
  });
});
