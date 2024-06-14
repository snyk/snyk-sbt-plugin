import * as path from 'path';
import * as plugin from '../../lib';

const fixtureDir = path.join(path.join(__dirname, '..', 'fixtures'));
describe('Run inspect() ', () => {
  test.each`
    fixture             | handler       | msg
    ${'testproj-0.13'}  | ${'snyk:sbt'} | ${'on sbt v.0.13'}
    ${'testproj-1.2.8'} | ${'snyk:sbt'} | ${'on sbt v.1.2.8'}
  `('$msg', async ({ fixture, handler }) => {
    const result: any = await plugin.inspect(
      fixtureDir,
      `${fixture}/build.sbt`,
      {},
    );

    expect(result.plugin.name).toBe(handler);
    expect(result.package.packageFormatVersion).toBe('mvn:0.0.1');
    expect(result.package.version).toBe('0.1.0-SNAPSHOT');
    expect(result.package.name).toMatch('hello');

    expect(
      result.package.dependencies['axis:axis'].dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
    ).toBe('1.4');
  });
});

describe('Run inspect() with coursier ', () => {
  test.each`
    fixture                      | handler          | msg
    ${'testproj-coursier-0.13'}  | ${'bundled:sbt'} | ${'on sbt v.0.13'}
    ${'testproj-coursier-1.2.8'} | ${'bundled:sbt'} | ${'on sbt v.1.2.8'}
    ${'testproj-coursier-1.3.3'} | ${'bundled:sbt'} | ${'on sbt v.1.3.3'}
    ${'testproj-coursier-1.3.5'} | ${'bundled:sbt'} | ${'on sbt v.1.3.5'}
  `('$msg', async ({ fixture, handler }) => {
    const result: any = await plugin.inspect(
      fixtureDir,
      `${fixture}/build.sbt`,
      {},
    );

    expect(result.plugin.name).toBe(handler);
    expect(result.package.packageFormatVersion).toBe('mvn:0.0.1');
    expect(result.package.name).toMatch('root');
    expect(
      result.package.dependencies['axis:axis'].dependencies['axis:axis-jaxrpc']
        .dependencies['org.apache.axis:axis-jaxrpc'].version,
    ).toBe('1.4');
  });
});

// test for new plugin solving issue where native configurations were failing to build for snyk
test('Run inspect() on 0.13 with custom-plugin native-packages', async () => {
  const result: any = await plugin.inspect(
    fixtureDir,
    'testproj-0.13-native-packager/build.sbt',
    {},
  );

  expect(result.plugin.name).toBe('snyk:sbt');
  expect(result.package.packageFormatVersion).toBe('mvn:0.0.1');
  expect(
    result.package.dependencies['org.apache.spark:spark-sql_2.12'].dependencies[
      'com.fasterxml.jackson.core:jackson-databind'
    ].dependencies['com.fasterxml.jackson.core:jackson-core'].version,
  ).toBe('2.7.9');
});
test('Run inspect() on play-scala-seed 1.2.8 with custom-plugin', async () => {
  const result: any = await plugin.inspect(
    fixtureDir,
    'testproj-play-scala-seed-1.2.8/build.sbt',
    {},
  );

  expect(result.plugin.name).toBe('snyk:sbt');
  expect(result.package.packageFormatVersion).toBe('mvn:0.0.1');
  expect(
    result.package.dependencies['com.typesafe.play:play-guice_2.13']
      .dependencies['com.typesafe.play:play_2.13'].dependencies[
      'com.fasterxml.jackson.datatype:jackson-datatype-jsr310'
    ].version,
  ).toBe('2.11.4');
});

describe('(These tests will fail locally if sbt-dependency-graph plugin is installed globally.) Run inspect() on sbt v.1.7.0 will use legacy inspect ', () => {
  test.each`
    fixture                             | handler          | msg
    ${'testproj-1.7.0-dep-tree-plugin'} | ${'bundled:sbt'} | ${'with new plugin'}
    ${'testproj-1.7.0-no-plugins'}      | ${'bundled:sbt'} | ${'without plugins'}
  `('$msg', async ({ fixture, handler }) => {
    const result: any = await plugin.inspect(
      fixtureDir,
      `${fixture}/build.sbt`,
      {},
    );

    expect(result.plugin.name).toBe(handler);
    expect(result.package.packageFormatVersion).toBe('mvn:0.0.1'),
      expect(
        result.package.dependencies['axis:axis'].dependencies[
          'axis:axis-wsdl4j'
        ].version,
      ).toBe('1.5.1');
  });
});

test('run inspect() with commented out coursier on 0.13', async () => {
  const result: any = await plugin.inspect(
    `${fixtureDir}/testproj-faux-coursier-0.13`,
    'build.sbt',
    {},
  );

  expect(result.plugin.name).toBe('snyk:sbt');
  expect(result.package.version).toBe('0.1.0-SNAPSHOT');
  expect(result.package.name).toBe('com.example:hello_2.12');
  expect(result.package.packageFormatVersion).toBe('mvn:0.0.1');
  expect(
    result.package.dependencies['axis:axis'].dependencies['axis:axis-jaxrpc']
      .dependencies['org.apache.axis:axis-jaxrpc'].version,
  ).toBe('1.4');
});

test('run legacy inspect() on sbt 1.4.0 with sbt-dependency-graph new naming- addDependencyTreePlugin', async () => {
  const result: any = await plugin.inspect(
    fixtureDir,
    'testproj-1.4.0/build.sbt',
    {},
  );

  expect(result.plugin.name).toBe('bundled:sbt');
  expect(result.package.packageFormatVersion).toBe('mvn:0.0.1');
  expect(result.package.version).toBe('0.1.0-SNAPSHOT');
  expect(result.package.name).toMatch('hello');
  expect(result.package.dependencies['axis:axis'].version).toBe('1.4');
});

test('run inspect() proj with provided 1.7', async () => {
  const result = await plugin.inspect(
    fixtureDir,
    'proj-with-provided-1.7/build.sbt',
    {},
  );
  if (!result.package.dependencies) {
    expect(result).rejects.toThrowError('project has no dependencies');
  } else {
    expect(Object.keys(result.package.dependencies).length).toBe(2);
    expect(
      result.package.dependencies['com.softwaremill.macwire:macros_2.13']
        ?.version,
    ).toBe('2.3.5');
    expect(
      result.package.dependencies['com.softwaremill.macwire:macrosakka_2.13']
        ?.version,
    ).toBe('2.3.5');
  }
});
