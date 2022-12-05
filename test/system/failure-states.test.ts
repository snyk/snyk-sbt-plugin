import * as path from 'path';
import * as plugin from '../../lib';
import * as subProcess from '../../lib/sub-process';

const fixturesDir = path.join(__dirname, '..', 'fixtures');

test('run inspect() with no sbt plugin on 0.13 should not be reached', async () => {
  await expect(
    plugin.inspect(fixturesDir, 'testproj-noplugin-0.13/build.sbt', {})
  ).rejects.toThrowError(/the `sbt-dependency-graph` plugin/);
});

test('run inspect() on bad project requiring user input throws error', async () => {
  await expect(
    plugin.inspect(fixturesDir, 'bad-project/build.sbt', {})
  ).rejects.toThrowError(/code: 1/);
});

test('run inspect() on bad-project cascade through all parsing options', async () => {
  await expect(
    plugin.inspect(fixturesDir, 'bad-project/build.sbt', {})
  ).rejects.toThrowError(/code: 1/);
});

test('run inspect() with failing `sbt` execution', async () => {
  Object.defineProperty(subProcess, 'execute', {
    value: jest.fn(() => {
      return Promise.reject(new Error('abort'));
    }),
  });
  await expect(
    plugin.inspect(
      path.join(__dirname, '..', 'fixtures'),
      'testproj-0.13/build.sbt',
      {}
    )
  ).rejects.toThrowError('abort');
  jest.clearAllMocks();
});
