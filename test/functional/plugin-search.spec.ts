import * as path from 'path';
import * as os from 'os';
import * as version from '../../lib/version';
import { isPluginInstalled } from '../../lib/plugin-search';
import { sbtDependencyGraphPluginName, sbtDependencyGraphPluginNameNew } from '../../lib/constants';

describe('plugin-search test', () => {
  describe('isPluginInstalled locally', () => {
    beforeEach(() => {
      const empty = path.join(__dirname, '..', 'fixtures', 'empty-homdir');
      jest.spyOn(os, 'homedir').mockReturnValue(empty); // ensure no global installations take effect
    });
    afterEach(() => jest.resetAllMocks());
    describe('in local projects folder', () => {
      it('returns true if the project directory has sbt file with given plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('testproj-0.13', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, sbtDependencyGraphPluginName)
        expect(received).toBe(true);
      });
      it('returns false if the project directory has sbt file without plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('testproj-0.13', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, 'will.not.find')
        expect(received).toBe(false);
      });
    });
    describe('in local project/project folder', () => {
      it('returns true if the project/project directory has sbt file with given plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('nested-project', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, sbtDependencyGraphPluginName)
        expect(received).toBe(true);
      });
      it('returns false if the project/project directory has sbt file without plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('nested-project', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, 'will.not.find')
        expect(received).toBe(false);
      });
    });
  });
  describe('isPluginInstalled globally into 0.13', () => {
    beforeEach(() => {
      const homedir = path.join(__dirname, '..', 'fixtures', 'homedir-0.13');
      jest.spyOn(os, 'homedir').mockReturnValue(homedir);
      jest.spyOn(version, 'getSbtVersion').mockResolvedValue('0.13.10');
    });
    afterEach(() => jest.resetAllMocks());
    describe('in users home directory', () => {
      it('returns true if ~/.sbt/0.13/plugins directory has sbt file with given plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('simple-app', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, sbtDependencyGraphPluginName)
        expect(received).toBe(true);
      });
      it('returns false if ~/.sbt/0.13/plugins directory has sbt file without plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('simple-app', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, 'will.not.find');
        expect(received).toBe(false);
      });
    });
  });

  describe('isPluginInstalled globally into 1.0, using sbt-dependency-graph old naming convention', () => {
    beforeEach(() => {
      const homedir = path.join(__dirname, '..', 'fixtures', 'homedir-1.0');
      jest.spyOn(os, 'homedir').mockReturnValue(homedir);
      jest.spyOn(version, 'getSbtVersion').mockResolvedValue('1.0.0');
    });
    afterEach(() => jest.resetAllMocks());
    describe('in users home directory', () => {
      it('returns true if ~/.sbt/1.0/plugins directory has sbt file with given plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('simple-app', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, sbtDependencyGraphPluginName) ||
          await isPluginInstalled(
            root,
            targetFile,
            sbtDependencyGraphPluginNameNew
          );
        expect(received).toBe(true);
      });
      it('returns false if ~/.sbt/1.0/plugins directory has sbt file without plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('simple-app', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, 'will.not.find');
        expect(received).toBe(false);
      });
    });
  });

  describe('isPluginInstalled globally into 1.0, using addDependencyTreePlugin introduced for sbt versions 1.4+', () => {
    beforeEach(() => {
      const homedir = path.join(__dirname, '..', 'fixtures', 'homedir-1.0-sbt-1.4+');
      jest.spyOn(os, 'homedir').mockReturnValue(homedir);
      jest.spyOn(version, 'getSbtVersion').mockResolvedValue('1.0.0');
    });
    afterEach(() => jest.resetAllMocks());
    describe('in users home directory', () => {
      it('returns true if ~/.sbt/1.0/plugins directory has sbt file with given plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('simple-app-sbt-1.4.0', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, sbtDependencyGraphPluginName) ||
          await isPluginInstalled(
            root,
            targetFile,
            sbtDependencyGraphPluginNameNew
          );
        expect(received).toBe(true);
      });
      it('returns false if ~/.sbt/1.0/plugins directory has sbt file without plugin name', async () => {
        const root = path.join(__dirname, '..', 'fixtures');
        const targetFile = path.join('simple-app', 'build.sbt');
        const received = await isPluginInstalled(root, targetFile, 'will.not.find');
        expect(received).toBe(false);
      });
    });
  });
});
