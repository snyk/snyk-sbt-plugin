import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as semver from 'semver';
import { getSbtVersion } from './version';

export async function isPluginInstalled(
  root: string,
  targetFile: string,
  plugin: string,
): Promise<boolean> {
  const searchGlobally = await searchGlobalFiles(root, targetFile, plugin);
  return searchGlobally || searchProjectFiles(root, targetFile, plugin);
}

// search project and project/project relative to the root
function searchProjectFiles(
  root: string,
  targetFile: string,
  plugin: string,
): boolean {
  const basePath = path.dirname(path.resolve(root, targetFile));
  const sbtFileList = sbtFiles(path.join(basePath, 'project')).concat(
    sbtFiles(path.join(basePath, 'project', 'project')),
  );
  const searchResults = sbtFileList.map((file) => {
    return searchWithFs(file, plugin);
  });
  return searchResults.filter(Boolean).length > 0;
}

// search globally installed plugins (~/.sbt)
async function searchGlobalFiles(
  root: string,
  targetFile: string,
  plugin: string,
): Promise<boolean> {
  const homedir = os.homedir();
  const sbtVersion = await getSbtVersion(root, targetFile);
  // https://www.scala-sbt.org/1.x/docs/Using-Plugins.html#Global+plugins
  const pluginsPath = semver.lt(sbtVersion, '1.0.0')
    ? path.join(homedir, '.sbt', '0.13', 'plugins')
    : path.join(homedir, '.sbt', '1.0', 'plugins');
  const sbtFileList = sbtFiles(pluginsPath);
  const searchResults = sbtFileList.map((file) => {
    return searchWithFs(file, plugin);
  });
  return searchResults.filter(Boolean).length > 0;
}

// provide a list of .sbt files in the specified directory
function sbtFiles(basePath) {
  if (fs.existsSync(basePath) && fs.lstatSync(basePath).isDirectory()) {
    return fs
      .readdirSync(basePath)
      .filter((fileName) => {
        return path.extname(fileName) === '.sbt';
      })
      .map((file) => {
        return path.join(basePath, file);
      });
  }
  return [];
}

function searchWithFs(filename, word) {
  let buffer = fs.readFileSync(filename, { encoding: 'utf8' });

  // remove single-line and multi-line comments
  const singleLineCommentPattern = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm;
  buffer = buffer.replace(singleLineCommentPattern, '');

  return buffer.indexOf(word) > -1;
}
