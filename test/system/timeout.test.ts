import * as path from 'path';

test('trigger timeout on inspect()', async () => {
  const prevTimeout = process.env.PROC_TIMEOUT;
  process.env.PROC_TIMEOUT = '10'; // set timeout to very small number before importing plugin
  const plugin = require('../../lib');
  await expect(
    plugin.inspect(
      path.join(__dirname, '..', 'fixtures', 'testproj-faux-coursier-0.13'),
      'build.sbt',
    ),
  ).rejects.toThrowError(/timeout/);
  process.env.PROC_TIMEOUT = prevTimeout;
});
