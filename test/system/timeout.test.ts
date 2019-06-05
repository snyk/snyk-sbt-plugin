import * as path from 'path';
import * as test from 'tap-only';

test('trigger timeout on inspect()', async (t) => {
  const prevTimeout = process.env.PROC_TIMEOUT;
  process.env.PROC_TIMEOUT = '10'; // set timeout to very small number before importing plugin
  const plugin = require('../../lib');
  try {
    await plugin.inspect(path.join(
      __dirname, '..', 'fixtures', 'testproj-faux-coursier-0.13'),
      'build.sbt');
    t.fail('expected to timeout');
  } catch (error) {
    t.match(error.message, 'timeout');
    t.pass();
  } finally {
    process.env.PROC_TIMEOUT = prevTimeout;
  }
});
