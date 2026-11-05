import * as path from 'path';
import { getSbtVersion, parseSbtVersionOutput } from '../../lib/version';
import * as subProcess from '../../lib/sub-process';

describe('version test', () => {
  const fixtures = path.join(__dirname, '..', 'fixtures');
  describe('getSbtVersion', () => {
    it.each`
      fixture                      | expected
      ${'testproj-0.13'}           | ${'0.13.18'}
      ${'testproj-1.2.8'}          | ${'1.2.8'}
      ${'testproj-coursier-1.3.5'} | ${'1.3.5'}
    `('returns $expected for $fixture', async ({ fixture, expected }) => {
      const root = path.join(fixtures, fixture);
      const received = await getSbtVersion(root, '');
      expect(received).toBe(expected);
    });

    it('fall back onto sbt --version if checking build.properties fails', async () => {
      const root = path.join(fixtures, 'empty-homdir');
      jest.spyOn(subProcess, 'execute').mockResolvedValue(
        `
sbt version in this project: 1.5.5
sbt script version: 1.5.5
`.split('\n'),
      );
      const received = await getSbtVersion(root, '');
      expect(received).toBe('1.5.5');
    });

    it('runs sbt --version in the project directory', async () => {
      const root = path.join(fixtures, 'empty-homdir');
      const execute = jest
        .spyOn(subProcess, 'execute')
        .mockResolvedValue(['sbt runner version: 2.0.9']);
      await getSbtVersion(root, 'build.sbt');
      expect(execute).toHaveBeenCalledWith('sbt', ['--version'], {
        cwd: root,
      });
    });

    it('assume 1.0.0 if checking build.properties and executing sbt --version fail', async () => {
      const root = path.join(fixtures, 'empty-homdir');
      jest.spyOn(subProcess, 'execute').mockRejectedValue('oops');
      const received = await getSbtVersion(root, '');
      expect(received).toBe('1.0.0');
    });
  });

  describe('parseSbtVersionOutput', () => {
    it.each`
      output                                                                           | expected
      ${['sbt version in this project: 1.5.5', 'sbt script version: 1.5.5']}           | ${'1.5.5'}
      ${['sbt version in this project: 1.5.5', 'sbt runner version: 2.0.9']}           | ${'1.5.5'}
      ${['sbt version in this project: 2.0.9', 'sbt runner version: 2.0.9']}           | ${'2.0.9'}
      ${['sbt runner version: 2.0.9', '[info] sbt runner (sbt-the-shell-script) ...']} | ${'2.0.9'}
      ${['sbt script version: 1.4.9']}                                                 | ${'1.4.9'}
      ${['[error] failed to connect to server']}                                       | ${undefined}
    `('returns $expected for $output', ({ output, expected }) => {
      expect(parseSbtVersionOutput(output)).toBe(expected);
    });
  });
});
