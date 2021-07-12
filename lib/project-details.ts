import * as path from 'path';
import * as fs from 'fs';

import * as debugModule from 'debug';

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debug = debugModule('snyk-sbt-plugin');

const sbtCoursierPluginName = 'sbt-coursier';
const sbtDependencyGraphPluginName = 'sbt-dependency-graph';

export interface ProjectDetails {
  root: string;
  targetFilePath: string;
  projectDirPath: string;
  sbtVersion?: string;
  isCoursierPresent: boolean;
  isSbtDependencyGraphPresent: boolean;
}

export function determineProjectDetails(root: string, targetFile: string): ProjectDetails {
  // targetFile could be a path, so we need to call resolve()
  const targetFilePath = path.dirname(path.resolve(root, targetFile));
  const projectDirPath = path.resolve(targetFilePath, 'project/');
  return {
    root,
    targetFilePath,
    projectDirPath,
    sbtVersion: getSbtVersion(projectDirPath),
    isCoursierPresent: isPluginInProject(targetFilePath, sbtCoursierPluginName),
    isSbtDependencyGraphPresent: isPluginInProject(targetFilePath, sbtDependencyGraphPluginName),
  };
}
function getSbtVersion(projectDirPath: string): string | undefined {
  try {
    const buildPropsPath = path.join(projectDirPath, 'build.properties');
    return fs.readFileSync(buildPropsPath, 'utf-8')
      .split('\n') // split into lines
      .find((line) => !!line.match(/sbt\.version\s*=/))! // locate version line
      .split(/=\s*/)[1].trim(); // return only the version
  } catch (error) {
    debug(`Failed to determine sbt version: ${error.message}`);
    return undefined;
  }
}

// guess whether we have a given plugin by looking
// in project and project/project
function isPluginInProject(targetFilePath: string, plugin: string): boolean {
  const sbtFileList = sbtFiles(path.join(targetFilePath, 'project'))
    .concat(sbtFiles(path.join(targetFilePath, 'project', 'project')));
  const searchResults = sbtFileList.map((file) => {
    return searchWithFs(file, plugin);
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

function searchWithFs(filename, word) {
  const buffer = fs.readFileSync(filename);
  return buffer.indexOf(word) > -1;
}
