import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  findParentBuildDirs,
  isProjectBaseDir,
  parseBaseDirectories,
  parseProjectBases,
  realpathOrResolve,
} from '../../lib/sbt-build-root';

const fixtureDir = path.join(__dirname, '..', 'fixtures');

test('findParentBuildDirs lists ancestors that contain build.sbt', () => {
  const nested = path.join(fixtureDir, 'testproj-multi-module', 'subModule');
  const root = path.join(fixtureDir, 'testproj-multi-module');

  expect(findParentBuildDirs(nested)).toEqual([root]);
});

test('findParentBuildDirs is empty for a top-level build', () => {
  const standalone = path.join(fixtureDir, 'simple-app');

  expect(findParentBuildDirs(standalone)).toEqual([]);
});

test('findParentBuildDirs ignores ancestors without build.sbt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sbt-parent-builds-'));
  try {
    const parent = path.join(tmp, 'root');
    const mid = path.join(parent, 'mid');
    const nested = path.join(mid, 'leaf');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(parent, 'build.sbt'), 'name := "root"\n');
    fs.writeFileSync(path.join(nested, 'build.sbt'), 'name := "leaf"\n');

    expect(findParentBuildDirs(nested)).toEqual([parent]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('parseBaseDirectories keeps absolute path lines from show baseDirectory', () => {
  const root = realpathOrResolve('/tmp/build');
  const sub = realpathOrResolve('/tmp/build/subModule');

  expect(
    parseBaseDirectories([
      '[info] loading project definition from /tmp/build/project',
      '[info] /tmp/build',
      '[info] /tmp/build/subModule',
      '[success] Total time: 1 s',
    ]),
  ).toEqual([root, sub]);
});

test('parseProjectBases reads SNYK_PROJECT_BASE id and path pairs', () => {
  const root = realpathOrResolve('/tmp/build');
  const sub = realpathOrResolve('/tmp/build/subModule');

  expect(
    parseProjectBases([
      '[info] loading settings for project mainModule from build.sbt ...',
      `[info] SNYK_PROJECT_BASE mainModule ${root}`,
      `[info] SNYK_PROJECT_BASE child ${sub}`,
      '[success] Total time: 0 s',
    ]),
  ).toEqual([
    { id: 'mainModule', base: root },
    { id: 'child', base: sub },
  ]);
});

test('isProjectBaseDir matches a nested dir to an sbt project base', () => {
  const root = path.join(fixtureDir, 'testproj-multi-module');
  const nested = path.join(root, 'subModule');

  expect(isProjectBaseDir([root, nested], nested)).toBe(true);
  expect(isProjectBaseDir([root], nested)).toBe(false);
});

test('isProjectBaseDir matches via realpath when a symlink is involved', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sbt-realpath-'));
  try {
    const realNested = path.join(tmp, 'real', 'subModule');
    fs.mkdirSync(realNested, { recursive: true });
    const linkRoot = path.join(tmp, 'link-root');
    fs.symlinkSync(path.join(tmp, 'real'), linkRoot);
    const viaLink = path.join(linkRoot, 'subModule');

    expect(isProjectBaseDir([realNested], viaLink)).toBe(true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('parseBaseDirectories reads every base printed by an aggregating project', () => {
  const root = realpathOrResolve('/tmp/build');
  const sub = realpathOrResolve('/tmp/build/a');

  expect(
    parseBaseDirectories([
      '[info] a / baseDirectory',
      '[info] \t/tmp/build/a',
      '[info] baseDirectory',
      '[info] \t/tmp/build',
      '[info] /tmp/build/a',
    ]),
  ).toEqual([sub, root]);
});
