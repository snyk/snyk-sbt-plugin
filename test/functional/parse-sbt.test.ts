import * as fs from 'fs';
import * as path from 'path';
import * as parser from '../../lib/parse-sbt';
import { DepTree } from '../../lib/types';

function flatten(dependencies: DepTree): string[] {
  const acc = new Set<string>();
  function rec(deps: DepTree): void {
    acc.add(deps.name);
    Object.keys(deps.dependencies || {}).forEach((key) => {
      if (deps.dependencies) {
        rec(deps.dependencies[key]);
      }
    });
  }
  rec(dependencies);
  return Array.from(acc);
}

test('parse `sbt dependencies` output: multi configuration', async () => {
  const sbtOutput = fs
    .readFileSync(
      path.join(__dirname, '..', 'fixtures', 'sbt-dependency-output.txt'),
      'utf8',
    )
    .split('\n');
  const depTree = parser.parse(sbtOutput, 'testApp', '1.0.1', false);

  expect(depTree.name).toBe('testApp');
  expect(depTree.version).toBe('1.0.1');
  expect(depTree.multiBuild).toBeTruthy;
  expect(
    depTree.dependencies!['myproject-common:myproject-common_2.11'].version,
  ).toBe('0.0.1');
  expect(
    depTree.dependencies!['myproject-api:myproject-api_2.11'].dependencies![
      'org.slf4j:slf4j-nop'
    ].version,
  ).toBe('1.6.4');
  expect(
    depTree.dependencies!['myproject-spark:myproject-spark_2.11'].dependencies![
      'org.apache.spark:spark-core_2.11'
    ].dependencies!['org.apache.curator:curator-recipes'].dependencies![
      'org.apache.zookeeper:zookeeper'
    ].dependencies!['org.slf4j:slf4j-log4j12'].version,
  ).toBe('1.7.10');

  const depSet = flatten(depTree);
  expect(depSet.some((dep) => dep.includes('scala-library'))).toBeFalsy;
});

test('parse `sbt dependencies` output: single configuration', async () => {
  const sbtOutput = fs
    .readFileSync(
      path.join(
        __dirname,
        '..',
        'fixtures',
        'sbt-single-config-dependency-output.txt',
      ),
      'utf8',
    )
    .split('\n');

  const depTree = parser.parse(sbtOutput, 'unused', 'unused', false);

  expect(depTree.name).toBe(
    'my-recommendation-spark-engine:my-recommendation-spark-engine_2.10',
  );
  expect(depTree.version).toBe('1.0-SNAPSHOT');
  expect(depTree.multiBuild).toBeUndefined;
  expect(depTree.dependencies!['com.google.code.gson:gson'].version).toBe(
    '2.6.2',
  );
  expect(
    depTree.dependencies!['com.stratio.datasource:spark-mongodb_2.10'].version,
  ).toBe('0.11.1');
  expect(
    depTree.dependencies!['com.stratio.datasource:spark-mongodb_2.10']
      .dependencies!['org.mongodb:casbah-commons_2.10'].version,
  ).toBe('2.8.0');
  expect(
    depTree.dependencies!['com.stratio.datasource:spark-mongodb_2.10']
      .dependencies!['org.mongodb:casbah-commons_2.10'].dependencies![
      'com.github.nscala-time:nscala-time_2.10'
    ].version,
  ).toBe('1.0.0');
  expect(
    depTree.dependencies!['com.stratio.datasource:spark-mongodb_2.10']
      .dependencies!['org.mongodb:casbah-commons_2.10'].dependencies![
      'com.github.nscala-time:nscala-time_2.10'
    ].dependencies!['joda-time:joda-time'].version,
  ).toBe('2.5');
});

describe('parse `sbt dependencyTree` output: sbt 2', () => {
  const sbt2Output = () =>
    fs
      .readFileSync(
        path.join(__dirname, '..', 'fixtures', 'sbt-2-dependency-output.txt'),
        'utf8',
      )
      .split('\n');

  test('reads the tree printed without [info] prefixes', () => {
    const depTree = parser.parse(sbt2Output(), 'unused', 'unused', false);

    expect(depTree.name).toBe('com.example:sbt2-app_3');
    expect(depTree.version).toBe('0.1.0-SNAPSHOT');
    // the [info] banner and [success] lines contribute nothing
    expect(Object.keys(depTree.dependencies!).sort()).toEqual([
      'com.fasterxml.jackson.core:jackson-databind',
      'com.fasterxml.jackson.module:jackson-module-scala_3',
      'com.google.code.gson:gson',
      'org.scala-lang:scala3-library_3',
    ]);

    const scalaModule =
      depTree.dependencies![
        'com.fasterxml.jackson.module:jackson-module-scala_3'
      ];
    expect(scalaModule.version).toBe('2.15.0');
    // evicted versions are dropped, the selected versions kept
    expect(
      scalaModule.dependencies!['com.fasterxml.jackson.core:jackson-databind']
        .version,
    ).toBe('2.17.2');
    expect(
      scalaModule.dependencies!['com.fasterxml.jackson.core:jackson-databind']
        .dependencies!['com.fasterxml.jackson.core:jackson-core'].version,
    ).toBe('2.17.2');
    expect(
      scalaModule.dependencies!['org.scala-lang:scala3-library_3'].version,
    ).toBe('3.3.4');
    expect(
      scalaModule.dependencies!['com.thoughtworks.paranamer:paranamer'].version,
    ).toBe('2.8');
  });

  test('ignores coordinates logged at a level other than info', () => {
    const output = sbt2Output().concat([
      '[warn] com.example:not-a-dependency:1.0.0',
      '[error]   +-com.example:also-not-a-dependency:1.0.0',
    ]);

    const names = flatten(parser.parse(output, 'unused', 'unused', false));

    expect(names).not.toContain('com.example:not-a-dependency');
    expect(names).not.toContain('com.example:also-not-a-dependency');
  });

  test('ignores unprefixed lines that are not tree entries', () => {
    const output = sbt2Output().concat([
      'downloading https://repo1.maven.org/a+-b',
      'see com.example:x:1.0.0 for details',
    ]);

    const names = flatten(parser.parse(output, 'unused', 'unused', false));

    expect(names.some((name) => name.includes('repo1'))).toBe(false);
    expect(names).not.toContain('com.example:x');
  });

  test('strips colour codes from coloured output', () => {
    const coloured = sbt2Output().map((line) =>
      line.startsWith('  +-') ? `\u001b[32m${line}\u001b[0m` : line,
    );

    const depTree = parser.parse(coloured, 'unused', 'unused', false);

    expect(depTree.dependencies!['com.google.code.gson:gson'].version).toBe(
      '2.10.1',
    );
  });
});

test('parse `sbt dependencies` output: plugin 1.2.8', async () => {
  const sbtOutput = fs
    .readFileSync(
      path.join(__dirname, '..', 'fixtures', 'sbt-plugin-1.2.8-output.txt'),
      'utf8',
    )
    .split('\n');
  const depTree = parser.parseSbtPluginResults(
    sbtOutput,
    'com.example:hello_2.12',
    '1.0.0',
  );

  expect(depTree.name).toBe('com.example:hello_2.12');
  expect(depTree.version).toBe('0.1.0-SNAPSHOT');
  expect(
    depTree.dependencies!['axis:axis'].dependencies!['axis:axis-saaj']
      .dependencies!['org.apache.axis:axis-saaj'].version,
  ).toBe('1.4');
  expect(
    depTree.dependencies!['axis:axis'].dependencies![
      'commons-discovery:commons-discovery'
    ].dependencies!['commons-logging:commons-logging'].version,
  ).toBe('1.0.4');
});

test('parse `sbt dependencies` output: plugin 0.13', async () => {
  const sbtOutput = fs
    .readFileSync(
      path.join(__dirname, '..', 'fixtures', 'sbt-plugin-0.13-output.txt'),
      'utf8',
    )
    .split('\n');
  const depTree = parser.parseSbtPluginResults(
    sbtOutput,
    'com.example:hello_2.12',
    '1.0.0',
  );

  expect(depTree.name).toBe('com.example:hello_2.12');
  expect(depTree.version).toBe('0.1.0-SNAPSHOT');
  expect(
    depTree.dependencies!['axis:axis'].dependencies!['axis:axis-saaj']
      .dependencies!['org.apache.axis:axis-saaj'].version,
  ).toBe('1.4');
  expect(
    depTree.dependencies!['axis:axis'].dependencies![
      'commons-discovery:commons-discovery'
    ].dependencies!['commons-logging:commons-logging'].version,
  ).toBe('1.0.4');
});
