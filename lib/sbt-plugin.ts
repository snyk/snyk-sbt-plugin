import * as debugModule from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import * as tmp from 'tmp';

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debug = debugModule('snyk-sbt-plugin');

tmp.setGracefulCleanup();

interface TmpFile {
  name: string;
  removeCallback: () => void;
}

export class SbtPlugin {
  private readonly sbtPluginDirPath: string;
  private readonly projectDirPath: string;

  private tmpFile: TmpFile | undefined;

  constructor(sbtPluginDirPath: string, projectDirPath: string) {
    this.sbtPluginDirPath = sbtPluginDirPath;
    this.projectDirPath = projectDirPath;
  }

  public inject(sbtVersion: string): boolean {
    const sbtPluginPath = generateSbtPluginPath(this.sbtPluginDirPath, sbtVersion);
    try {
      // We could be running from a bundled CLI generated by `pkg`.
      // The Node filesystem in that case is not real: https://github.com/zeit/pkg#snapshot-filesystem
      // Copying the injectable script into a temp file.
      const tmpFile = tmp.fileSync({
        postfix: '-SnykSbtPlugin.scala',
        dir: this.projectDirPath,
      });
      fs.createReadStream(sbtPluginPath).pipe(fs.createWriteStream(tmpFile.name));
      debug(`Injected the sbt plugin at: ${tmpFile.name}`);
      this.tmpFile = tmpFile;
      return true;
    } catch (error) {
      debug(`Failed to create a temporary file to host Snyk script for sbt build analysis: ${error.message}`);
      return false;
    }
  }

  public remove(): boolean {
    if (this.tmpFile) {
      try {
        this.tmpFile.removeCallback();
        debug(`Removed the sbt plugin at: ${this.tmpFile.name}`);
        return true;
      } catch (error) {
        debug(`Failed to removed the sbt plugin at: ${this.tmpFile.name}`);
        return false;
      }
    } else {
      return true;
    }
  }

  public pluginFileName(): string | undefined {
    if (this.tmpFile) {
      return this.tmpFile.name;
    }
  }
}

function generateSbtPluginPath(sbtPluginDirPath: string, sbtVersion: string): string {
  let pluginName = 'SnykSbtPlugin-1.2x.scala';
  if (semver.gte(sbtVersion, '0.1.0') && semver.lt(sbtVersion, '1.1.0')) {
    pluginName = 'SnykSbtPlugin-0.1x.scala';
  }
  return path.join(sbtPluginDirPath, pluginName);
}
