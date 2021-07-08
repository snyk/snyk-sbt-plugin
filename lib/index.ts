import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import * as debugModule from 'debug';

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debug = debugModule('snyk-sbt-plugin');

import * as subProcess from './sub-process';
import * as parser from './parse-sbt';
import * as types from './types';

import { determineProjectDetails, ProjectDetails } from './project-details';
import { SbtPlugin } from './sbt-plugin';

const packageFormatVersion = 'mvn:0.0.1';

export async function inspect(root, targetFile, options): Promise<types.PluginResult> {
  const projectDetails = determineProjectDetails(root, targetFile);
  debug(`project details: ${JSON.stringify(projectDetails)}`);

  if (!options) {
    options = {dev: false};
  }

  Object.assign(options, { isCoursierPresent: projectDetails.isCoursierPresent });

  const pluginDirPath = path.join(__dirname, `../scala`);
  const sbtPlugin = new SbtPlugin(pluginDirPath, projectDetails.projectDirPath);
  // in order to apply the pluginInspect, coursier should *not* be present and
  // sbt-dependency-graph should be present and
  // we managed to inject the snyk sbt plugin
  if (
    !projectDetails.isCoursierPresent &&
    projectDetails.isSbtDependencyGraphPresent &&
    projectDetails.sbtVersion &&
    semver.gte(projectDetails.sbtVersion, '0.1.0') &&
    sbtPlugin.inject(projectDetails.sbtVersion)
  ) {
    debug('applying plugin inspect');
    const res = await pluginInspect(projectDetails, options);
    if (res) {
      if (!sbtPlugin.remove()) {
        // tslint:disable-next-line:no-console
        console.warn(
          `Failed to remove the snyk sbt plugin at ${sbtPlugin.pluginFileName()}. ` +
          `Please remove it manually.`,
        );
      }
      res.package.packageFormatVersion = packageFormatVersion;

      return res;
    } else {
      debug('coursier present = ' + projectDetails.isCoursierPresent + ', sbt-dependency-graph present = '
          + projectDetails.isSbtDependencyGraphPresent);
      debug('Falling back to legacy inspect');
      // tslint:disable-next-line:no-console
      console.warn(buildHintMessage(options));
    }
  } else {
    debug('falling back to legacy inspect');
  }
  if (!sbtPlugin.remove()) {
    // tslint:disable-next-line:no-console
    console.warn(`Failed to remove the snyk sbt plugin at ${sbtPlugin.pluginFileName()}. Please remove it manually.`);
  }
  const result = await legacyInspect(projectDetails, options);
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

async function legacyInspect(projectDetails: ProjectDetails, options: any) {
  if (!fs.existsSync(projectDetails.targetFilePath)) {
    debug(`build.sbt not found at location: ${projectDetails.targetFilePath}. This may result in no dependencies`);
  }
  let useCoursier = options.isCoursierPresent;

  const sbtArgs = buildArgs(options.args, useCoursier);

  try {
    return {
      sbtOutput: await subProcess.execute('sbt', sbtArgs, {cwd: projectDetails.targetFilePath}),
      coursier: useCoursier,
    };
  } catch (error) {
    if (useCoursier) {
      // if we've tried coursier already, we'll fallback to dependency-graph
      // in case we've failed to parse the files correctly #paranoid
      useCoursier = false;
      const sbtArgsNoCoursier = buildArgs(options.args, useCoursier);
      return {
        sbtOutput: await subProcess.execute('sbt', sbtArgsNoCoursier, {cwd: projectDetails.targetFilePath}),
        coursier: useCoursier,
      };
    } else {
      // otherwise cascade the reject

      error.message = error.message + buildHintMessage(options);

      throw error;
    }
  }
}

async function pluginInspect(projectDetails: ProjectDetails, options: any): Promise<types.PluginResult | null> {
  const packageName = path.basename(projectDetails.root);
  const packageVersion = '1.0.0';

  try {
    const sbtArgs = buildArgs(options.args, false, true);
    const stdout = await subProcess.execute('sbt', sbtArgs, {cwd: projectDetails.targetFilePath});
    return {
      plugin: {
        name: 'snyk:sbt',
        runtime: 'unknown',
      },
      package: parser.parseSbtPluginResults(stdout, packageName, packageVersion),
    };
  } catch (error) {
    debug(`Failed to produce dependency tree with custom snyk plugin due to error: ${error.message}`);
    return null;
  }
}

function buildHintMessage(options) {
  const dgArgs = '`sbt ' + buildArgs(options.args, false).join(' ') + '`';
  const csArgs = '`sbt ' + buildArgs(options.args, true).join(' ') + '`';
  return '\n\n' +
      'Please make sure that the `sbt-dependency-graph` plugin ' +
      '(https://github.com/jrudolph/sbt-dependency-graph) is installed ' +
      'globally or on the current project, and that ' +
      dgArgs + ' executes successfully on this project.\n\n' +
      'Alternatively you can use `sbt-coursier` for dependency resolution ' +
      '(https://get-coursier.io/docs/sbt-coursier), in which case ensure ' +
      'that the plugin is installed on the current project and that ' +
      csArgs + ' executes successfully on this project.\n\n' +
      'For this project we guessed that you are using ' +
      (options.isCoursierPresent ? 'sbt-coursier' : 'sbt-dependency-graph') + '.\n\n' +
      'If the problem persists, collect the output of ' +
      dgArgs + ' or ' + csArgs + ' and contact support@snyk.io\n';
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
