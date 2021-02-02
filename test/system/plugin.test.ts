import * as path from 'path';
import * as test from 'tap-only';
import * as sinon from 'sinon';
import * as plugin from '../../lib';
import * as subProcess from '../../lib/sub-process';

console.log('Move move shake shake now drop')
test('run inspect() 0.13', async (t) => {
  const result: any = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-0.13/build.sbt', { debug: true});
  t.equal(result.plugin.name, 'snyk:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.equal(result.package.version, '0.1.0-SNAPSHOT');
  t.match(result.package.name, 'hello');

  t.deepEqual(result.package
    .dependencies['axis:axis']
    .dependencies['axis:axis-jaxrpc']
    .dependencies['org.apache.axis:axis-jaxrpc'].version,
  '1.4',
  'correct version found');
});

test('run inspect() on 1.2.8', async (t) => {
  const result: any  = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
  'testproj-1.2.8/build.sbt', {});
  t.equal(result.plugin.name, 'snyk:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.equal(result.package.version, '0.1.0-SNAPSHOT');
  t.match(result.package.name, 'hello');
  t.deepEqual(result.package
    .dependencies['axis:axis']
    .dependencies['axis:axis-jaxrpc']
    .dependencies['org.apache.axis:axis-jaxrpc'].version,
  '1.4',
  'correct version found');
});

test('run inspect() with coursier on 0.17', async (t) => {
  const result: any  = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-coursier-0.13/build.sbt', {});
  // TODO: fix to get the project name from build.sbt
  // for coursier project
  // t.equal(result.package.version, '0.1.0-SNAPSHOT')
  // t.match(result.package.name, 'hello');
  t.equal(result.plugin.name, 'bundled:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.ok(result.package.dependencies['axis:axis']);
  t.deepEqual(result.package
    .dependencies['axis:axis']
    .dependencies['axis:axis-jaxrpc']
    .dependencies['org.apache.axis:axis-jaxrpc'].version,
  '1.4',
  'correct version found');
});

test('run inspect() with coursier on 1.2.8', async (t) => {
  const result: any  = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-coursier-1.2.8/build.sbt', {});
  // TODO: fix to get the project name from build.sbt
  // for coursier project
  // t.equal(result.package.version, '0.1.0-SNAPSHOT');
  // t.match(result.package.name, 'hello');
  t.equal(result.plugin.name, 'bundled:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.ok(result.package.dependencies['axis:axis']);
  t.deepEqual(result.package
    .dependencies['axis:axis']
    .dependencies['axis:axis-jaxrpc']
    .dependencies['org.apache.axis:axis-jaxrpc'].version,
  '1.4',
  'correct version found');
});

test('run inspect() with no sbt plugin on 0.13', async (t) => {
  try {
    await plugin.inspect(path.join(
    __dirname, '..', 'fixtures', 'testproj-noplugin-0.13'),
  'build.sbt', {});
    t.fail('should not be reached');
  } catch (error) {
    t.match(error.message, 'the `sbt-dependency-graph` plugin');
    t.pass('Error thrown correctly');
  }
});

test('run inspect() with commented out coursier on 0.13', async (t) => {
  const result: any  = await plugin.inspect(path.join(
    __dirname, '..', 'fixtures', 'testproj-faux-coursier-0.13'),
  'build.sbt', {});
  t.equal(result.plugin.name, 'bundled:sbt', 'correct handler');
  // TODO: fix to get the project name from build.sbt
  // t.equal(result.package.version, '0.1.0-SNAPSHOT');
  t.match(result.package.name, 'hello');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.ok(result.package.dependencies['axis:axis']);
  t.deepEqual(result.package
    .dependencies['axis:axis']
    .dependencies['axis:axis-jaxrpc']
    .dependencies['org.apache.axis:axis-jaxrpc'].version,
  '1.4',
  'correct version found');
});

test('run inspect() on bad project requiring user input', async (t) => {
  try {
    await plugin.inspect(path.join(__dirname, '..', 'fixtures',
    'bad-project'), 'build.sbt', {});
    t.fail('Expected to fail');
  } catch (error) {
    t.match(error.message, 'code: 1');
    t.match(error.message, '(q)uit');
    t.pass('Error thrown correctly');
  }
});

test('run inspect() on bad-project cascade through all parsing options', async (t) => {
  try {
    await plugin.inspect(path.join(__dirname, '..', 'fixtures',
      'bad-project'), 'build.sbt', {});
    t.fail('Expected to fail');
  } catch (error) {
    t.match(error.message, 'code: 1');
    t.match(error.message, '(q)uit');
    t.pass('Error thrown correctly');
  }
});

test('run inspect() with failing `sbt` execution', async (t) => {
  stubSubProcessExec(t);
  try {
    await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-0.13/build.sbt', {});
    t.fail('should not be reached');
  } catch (error) {
    t.match(error.message, 'abort');
    t.pass('Error thrown correctly');
  }
});

function stubSubProcessExec(t) {
  const executeStub = sinon.stub(subProcess, 'execute')
    .callsFake(() => {
      return Promise.reject(new Error('abort'));
    });
  t.teardown(executeStub.restore);
}

test('run inspect() on 0.13 with custom-plugin', async (t) => {
  const result: any = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-0.13/build.sbt', {});
  t.equal(result.plugin.name, 'snyk:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.equal(result.package
      .dependencies['axis:axis']
      .dependencies['axis:axis-jaxrpc']
      .dependencies['org.apache.axis:axis-jaxrpc'].version,
    '1.4',
    'correct version found');
});

// test for new plugin solving issue where native configurations were failing to build for snyk
test('run inspect() on 0.13 with custom-plugin native-packages', async (t) => {
  const result: any = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-0.13-native-packager/build.sbt', {});
  t.equal(result.plugin.name, 'snyk:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.equal(result.package
      .dependencies['org.apache.spark:spark-sql_2.12']
      .dependencies['com.fasterxml.jackson.core:jackson-databind']
      .dependencies['com.fasterxml.jackson.core:jackson-core'].version,
    '2.7.9',
    'correct version found');
});

test('run inspect() on 1.2.8 with custom-plugin', async (t) => {
  const result: any  = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-1.2.8/build.sbt', {});
  t.equal(result.plugin.name, 'snyk:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.equal(result.package
      .dependencies['axis:axis']
      .dependencies['axis:axis-jaxrpc']
      .dependencies['org.apache.axis:axis-jaxrpc'].version,
    '1.4',
    'correct version found');
});

test('run inspect() on play-scala-seed 1.2.8 with custom-plugin', async (t) => {
  const result: any  = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-play-scala-seed-1.2.8/build.sbt', {});
  t.equal(result.plugin.name, 'snyk:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.equal(result.package
      .dependencies['com.typesafe.play:play-guice_2.13']
      .dependencies['com.typesafe.play:play_2.13']
      .dependencies['com.fasterxml.jackson.datatype:jackson-datatype-jsr310'].version,
    '2.9.8',
    'correct version found');
});

test('run inspect() with coursier on 1.3.3', async (t) => {
  const result: any  = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
    'testproj-coursier-1.3.3/build.sbt', {});

  // TODO: fix to get the project name from build.sbt
  // for coursier project
  // t.equal(result.package.version, '0.1.0-SNAPSHOT');
  // t.match(result.package.name, 'hello');
  t.equal(result.plugin.name, 'bundled:sbt', 'correct handler');

  t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
  t.ok(result.package.dependencies['axis:axis']);
  t.deepEqual(result.package
        .dependencies['axis:axis']
        .dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
    '1.4',
    'correct version found');
});

test('run inspect() with coursier on 1.3.5', async (t) => {
    const result: any  = await plugin.inspect(path.join(__dirname, '..', 'fixtures'),
        'testproj-coursier-1.3.5/build.sbt', {});

    // TODO: fix to get the project name from build.sbt
    // for coursier project
    // t.equal(result.package.version, '0.1.0-SNAPSHOT');
    // t.match(result.package.name, 'hello');
    t.equal(result.plugin.name, 'bundled:sbt', 'correct handler');

    t.equal(result.package.packageFormatVersion, 'mvn:0.0.1', 'correct package format version');
    t.ok(result.package.dependencies['axis:axis']);
    t.deepEqual(result.package
            .dependencies['axis:axis']
            .dependencies['axis:axis-jaxrpc']
            .dependencies['org.apache.axis:axis-jaxrpc'].version,
        '1.4',
        'correct version found');
});
