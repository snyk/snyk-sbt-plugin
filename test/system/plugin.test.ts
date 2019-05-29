import * as path from 'path';
import * as test from 'tap-only';
import * as sinon from 'sinon';
import * as plugin from '../../lib';
import * as subProcess from '../../lib/sub-process';

test('run inspect() on 0.13', (t) => {
  return plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-0.13/build.sbt')    .then((result) => {
      t.equal(result.package
        .dependencies['axis:axis']
        .dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
      '1.4',
      'correct version found');
    });
});

test('run inspect() on 1.2.8', (t) => {
  return plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-1.2.8/build.sbt')
    .then((result) => {
      t.equal(result.package
        .dependencies['axis:axis']
        .dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
      '1.4',
      'correct version found');
    });
});

test('run inspect() with coursier on 0.13', (t) => {
  return plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-coursier-0.13/build.sbt')
    .then((result) => {
      t.equal(result.package
        .dependencies['axis:axis']
        .dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
      '1.4',
      'correct version found');
    });
});

test('run inspect() with coursier on 1.2.8', (t) => {
  return plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-coursier-1.2.8/build.sbt')
    .then((result) => {
      t.equal(result.package
        .dependencies['axis:axis']
        .dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
      '1.4',
      'correct version found');
    });
});

test('run inspect() with no sbt plugin on 0.13', (t) => {
  return plugin.inspect(path.join(
    __dirname, '..', 'fixtures', 'testproj-noplugin-0.13'),
  'build.sbt')
    .then(() => {
      t.fail('should not be reached');
    })
    .catch((error) => {
      t.match(error.message, 'the `sbt-dependency-graph` plugin');
      t.pass('Error thrown correctly');
    });
});

test('run inspect() with commented out coursier on 0.13', (t) => {
  return plugin.inspect(path.join(
    __dirname, '..', 'fixtures', 'testproj-faux-coursier-0.13'),
  'build.sbt')
    .then((result) => {
      t.equal(result.package
        .dependencies['axis:axis']
        .dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
      '1.4',
      'correct version found');
    });
});

test('run inspect() with failing `sbt` execution', (t) => {
  stubSubProcessExec(t);
  return plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-0.13/build.sbt')
    .then(() => {
      t.fail('should not be reached');
    })
    .catch((error) => {
      t.match(error.message, 'abort');
      t.pass('Error thrown correctly');
    });
});

function stubSubProcessExec(t) {
  sinon.stub(subProcess, 'execute')
    .callsFake(() => {
      return Promise.reject(new Error('abort'));
    });
  t.teardown(subProcess.execute.restore);
}
