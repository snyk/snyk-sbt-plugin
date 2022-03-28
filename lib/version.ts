import * as fs from 'fs';
import * as path from 'path';
import * as subProcess from './sub-process';

import * as debugModule from 'debug';
const debug = debugModule('snyk-sbt-plugin');

export async function getSbtVersion(root: string, targetFile: string): Promise<string> {
  try {
    let buildPropsPath = path.join(
      root,
      path.dirname(targetFile),
      'project/build.properties',
      );
    debug(`getSbtVersion: buildPropsPath=${buildPropsPath}`);
    if (!fs.existsSync(buildPropsPath)) {
      // NOTE(alexmu): We've seen this fail with the wrong path.
      // If the path we derived above doesn't exist, we try to build a more sensible one.
      // targetFile could be a path, so we need to call resolve()
      debug(`getSbtVersion: "${buildPropsPath}" doesn't exist`);
      const resolvedPath = path.resolve(root, targetFile);
      const targetFilePath = path.dirname(resolvedPath);
      buildPropsPath = path.resolve(targetFilePath, 'project/build.properties');
    }
    if (!fs.existsSync(buildPropsPath)) {
      // NOTE(alexmu): Some projects don't have proper subproject structures,
      // e.g. don't have a project/ subfolder. This breaks snyk's assumptions
      // so we try to work around it here.
      debug(`getSbtVersion: "${buildPropsPath}" does not exist`);
      const resolvedPath = path.resolve(root, '..', targetFile);
      const targetFilePath = path.dirname(resolvedPath);
      buildPropsPath = path.resolve(targetFilePath, 'project/build.properties');
      debug(`getSbtVersion: will try "${buildPropsPath}"`);
    }
    return fs
      .readFileSync(buildPropsPath, 'utf-8')
      .split('\n') // split into lines
      .find((line) => !!line.match(/sbt\.version\s*=/))! // locate version line
      .split(/=\s*/)[1]
      .trim(); // return only the version
  } catch (err) {
    debug('Failed to get sbt version from project/build.properties: ' + err.message);
  }

  try {
    const stdout = await subProcess.execute('sbt', ['--version'], {});
    return stdout.split('\n')
    .find((line) => !!line.match(/sbt script version/))!
    .split(':')[1]
    .trim();
  } catch (err) {
    debug('Failed to get sbt version sbt --version' + err.message);
  }

  // should never get here, but if it does
  // assume sbt 1.0.0 for the purposes of copying the correct scala script and global plugin search
  debug('Assuming sbt version is 1.0.0');
  return '1.0.0';
}
