import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import * as debugModule from 'debug';

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debug = debugModule('snyk-sbt-plugin');

import * as subProcess from './sub-process';
import * as parser from './parse-sbt';
import * as types from './types';

import * as tmp from 'tmp';
tmp.setGracefulCleanup();

const packageFormatVersion = 'mvn:0.0.1';

export async function inspect(root, targetFile, options): Promise<types.PluginResult> {
  if (!options) {
    options = {dev: false};
  }

  if (options['sbt-graph']) {
    const res = await pluginInspect(root, targetFile, options);
    if (res) {
      return res;
    } else {
      debug('Falling back to legacy inspect');
    }
  }

  const result = await legacyInspect(root, targetFile, options);
  const packageName = path.basename(root);
  const packageVersion = '0.0.0';
  const depTree = parser.parse(result.sbtOutput, packageName, packageVersion, result.coursier);
  depTree.packageFormatVersion = packageFormatVersion;

  return {
    plugin: {
      name: 'bundled:sbt',
      runtime: 'unknown',
    },
    package: depTree,
  };
}

async function legacyInspect(root: string, targetFile: string, options: any) {
  const targetFilePath = path.dirname(path.resolve(root, targetFile));
  if (!fs.existsSync(targetFilePath)) {
    debug(`build.sbt not found at location: ${targetFilePath}. This may result in no dependencies`);
  }
  const detectedCoursier = coursierPluginInProject(targetFilePath);
  let useCoursier = detectedCoursier;

  const sbtArgs = buildArgs(options.args, useCoursier);

  try {
    return {
      sbtOutput: await subProcess.execute('sbt', sbtArgs, {cwd: targetFilePath}),
      coursier: useCoursier,
    };
  } catch (error) {
    if (detectedCoursier) {
      // if we've tried coursier already, we'll fallback to dependency-graph
      // in case we've failed to parse the files correctly #paranoid
      useCoursier = false;
      const sbtArgsNoCoursier = buildArgs(options.args, useCoursier);
      return {
        sbtOutput: await subProcess.execute('sbt', sbtArgsNoCoursier, {cwd: targetFilePath}),
        coursier: useCoursier,
      };
    } else {
      // otherwise cascade the reject

      const dgArgs = '`sbt ' + buildArgs(options.args, false).join(' ') + '`';
      const csArgs = '`sbt ' + buildArgs(options.args, true).join(' ') + '`';
      error.message = error.message + '\n\n' +
        'Please make sure that the `sbt-dependency-graph` plugin ' +
        '(https://github.com/jrudolph/sbt-dependency-graph) is installed ' +
        'globally or on the current project, and that ' +
        dgArgs + ' executes successfully on this project.\n\n' +
        'Alternatively you can use `sbt-coursier` for dependency resolution ' +
        '(https://get-coursier.io/docs/sbt-coursier), in which case ensure ' +
        'that the plugin is installed on the current project and that ' +
        csArgs + ' executes successfully on this project.\n\n' +
        'For this project we guessed that you are using ' +
        (detectedCoursier ? 'sbt-coursier' : 'sbt-dependency-graph') + '.\n\n' +
        'If the problem persists, collect the output of ' +
        dgArgs + ' or ' + csArgs + ' and contact support@snyk.io\n';

      throw error;
    }
  }
}

function generateSbtPluginPath(sbtVersion: string): string {
  let pluginName = 'SnykSbtPlugin-1.2x.scala';
  if (semver.lt(sbtVersion, '0.1.0')) {
    throw new Error('Snyk does not support sbt with version less than 0.1.0');
  }

  if (semver.gte(sbtVersion, '0.1.0') && semver.lt(sbtVersion, '1.2.0')) {
    pluginName = 'SnykSbtPlugin-0.1x.scala';
  }
  if (/index.js$/.test(__filename)) {
    // running from ./dist
    return path.join(__dirname, `../lib/${pluginName}`);
  } else if (/index.ts$/.test(__filename)) {
    // running from ./lib
    return path.join(__dirname, pluginName);
  } else {
    throw new Error(`Cannot locate ${pluginName} script`);
  }
}

async function pluginInspect(root: string, targetFile: string, options: any): Promise<types.PluginResult | null> {
  try {
    const targetFilePath = path.dirname(path.resolve(root, targetFile));
    const sbtArgs = buildArgs(options.args, false, true);
    const sbtVersion = getSbtVersion(root, targetFile);
    const sbtPluginPath = generateSbtPluginPath(sbtVersion);

    try {
      // We could be running from a bundled CLI generated by `pkg`.
      // The Node filesystem in that case is not real: https://github.com/zeit/pkg#snapshot-filesystem
      // Copying the injectable script into a temp file.
      const tmpSbtPlugin = tmp.fileSync({
        postfix: '-SnykSbtPlugin.scala',
        dir: path.resolve(targetFilePath, 'project/'),
      });
      await fs.createReadStream(sbtPluginPath).pipe(fs.createWriteStream(tmpSbtPlugin.name));
    } catch (error) {
      error.message = error.message + '\n\n' +
        'Failed to create a temporary file to host Snyk script for SBT build analysis.';
      throw error;
    }

    const stdout = await subProcess.execute('sbt', sbtArgs, {cwd: targetFilePath});

    return {
      plugin: {
        name: 'snyk:sbt',
        runtime: 'unknown',
      },
      package: parser.parseSbtPluginResults(stdout),
    };
  } catch (error) {
    debug('Failed to produce dependency tree with custom snyk plugin due to error: ' + error.message);
    return null;
  }
}

function getSbtVersion(root: string, targetFile: string): string {
  const buildPropsPath = path.join(root, path.dirname(targetFile), 'project/build.properties');
  return fs.readFileSync(buildPropsPath, 'utf-8')
    .split('\n') // split into lines
    .find((line) => line.startsWith('sbt.version='))! // locate version line
    .split('=')[1]; // return only the version
}

 // guess whether we have the couriser plugin by looking for sbt-coursier
// in project and project/project
function coursierPluginInProject(basePath) {
  const sbtFileList = sbtFiles(path.join(basePath, 'project'))
    .concat(sbtFiles(path.join(basePath, 'project', 'project')));
  const searchResults = sbtFileList.map ((file) => {
    return searchWithFs(file);
  });
  return searchResults.filter(Boolean).length > 0;
}

 // provide a list of .sbt files in the specified directory
function sbtFiles(basePath) {
  if (fs.existsSync(basePath) && fs.lstatSync(basePath).isDirectory()) {
    return fs.readdirSync(basePath).filter((fileName) => {
      return path.extname(fileName) === '.sbt';
    }).map((file) => {
      return path.join(basePath, file);
    });
  }
  return [];
}

function searchWithFs( filename ) {
  const buffer = fs.readFileSync(filename);
  return buffer.indexOf('sbt-coursier') > -1;
}

export function buildArgs(sbtArgs, isCoursierProject?: boolean, isOutputGraph?: boolean) {
  // force plain output so we don't have to parse colour codes
  let args = ['\"-Dsbt.log.noformat=true\"'];
  if (sbtArgs) {
    args = args.concat(sbtArgs);
  }

  if (isOutputGraph) {
    args.push('snykRenderTree');
  } else if (isCoursierProject) {
    args.push('coursierDependencyTree');
  } else {
    args.push('dependencyTree');
  }

  return args;
}
