var fs = require('fs');
var path = require('path');
var test = require('tap-only');
var parser = require('../../lib/parse-sbt');

function flatten(dependencies) {
  let acc = new Set();
  function rec(deps) {
    acc.add(deps.name);
    Object.keys(deps.dependencies).forEach((key) => {
      rec(deps.dependencies[key]);
    });
  }
  rec(dependencies);
  return Array.from(acc);
}

test('parse `sbt dependencies` output: multi configuration', function (t) {
  t.plan(7);
  const sbtOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'sbt-dependency-output.txt'), 'utf8');
  const depTree = parser.parse(sbtOutput, 'testApp', '1.0.1', false);

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

  const depSet = flatten(depTree);
  t.equal(depSet
    .some(dep => dep.includes('scala-library')),
  false, 'output does NOT include scala-library');
});

test('parse `sbt dependencies` output: single configuration', function (t) {
  t.plan(9);
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

  const depSet = flatten(depTree);
  t.equal(depSet
    .some(dep => dep.includes('scala-library')),
  false, 'output does NOT include scala-library');
});

test('parse `sbt dependencies` output: couriser single configuration',
  function (t) {
    t.plan(10);
    const sbtOutput = fs.readFileSync(path.join(
      __dirname, '..', 'fixtures',
      'sbt-coursier-single-config-dependency-output.txt'),
    'utf8');

    const depTree = parser.parse(sbtOutput, 'unused', 'unused', true);

    t.equal(depTree.name,
      'root',
      'package name');
    t.equal(depTree.version, undefined, 'no package version');
    t.equal(depTree.multiBuild, undefined, 'no multi build flag set');

    t.equal(depTree
      .dependencies['com.amazonaws:aws-java-sdk-ses']
      .version,
    '1.11.507', 'top level dependency');

    t.equal(depTree
      .dependencies['com.gu:pan-domain-auth-play_2-6_2.12']
      .version,
    '0.8.0', 'top level dependency');

    t.equal(depTree
      .dependencies['com.gu:pan-domain-auth-play_2-6_2.12']
      .dependencies['joda-time:joda-time'].version,
    '2.9.9', 'transient dependency');

    t.equal(depTree
      .dependencies['com.gu:pan-domain-auth-play_2-6_2.12']
      .dependencies['com.gu:pan-domain-auth-core_2.12']
      .dependencies['com.google.api-client:google-api-client'].version,
    '1.22.0', 'transient dependency');

    t.equal(depTree
      .dependencies['com.gu:pan-domain-auth-play_2-6_2.12']
      .dependencies['com.gu:pan-domain-auth-core_2.12']
      .dependencies['com.google.api-client:google-api-client']
      .dependencies['com.google.oauth-client:google-oauth-client'].version,
    '1.22.0', 'transient dependency');

    t.equal(depTree
      .dependencies['com.gu:pan-domain-auth-play_2-6_2.12']
      .dependencies['com.gu:pan-domain-auth-core_2.12']
      .dependencies['com.google.api-client:google-api-client']
      .dependencies['com.google.oauth-client:google-oauth-client']
      .dependencies['com.google.code.findbugs:jsr305'],
    undefined, 'transient dependency with upgrade is excluded');

    const depSet = flatten(depTree);
    t.equal(depSet
      .some(dep => dep.includes('scala-library')),
    true, 'output includes scala-library');
  });

test('parse `sbt dependencies` output: couriser multiple configuration',
  function (t) {
    t.plan(12);
    const sbtOutput = fs.readFileSync(path.join(
      __dirname, '..', 'fixtures',
      'sbt-coursier-multiple-config-dependency-output.txt'),
    'utf8');

    const depTree = parser.parse(sbtOutput, 'tool', '1.1.1', true);

    t.equal(depTree.name,
      'tool',
      'package name');
    t.equal(depTree.version, '1.1.1', 'package version');
    t.equal(depTree.multiBuild, true, 'multi build flag set');

    t.equal(depTree
      .dependencies['root']
      .version,
    undefined, 'root project');

    t.equal(depTree
      .dependencies['common']
      .version,
    undefined, 'common project');

    t.equal(depTree
      .dependencies['common']
      .dependencies['com.amazonaws:aws-java-sdk-dynamodb']
      .version,
    '1.11.125', 'first common dependency');

    t.equal(depTree
      .dependencies['common']
      .dependencies['org.scala-lang:scala-library']
      .version,
    '2.11.8', 'last common dependency');

    t.equal(depTree
      .dependencies['common']
      .dependencies['com.google.api-client:google-api-client']
      .dependencies['com.google.http-client:google-http-client-jackson2']
      .version, '1.22.0', 'transient dependency');

    t.equal(depTree
      .dependencies['common']
      .dependencies['com.google.api-client:google-api-client']
      .dependencies['com.google.http-client:google-http-client-jackson2']
      .dependencies['com.google.http-client:google-http-client'].version,
    '1.22.0', 'transient dependency');

    t.equal(depTree
      .dependencies['common']
      .dependencies['com.google.api-client:google-api-client']
      .dependencies['com.google.http-client:google-http-client-jackson2']
      .dependencies['com.google.http-client:google-http-client']
      .dependencies['com.google.code.findbugs:jsr305'].version,
    '1.3.9', 'transient dependency');

    t.equal(depTree
      .dependencies['common']
      .dependencies['com.google.api-client:google-api-client']
      .dependencies['com.google.http-client:google-http-client-jackson2']
      .dependencies['com.google.http-client:google-http-client']
      .dependencies['com.fasterxml.jackson.core:jackson-core'],
    undefined, 'transient dependency with upgrade is excluded');

    const depSet = flatten(depTree);
    t.equal(depSet
      .some(dep => dep.includes('scala-library')),
    true, 'output includes scala-library');
  });

