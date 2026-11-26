import * as path from 'path';
import { execute } from '../../lib/sub-process';

const PRINT_ENV = path.join(__dirname, '..', 'fixtures', 'print-env.js');

const CORP_HTTP = 'http://corp-http:3128';
const CORP_HTTPS = 'http://corp:3128';
const CORP_NO_PROXY = 'localhost,.corp';

const TEST_ENV: Record<string, string> = {
  SNYK_TOKEN: 'test-token',
  SNYK_SYSTEM_HTTP_PROXY: CORP_HTTP,
  SNYK_SYSTEM_HTTPS_PROXY: CORP_HTTPS,
  SNYK_SYSTEM_NO_PROXY: CORP_NO_PROXY,
  HTTP_PROXY: 'http://internal-http:1',
  HTTPS_PROXY: 'http://internal:1',
  NO_PROXY: 'internal',
};

describe('child process environment', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const [key, value] of Object.entries(TEST_ENV)) {
      saved[key] = process.env[key];
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(TEST_ENV)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  it("the child gets no SNYK_* variables and the user's proxy in both casings", async () => {
    const child = JSON.parse(
      (await execute('node', [PRINT_ENV], {})).join('\n'),
    );

    expect(child.snykKeys).toEqual([]);
    expect(child.HTTP_PROXY).toBe(CORP_HTTP);
    expect(child.http_proxy).toBe(CORP_HTTP);
    expect(child.HTTPS_PROXY).toBe(CORP_HTTPS);
    expect(child.https_proxy).toBe(CORP_HTTPS);
    expect(child.NO_PROXY).toBe(CORP_NO_PROXY);
    expect(child.no_proxy).toBe(CORP_NO_PROXY);
  });
});
