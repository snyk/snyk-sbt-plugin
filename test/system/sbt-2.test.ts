import * as path from 'path';
import * as plugin from '../../lib';

// sbt 2 needs Java 17+, while `npm test` also runs on Java 8 and 11. These
// tests only run under `npm run test:sbt2`, which sets SBT_2_TESTS.
const describeSbt2 = process.env.SBT_2_TESTS ? describe : describe.skip;
const fixtureDir = path.join(__dirname, '..', 'fixtures');

describeSbt2('Run inspect() on sbt 2', () => {
  test('builds the graph from native dependencyTree', async () => {
    const result: any = await plugin.inspect(
      fixtureDir,
      'testproj-2.0.9/build.sbt',
      {},
    );

    expect(result.plugin.name).toBe('bundled:sbt');
    expect(result.package.packageFormatVersion).toBe('mvn:0.0.1');
    expect(result.package.name).toBe('com.example:sbt2-app_3');
    expect(result.package.version).toBe('0.1.0-SNAPSHOT');
    expect(
      result.package.dependencies['com.google.code.gson:gson'].version,
    ).toBe('2.10.1');
    expect(
      result.package.dependencies[
        'com.fasterxml.jackson.module:jackson-module-scala_3'
      ].dependencies['com.fasterxml.jackson.core:jackson-databind'].version,
    ).toBe('2.17.2');
  });
});
