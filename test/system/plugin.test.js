var path = require('path');
var test = require('tap-only');
var sinon = require('sinon');
var plugin = require('../../lib');
var subProcess = require('../../lib/sub-process');

test('run inspect()', function (t) {
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
  return plugin.inspect(path.join(
    __dirname, '..', 'fixtures', 'testproj-noplugin'),
  'build.sbt')
    .then(function () {
      t.fail('should not be reached');
    })
    .catch(function (error) {
      t.match(error.message, 'the `sbt-dependency-graph` plugin');
      t.pass('Error thrown correctly');
    });
});

test('run inspect() with failing `sbt` execution', function (t) {
  stubSubProcessExec(t);
  return plugin.inspect(path.join(__dirname, '..', 'fixtures', 'testproj'),
    'build.sbt')
    .then(function () {
      t.fail('should not be reached');
    })
    .catch(function (error) {
      t.match(error.message, 'abort');
      t.pass('Error thrown correctly');
    });
});


function stubSubProcessExec(t) {
  sinon.stub(subProcess, 'execute')
    .callsFake(function () {
      return Promise.reject(new Error('abort'));
    });
  t.teardown(subProcess.execute.restore);
}
