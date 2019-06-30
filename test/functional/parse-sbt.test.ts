import * as fs from 'fs';
import * as path from 'path';
import * as test from 'tap-only';
import * as parser from '../../lib/parse-sbt';

function flatten(dependencies) {
  const acc = new Set();
  function rec(deps) {
    acc.add(deps.name);
    Object.keys(deps.dependencies).forEach((key) => {
      rec(deps.dependencies[key]);
    });
  }
  rec(dependencies);
  return Array.from(acc);
}

test('parse `sbt dependencies` output: multi configuration', async (t) => {
  const sbtOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'sbt-dependency-output.txt'), 'utf8');
  const depTree = parser.parse(sbtOutput, 'testApp', '1.0.1', false);

  t.equal(depTree.name,
    'testApp',
    'package name');
  t.equal(depTree.version, '1.0.1', 'package version');
  t.true(depTree.multiBuild, 'multi build flag set');

  t.equal(depTree
    .dependencies!['myproject-common:myproject-common_2.11']
    .version,
  '0.0.1', 'resolved stand-alone dependency');

  t.equal(depTree
    .dependencies!['myproject-api:myproject-api_2.11']
    .dependencies!['org.slf4j:slf4j-nop'].version,
  '1.6.4', 'resolved correct version for discovery');

  t.equal(depTree
    .dependencies!['myproject-spark:myproject-spark_2.11']
    .dependencies!['org.apache.spark:spark-core_2.11']
    .dependencies!['org.apache.curator:curator-recipes']
    .dependencies!['org.apache.zookeeper:zookeeper']
    .dependencies!['org.slf4j:slf4j-log4j12']
    .version,
  '1.7.10', 'found dependency');

  const depSet = flatten(depTree);
  t.equal(depSet
    .some((dep) => dep.includes('scala-library')),
  false, 'output does NOT include scala-library');
});

test('parse `sbt dependencies` output: single configuration', async (t) => {
  const sbtOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'sbt-single-config-dependency-output.txt'),
    'utf8');

  const depTree = parser.parse(sbtOutput, 'unused', 'unused', false);

  t.equal(depTree.name,
    'my-recommendation-spark-engine:my-recommendation-spark-engine_2.10',
    'package name');
  t.equal(depTree.version, '1.0-SNAPSHOT', 'package version');
  t.equal(depTree.multiBuild, undefined, 'no multi build flag set');

  t.equal(depTree
      .dependencies!['com.google.code.gson:gson']
      .version,
    '2.6.2', 'top level dependency');

  t.equal(depTree
      .dependencies!['com.stratio.datasource:spark-mongodb_2.10']
      .version,
    '0.11.1', 'top level dependency');

  t.equal(depTree
      .dependencies!['com.stratio.datasource:spark-mongodb_2.10']
      .dependencies!['org.mongodb:casbah-commons_2.10'].version,
    '2.8.0', 'transient dependency');

  t.equal(depTree
      .dependencies!['com.stratio.datasource:spark-mongodb_2.10']
      .dependencies!['org.mongodb:casbah-commons_2.10']
      .dependencies!['com.github.nscala-time:nscala-time_2.10'].version,
    '1.0.0', 'transient dependency');

  t.equal(depTree
      .dependencies!['com.stratio.datasource:spark-mongodb_2.10']
      .dependencies!['org.mongodb:casbah-commons_2.10']
      .dependencies!['com.github.nscala-time:nscala-time_2.10']
      .dependencies!['joda-time:joda-time'].version,
    '2.5', 'transient dependency');
});

test('parse `sbt dependencies` output: plugin 1.2.8', async (t) => {
  const sbtOutput = fs.readFileSync(path.join(
      __dirname, '..', 'fixtures',
      'sbt-plugin-1.2.8-output.txt'),
    'utf8');
  const depTree = parser.parseSbtPluginResults(sbtOutput);

  t.equal(depTree.name, 'com.example:hello_2.12');
  t.equal(depTree.version, '0.1.0-SNAPSHOT');

  t.equal(depTree
    .dependencies!['axis:axis']
    .dependencies!['axis:axis-saaj']
    .dependencies!['org.apache.axis:axis-saaj']
    .version, '1.4');

  t.equal(depTree
    .dependencies!['axis:axis']
    .dependencies!['commons-discovery:commons-discovery']
    .dependencies!['commons-logging:commons-logging']
    .version, '1.0.4');
});

test('parse `sbt dependencies` output: plugin 0.13', async (t) => {
  const sbtOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures',
    'sbt-plugin-0.13-output.txt'),
    'utf8');
  const depTree = parser.parseSbtPluginResults(sbtOutput);

  t.equal(depTree.name, 'com.example:hello_2.12');
  t.equal(depTree.version, '0.1.0-SNAPSHOT');

  t.equal(depTree
    .dependencies!['axis:axis']
    .dependencies!['axis:axis-saaj']
    .dependencies!['org.apache.axis:axis-saaj']
    .version, '1.4');

  t.equal(depTree
    .dependencies!['axis:axis']
    .dependencies!['commons-discovery:commons-discovery']
    .dependencies!['commons-logging:commons-logging']
    .version, '1.0.4');

});
