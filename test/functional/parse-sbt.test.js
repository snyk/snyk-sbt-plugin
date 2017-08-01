var fs = require('fs');
var path = require('path');
var test = require('tap-only');
var parser = require('../../lib/parse-sbt');

test('parse `sbt dependencies` output: multi configuration', function (t) {
  t.plan(7);
  var sbtOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'sbt-dependency-output.txt'), 'utf8');
  var depTree = parser.parse(sbtOutput, 'testApp', '1.0.1');

  t.equal(depTree.name,
    'testApp',
    'package name');
  t.equal(depTree.version, '1.0.1', 'package version');
  t.true(depTree.multiBuild, 'multi build flag set');

  t.equal(depTree
    .dependencies['myproject-common:myproject-common_2.11']
    .version,
    '0.0.1', 'resolved stand-alone dependency');

  t.equal(depTree
    .dependencies['myproject-api:myproject-api_2.11']
    .dependencies['org.slf4j:slf4j-nop'].version,
    '1.6.4', 'resolved correct version for discovery');

  t.equal(depTree
    .dependencies['myproject-spark:myproject-spark_2.11']
    .dependencies['org.apache.spark:spark-core_2.11']
    .dependencies['org.apache.curator:curator-recipes']
    .dependencies['org.apache.zookeeper:zookeeper']
    .dependencies['org.slf4j:slf4j-log4j12']
    .version,
    '1.7.10', 'found dependency');

  t.same(depTree
    .dependencies['myproject-spark:myproject-spark_2.11']
    .dependencies['org.apache.spark:spark-core_2.11']
    .dependencies['org.apache.curator:curator-recipes']
    .dependencies['org.apache.zookeeper:zookeeper']
    .dependencies['org.slf4j:slf4j-log4j12']
    .from,
    [
      'testApp@1.0.1',
      'myproject-spark:myproject-spark_2.11@0.0.1',
      'org.apache.spark:spark-core_2.11@1.4.1',
      'org.apache.curator:curator-recipes@2.4.0',
      'org.apache.zookeeper:zookeeper@3.4.5',
      'org.slf4j:slf4j-log4j12@1.7.10',
    ],
    '`from` array is good');
});

test('parse `sbt dependencies` output: single configuration', function (t) {
  t.plan(9);
  var sbtOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'sbt-single-config-dependency-output.txt'),
    'utf8');

  var depTree = parser.parse(sbtOutput, 'unused', 'unused');

  t.equal(depTree.name,
    'my-recommendation-spark-engine:my-recommendation-spark-engine_2.10',
    'package name');
  t.equal(depTree.version, '1.0-SNAPSHOT', 'package version');
  t.equal(depTree.multiBuild, undefined, 'no multi build flag set');

  t.equal(depTree
    .dependencies['com.google.code.gson:gson']
    .version,
    '2.6.2', 'top level dependency');

  t.equal(depTree
    .dependencies['com.stratio.datasource:spark-mongodb_2.10']
    .version,
    '0.11.1', 'top level dependency');

  t.equal(depTree
    .dependencies['com.stratio.datasource:spark-mongodb_2.10']
    .dependencies['org.mongodb:casbah-commons_2.10'].version,
    '2.8.0', 'transient dependency');

  t.equal(depTree
    .dependencies['com.stratio.datasource:spark-mongodb_2.10']
    .dependencies['org.mongodb:casbah-commons_2.10']
    .dependencies['com.github.nscala-time:nscala-time_2.10'].version,
    '1.0.0', 'transient dependency');

  t.equal(depTree
    .dependencies['com.stratio.datasource:spark-mongodb_2.10']
    .dependencies['org.mongodb:casbah-commons_2.10']
    .dependencies['com.github.nscala-time:nscala-time_2.10']
    .dependencies['joda-time:joda-time'].version,
    '2.5', 'transient dependency');

  t.same(depTree
    .dependencies['com.stratio.datasource:spark-mongodb_2.10']
    .dependencies['org.mongodb:casbah-commons_2.10']
    .dependencies['com.github.nscala-time:nscala-time_2.10']
    .dependencies['joda-time:joda-time']
    .from,
    [
      'my-recommendation-spark-engine:my-recommendation-spark-engine_2.10@' +
        '1.0-SNAPSHOT',
      'com.stratio.datasource:spark-mongodb_2.10@0.11.1',
      'org.mongodb:casbah-commons_2.10@2.8.0',
      'com.github.nscala-time:nscala-time_2.10@1.0.0',
      'joda-time:joda-time@2.5',
    ],
    '`from` array is good');
});


test('parse an error output', function (t) {
  t.plan(1);
  var sbtOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'sbt-no-plugin-output.txt'), 'utf8');
  var error = parser.parseError(sbtOutput, 'testApp', '1.0.1');
  t.type(error, 'object', 'Error thrown correctly');
});
