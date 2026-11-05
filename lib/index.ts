import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import * as debugModule from 'debug';

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debug = debugModule('snyk-sbt-plugin');

import {
  sbtCoursierPluginName,
  sbtDependencyGraphPluginName,
  sbtDependencyGraphPluginNameNew,
} from './constants';
import * as subProcess from './sub-process';
import * as parser from './parse-sbt';
import * as types from './types';
import { isPluginInstalled } from './plugin-search';
import {
  findParentBuildDirs,
  isProjectBaseDir,
  LIST_PROJECT_BASES_COMMAND,
  parseBaseDirectories,
  parseProjectBases,
} from './sbt-build-root';
import { getSbtVersion } from './version';

export {
  findParentBuildDirs,
  isProjectBaseDir,
  LIST_PROJECT_BASES_COMMAND,
  parseBaseDirectories,
  parseProjectBases,
} from './sbt-build-root';

import * as tmp from 'tmp';
tmp.setGracefulCleanup();

interface InjectedScript {
  path: string;
  remove: () => void;
}

const packageFormatVersion = 'mvn:0.0.1';

export async function inspect(
  root,
  targetFile,
  options,
): Promise<types.PluginResult> {
  if (!options) {
    options = { dev: false };
  }

  const isCoursierPresent = await isPluginInstalled(
    root,
    targetFile,
    sbtCoursierPluginName,
  );
  const isSbtDependencyGraphPresent = await isPluginInstalled(
    root,
    targetFile,
    sbtDependencyGraphPluginName,
  );
  const isNewSbtDependencyGraphPresent = await isPluginInstalled(
    root,
    targetFile,
    sbtDependencyGraphPluginNameNew,
  );

  debug(`isCoursierPresent: ${isCoursierPresent}, isSbtDependencyGraphPresent: ${isSbtDependencyGraphPresent},
  isNewSbtDependencyGraphPresent: ${isNewSbtDependencyGraphPresent}`);
  // If coursier is present, use it because it gives different results to sbt dependencyTree
  let result;
  if (isCoursierPresent) {
    try {
      options.useCoursier = true;
      result = await legacyInspect(root, targetFile, options);
      return result;
    } catch (err) {
      debug('Coursier failed with error: ', err);
    }
  }
  // TODO:Legacy path creates a large output that can cause RangeError in bigger projects
  // We would prefer to use plugin inspect by default but currently it requires sbt-dep-graph plugin
  if (isSbtDependencyGraphPresent) {
    try {
      debug('Applying plugin inspect');
      result = await pluginInspect(root, targetFile, options);
    } catch (err) {
      debug('pluginInspect failed with error: ', err);
    }
    if (result) {
      result.package.packageFormatVersion = packageFormatVersion;
      return result;
    }
  }

  options.useCoursier = false;
  try {
    result = await legacyInspect(root, targetFile, options);
    return result;
  } catch (err) {
    const hintMsg = buildHintMessage(options);
    err.message = err.message + '\n' + hintMsg;
    throw new Error(err);
  }
}

async function legacyInspect(root: string, targetFile: string, options: any) {
  const targetFilePath = path.dirname(path.resolve(root, targetFile));
  if (!fs.existsSync(targetFilePath)) {
    debug(
      `build.sbt not found at location: ${targetFilePath}. This may result in no dependencies`,
    );
  }

  const { buildRoot, projects } = await resolveBuildRoot(
    targetFilePath,
    options.args,
  );
  if (buildRoot !== targetFilePath) {
    debug(
      `legacyInspect: nested path "${targetFilePath}" is a subproject base of "${buildRoot}"`,
    );
  }

  const useCoursier = options.useCoursier;
  const sbtVersion = await getSbtVersion(buildRoot, 'build.sbt');

  const sbtArgs = buildArgs(
    options.args,
    useCoursier,
    false,
    projects,
    sbtVersion,
  );
  debug(`running command: sbt ${sbtArgs.join(' ')}`);
  const result = {
    sbtOutput: await subProcess.execute('sbt', sbtArgs, {
      cwd: buildRoot,
    }),
    coursier: useCoursier,
  };
  const packageName = path.basename(root);
  const packageVersion = '0.0.0';
  const depTree = parser.parse(
    result.sbtOutput,
    packageName,
    packageVersion,
    result.coursier,
  );
  depTree.packageFormatVersion = packageFormatVersion;

  return {
    plugin: {
      name: 'bundled:sbt',
      runtime: 'unknown',
    },
    package: depTree,
  };
}

export async function resolveBuildRoot(
  startDir: string,
  sbtArgs,
): Promise<{ buildRoot: string; projects: string[] }> {
  for (const parent of findParentBuildDirs(startDir)) {
    const listed = await listProjectsAndBases(sbtArgs, parent);
    if (listed.projects.length === 0) {
      continue;
    }
    if (isProjectBaseDir(listed.baseDirs, startDir)) {
      return { buildRoot: parent, projects: listed.projects };
    }
    // The chained `show` stops at the first failing project, so bases may be
    // missing. Ask each project on its own rather than guess from names/paths.
    if (
      !listed.complete &&
      (await isBaseOfAnyProject(sbtArgs, parent, listed.projects, startDir))
    ) {
      return { buildRoot: parent, projects: listed.projects };
    }
  }

  const listed = await listProjectsAndBases(sbtArgs, startDir);
  return {
    buildRoot: startDir,
    projects: listed.projects,
  };
}

/**
 * Single sbt launch: project IDs + canonical base directories (ID may ≠ dirname).
 * Falls back to `sbt projects` if the session command is unavailable.
 *
 * `complete` is false when sbt could not report every project's base.
 */
async function listProjectsAndBases(
  sbtArgs,
  buildDir: string,
): Promise<{ projects: string[]; baseDirs: string[]; complete: boolean }> {
  let args = ['-Dsbt.log.noformat=true'];
  if (sbtArgs) {
    args = args.concat(sbtArgs);
  }
  args.push(LIST_PROJECT_BASES_COMMAND);

  try {
    const output = await subProcess.execute('sbt', args, { cwd: buildDir });
    const parsed = parseProjectBases(output);
    if (parsed.length > 0) {
      const projects = parsed.map((p) => p.id);
      const baseDirs = parsed.map((p) => p.base);
      debug(`sbt projects in this build: ${projects.join(', ')}`);
      debug(`sbt project base directories: ${baseDirs.join(', ')}`);
      return { projects, baseDirs, complete: true };
    }
    debug(
      'snykListProjectBases produced no rows; falling back to projects + show',
    );
  } catch (err) {
    debug('Failed to list sbt project bases in one call: ', err);
  }

  const projects = await listProjects(sbtArgs, buildDir);
  const baseDirs = await listProjectBaseDirectories(
    sbtArgs,
    buildDir,
    projects,
  );
  return {
    projects,
    baseDirs: baseDirs || [],
    complete: baseDirs !== undefined,
  };
}

/**
 * Base directories of `projects`, or undefined if the `show` chain failed
 * (sbt aborts the chain at the first failure, so the output is partial).
 */
async function listProjectBaseDirectories(
  sbtArgs,
  buildDir: string,
  projects: string[],
): Promise<string[] | undefined> {
  if (projects.length === 0) {
    return [];
  }

  let args = ['-Dsbt.log.noformat=true'];
  if (sbtArgs) {
    args = args.concat(sbtArgs);
  }
  args.push(projects.map((id) => `show ${id}/baseDirectory`).join('; '));

  try {
    const output = await subProcess.execute('sbt', args, { cwd: buildDir });
    const baseDirs = parseBaseDirectories(output);
    debug(`sbt project base directories: ${baseDirs.join(', ')}`);
    return baseDirs;
  } catch (err) {
    debug('Failed to list sbt project base directories: ', err);
    return undefined;
  }
}

/**
 * Last resort when the chained `show` failed: one sbt launch per project,
 * stopping at the first project whose base is `dir`. Failing projects are
 * skipped.
 */
async function isBaseOfAnyProject(
  sbtArgs,
  buildDir: string,
  projects: string[],
  dir: string,
): Promise<boolean> {
  debug(
    `sbt base directories incomplete for ${buildDir}; checking ${projects.length} projects one by one`,
  );
  for (const id of projects) {
    const baseDirs = await listProjectBaseDirectories(sbtArgs, buildDir, [id]);
    if (baseDirs && isProjectBaseDir(baseDirs, dir)) {
      return true;
    }
  }
  return false;
}

async function listProjects(
  sbtArgs,
  targetFilePath: string,
): Promise<string[]> {
  let args = ['-Dsbt.log.noformat=true'];
  if (sbtArgs) {
    args = args.concat(sbtArgs);
  }
  args.push('projects');

  try {
    const output = await subProcess.execute('sbt', args, {
      cwd: targetFilePath,
    });
    const projects = parseProjects(output);
    debug(`sbt projects in this build: ${projects.join(', ')}`);
    return projects;
  } catch (err) {
    debug(
      'Failed to list sbt projects, inspecting current project only: ',
      err,
    );
    return [];
  }
}

export function parseProjects(sbtOutput: string[]): string[] {
  const projects: string[] = [];
  let insideProjectList = false;

  for (const line of sbtOutput) {
    const plain = line.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
    if (/^\[info\]\s+In\s+\S+/.test(plain)) {
      insideProjectList = true;
      continue;
    }
    if (!insideProjectList) {
      continue;
    }
    const match = plain.match(/^\[info\]\s+(?:\*\s+)?([A-Za-z0-9_.-]+)\s*$/);
    if (!match) {
      continue;
    }
    if (!projects.includes(match[1])) {
      projects.push(match[1]);
    }
  }

  return projects;
}

async function injectSbtScript(
  sbtPluginPath: string,
  targetFolderPath: string,
): Promise<InjectedScript> {
  try {
    // We could be running from a bundled CLI generated by `pkg`.
    // The Node filesystem in that case is not real: https://github.com/zeit/pkg#snapshot-filesystem
    // Copying the injectable script into a temp file.
    let projectFolderPath = path.resolve(targetFolderPath, 'project/');
    debug(
      `injectSbtScript: injecting snyk sbt plugin "${sbtPluginPath}" in "${projectFolderPath}"`,
    );
    if (!fs.existsSync(projectFolderPath)) {
      debug(`injectSbtScript: "${projectFolderPath}" does not exist`);
      projectFolderPath = path.resolve(targetFolderPath, '..', 'project/');
      debug(`injectSbtScript: will try "${projectFolderPath}"`);
    }
    const tmpSbtPlugin = tmp.fileSync({
      postfix: '-SnykSbtPlugin.scala',
      tmpdir: projectFolderPath,
    });
    fs.createReadStream(sbtPluginPath).pipe(
      fs.createWriteStream(tmpSbtPlugin.name),
    );
    debug(`successfully injected plugin at "${tmpSbtPlugin.name}"`);
    return { path: tmpSbtPlugin.name, remove: tmpSbtPlugin.removeCallback };
  } catch (error) {
    error.message =
      error.message +
      '\n\n' +
      'Failed to create a temporary file to host Snyk script for SBT build analysis.';
    throw error;
  }
}

function generateSbtPluginPath(sbtVersion: string): string {
  let pluginName = 'SnykSbtPlugin-1.2x.scala';
  if (semver.lt(sbtVersion, '0.1.0')) {
    throw new Error('Snyk does not support sbt with version less than 0.1.0');
  }

  if (semver.gte(sbtVersion, '0.1.0') && semver.lt(sbtVersion, '1.1.0')) {
    pluginName = 'SnykSbtPlugin-0.1x.scala';
  }
  if (/index.[tj]s$/.test(__filename)) {
    debug('Applying ', pluginName);
    return path.join(__dirname, `../scala/${pluginName}`);
  } else {
    throw new Error(`Cannot locate ${pluginName} script`);
  }
}

async function pluginInspect(
  root: string,
  targetFile: string,
  options: any,
): Promise<types.PluginResult | null> {
  let injectedScript: InjectedScript | undefined;
  try {
    const targetFolderPath = path.dirname(path.resolve(root, targetFile));
    const { buildRoot } = await resolveBuildRoot(
      targetFolderPath,
      options.args,
    );
    const sbtArgs = buildArgs(options.args, false, true);
    const sbtVersion = await getSbtVersion(buildRoot, 'build.sbt');
    const sbtPluginPath = generateSbtPluginPath(sbtVersion);
    const packageName = path.basename(root);
    const packageVersion = '1.0.0';

    injectedScript = await injectSbtScript(sbtPluginPath, buildRoot);
    debug('injectedScript.path: ' + injectedScript.path);
    debug('args passed to plugin inspect: ', sbtArgs.join(' '));
    const stdout = await subProcess.execute('sbt', sbtArgs, {
      cwd: buildRoot,
    });
    return {
      plugin: {
        name: 'snyk:sbt',
        runtime: 'unknown',
        meta: {
          versionBuildInfo: {
            metaBuildVersion: {
              sbtVersion,
            },
          },
        },
      },
      package: parser.parseSbtPluginResults(
        stdout,
        packageName,
        packageVersion,
      ),
    };
  } catch (error) {
    debug(
      'Failed to produce dependency tree with custom snyk plugin due to error: ' +
        error.message,
    );
    return null;
  } finally {
    // in case of subProcess.execute failing, perform cleanup here, as putting it after `getInjectScriptPath` might
    // not be executed because of `sbt` failing
    if (injectedScript && injectedScript.remove) {
      try {
        injectedScript.remove();
        debug(`Removed the snyk sbt plugin at '${injectedScript.path}'`);
      } catch (error) {
        // NOTE(alexmu): we don't want to kill the whole run because we can still fall back to the legacy
        // method, but at least tell the user to clean up after the CLI :(.
        // tslint:disable-next-line:no-console
        console.warn(
          `Failed to remove the snyk sbt plugin file at '${injectedScript.path}'`,
        );
      }
    }
  }
}

function buildHintMessage(options) {
  const dgArgs = '`sbt ' + buildArgs(options.args, false).join(' ') + '`';
  const csArgs = '`sbt ' + buildArgs(options.args, true).join(' ') + '`';
  return (
    '\n\n' +
    'Please make sure that the `sbt-dependency-graph` plugin ' +
    '(https://github.com/jrudolph/sbt-dependency-graph) is installed ' +
    'globally or on the current project, and that ' +
    dgArgs +
    ' executes successfully on this project.\n\n' +
    'Alternatively you can use `sbt-coursier` for dependency resolution ' +
    '(https://get-coursier.io/docs/sbt-coursier), in which case ensure ' +
    'that the plugin is installed on the current project and that ' +
    csArgs +
    ' executes successfully on this project.\n\n' +
    'For this project we guessed that you are using ' +
    (options.useCoursier ? 'sbt-coursier' : 'sbt-dependency-graph') +
    '.\n\n' +
    'If the problem persists, collect the output of ' +
    dgArgs +
    ' or ' +
    csArgs +
    ' and contact support@snyk.io\n'
  );
}

export function buildArgs(
  sbtArgs,
  isCoursierProject?: boolean,
  isOutputGraph?: boolean,
  projects: string[] = [],
  sbtVersion?: string,
) {
  // force plain output so we don't have to parse colour codes
  let args = ['-Dsbt.log.noformat=true'];
  if (sbtArgs) {
    args = args.concat(sbtArgs);
  }

  // `dependencyTree` only reports the current project and the projects its root
  // aggregates, so builds whose root does not aggregate every module report a
  // partial tree. Ask each project in the build for its own tree instead.
  const isMultiProject = projects.length > 1;

  if (isOutputGraph) {
    args.push('snykRenderTree'); // sbt-dependency-graph
  } else if (isCoursierProject) {
    args.push(
      isMultiProject
        ? perProjectCommand(projects, 'coursierDependencyTree')
        : 'coursierDependencyTree',
    ); // coursier
  } else if (isMultiProject) {
    args.push(nativeMultiProjectCommand(projects, sbtVersion)); // sbt native
  } else {
    // enhance sbt default output width from 40 chars to the max
    args.push('set asciiGraphWidth := 999999999');
    args.push('dependencyTree'); // sbt native
  }

  return args;
}

function perProjectCommand(projects: string[], task: string): string {
  return projects.map((project) => `project ${project}; ${task}`).join('; ');
}

function nativeMultiProjectCommand(
  projects: string[],
  sbtVersion?: string,
): string {
  // enhance sbt default output width from 40 chars to the max, for every
  // project rather than only the one that is current when the build loads
  if (sbtVersion && semver.lt(sbtVersion, '1.0.0')) {
    return perProjectCommand(
      projects,
      'set asciiGraphWidth := 999999999; dependencyTree',
    );
  }
  return `set ThisBuild / asciiGraphWidth := 999999999; ${perProjectCommand(
    projects,
    'dependencyTree',
  )}`;
}
