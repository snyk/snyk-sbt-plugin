import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as subProcess from '../../lib/sub-process';
import { resolveBuildRoot } from '../../lib';
import { realpathOrResolve } from '../../lib/sbt-build-root';

const fixtureRoot = realpathOrResolve(
  path.join(__dirname, '..', 'fixtures', 'testproj-multi-module'),
);
const fixtureNested = path.join(fixtureRoot, 'subModule');

const projectsOutput = (buildDir: string, ids: string[]) => [
  '[info] In file:' + buildDir + '/',
  ...ids.map((id) => '[info] \t   ' + id),
];

/**
 * Fake sbt for a parent build: the one-shot listing and the chained `show`
 * always fail; `show <id>/baseDirectory` on its own answers from `bases`
 * (a missing entry fails, like a broken project would).
 */
function mockSbt(buildDir: string, bases: Record<string, string>) {
  return jest
    .spyOn(subProcess, 'execute')
    .mockImplementation(async (_cmd, args, options) => {
      const command = args[args.length - 1];
      if (options.cwd !== buildDir) {
        return [];
      }
      if (command === 'projects') {
        return projectsOutput(buildDir, Object.keys(bases));
      }
      const single = command.match(/^show (\S+)\/baseDirectory$/);
      if (single && bases[single[1]]) {
        return ['[info] ' + bases[single[1]]];
      }
      throw new Error('sbt failed');
    });
}

function showCalls(execute: jest.SpyInstance): string[] {
  return execute.mock.calls
    .map(([, args]) => args[args.length - 1])
    .filter((command) => /^show \S+\/baseDirectory$/.test(command));
}

describe('resolveBuildRoot', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks each project for its base when the chained show fails', async () => {
    const execute = mockSbt(fixtureRoot, {
      mainModule: '', // this project's `show` fails
      child: fixtureNested,
    });

    const result = await resolveBuildRoot(fixtureNested, undefined);

    expect(result).toEqual({
      buildRoot: fixtureRoot,
      projects: ['mainModule', 'child'],
    });
    expect(showCalls(execute)).toEqual([
      'show mainModule/baseDirectory',
      'show child/baseDirectory',
    ]);
  });

  it('stops asking once a project base matches', async () => {
    const execute = mockSbt(fixtureRoot, {
      child: fixtureNested,
      mainModule: fixtureRoot,
    });

    await resolveBuildRoot(fixtureNested, undefined);

    expect(showCalls(execute)).toEqual(['show child/baseDirectory']);
  });

  it('does not match a nested dir named like a project whose base is elsewhere', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sbt-resolve-root-'));
    try {
      const parent = realpathOrResolve(tmp);
      const nested = path.join(parent, 'core');
      const realCore = path.join(parent, 'modules', 'core');
      fs.mkdirSync(nested);
      fs.mkdirSync(realCore, { recursive: true });
      fs.writeFileSync(
        path.join(parent, 'build.sbt'),
        'lazy val core = project in file("modules/core")\n',
      );
      fs.writeFileSync(path.join(nested, 'build.sbt'), 'name := "core"\n');
      mockSbt(parent, { root: parent, core: realCore });

      const result = await resolveBuildRoot(nested, undefined);

      expect(result.buildRoot).toBe(nested);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('keeps the nested dir as its own build when sbt reports no bases', async () => {
    // The parent build.sbt does declare `file("subModule")`, but without an
    // answer from sbt we do not guess.
    mockSbt(fixtureRoot, { mainModule: '', child: '' });

    const result = await resolveBuildRoot(fixtureNested, undefined);

    expect(result.buildRoot).toBe(fixtureNested);
  });

  it('does not retry per project when the chained show succeeds', async () => {
    const execute = jest
      .spyOn(subProcess, 'execute')
      .mockImplementation(async (_cmd, args, options) => {
        const command = args[args.length - 1];
        if (options.cwd !== fixtureRoot) {
          return [];
        }
        if (command === 'projects') {
          return projectsOutput(fixtureRoot, ['mainModule', 'child']);
        }
        if (command.includes('; ')) {
          return ['[info] ' + fixtureRoot]; // child's base is not listed
        }
        throw new Error('sbt failed');
      });

    const result = await resolveBuildRoot(fixtureNested, undefined);

    expect(result.buildRoot).toBe(fixtureNested);
    expect(showCalls(execute)).toEqual([]);
  });
});
