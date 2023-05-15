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
  const sbtOutput = fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'sbt-plugin-0.13-output.txt'),
    'utf8',
  ).split('\n');
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
