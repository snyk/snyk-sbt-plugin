import * as fs from 'fs';
import * as path from 'path';
import * as subProcess from './sub-process';

import * as debugModule from 'debug';
const debug = debugModule('snyk-sbt-plugin');

export async function getSbtVersion(
  root: string,
  targetFile: string,
): Promise<string> {
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
    debug(
      'Failed to get sbt version from project/build.properties: ' + err.message,
    );
  }

  try {
    // run in the project directory, so "version in this project" is this project
    const projectDir = path.dirname(path.resolve(root, targetFile));
    const stdout = await subProcess.execute(
      'sbt',
      ['--version'],
      fs.existsSync(projectDir) ? { cwd: projectDir } : {},
    );
    const version = parseSbtVersionOutput(stdout);
    if (version) {
      return version;
    }
    debug('No sbt version found in sbt --version output');
  } catch (err) {
    debug('Failed to get sbt version sbt --version' + err.message);
  }

  // should never get here, but if it does
  // assume sbt 1.0.0 for the purposes of copying the correct scala script and global plugin search
  debug('Assuming sbt version is 1.0.0');
  return '1.0.0';
}

// `sbt --version` prints the project's sbt version and the runner's version:
//   sbt version in this project: 1.5.5
//   sbt script version: 1.5.5   (older runners)
//   sbt runner version: 2.0.9   (sbt 1.10+ and 2.x runners)
// The project line is the version that builds the project. sbt 2 runners omit
// it when there is no project/build.properties and build with their own version.
export function parseSbtVersionOutput(lines: string[]): string | undefined {
  const patterns = [
    /sbt version in this project:\s*(\S+)/,
    /sbt (?:runner|script) version:\s*(\S+)/,
  ];
  for (const pattern of patterns) {
    for (const line of lines) {
      const match = pattern.exec(line);
      if (match) {
        return match[1];
      }
    }
  }
  return undefined;
}
