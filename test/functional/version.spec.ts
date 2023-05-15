import * as path from 'path';
import { getSbtVersion } from '../../lib/version';
import * as subProcess from '../../lib/sub-process';

describe('version test', () => {
  const fixtures = path.join(__dirname, '..', 'fixtures');
  describe('getSbtVersion', () => {
    it.each`
      fixture                      | expected
      ${'testproj-0.13'}           | ${'0.13.17'}
      ${'testproj-1.2.8'}          | ${'1.2.8'}
      ${'testproj-coursier-1.3.5'} | ${'1.3.5'}
    `('returns $expected for $fixture', async ({ fixture, expected }) => {
      const root = path.join(fixtures, fixture);
      const received = await getSbtVersion(root, '');
      expect(received).toBe(expected);
    });

    it('fall back onto sbt --version if checking build.properties fails', async () => {
      const root = path.join(fixtures, 'empty-homdir');
      jest.spyOn(subProcess, 'execute').mockResolvedValue(`
sbt version in this project: 1.5.5
sbt script version: 1.5.5
`.split('\n'));
      const received = await getSbtVersion(root, '');
      expect(received).toBe('1.5.5');
    });

    it('assume 1.0.0 if checking build.properties and executing sbt --version fail', async () => {
      const root = path.join(fixtures, 'empty-homdir');
      jest.spyOn(subProcess, 'execute').mockRejectedValue('oops');
      const received = await getSbtVersion(root, '');
      expect(received).toBe('1.0.0');
    });
  });
});
