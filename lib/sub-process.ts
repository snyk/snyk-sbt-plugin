import * as childProcess from 'child_process';
import * as treeKill from 'tree-kill';
import * as debugModule from 'debug';
import { quoteAll } from 'shescape';

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debugLogging = debugModule('snyk-sbt-plugin');

// Disabled by default, to set run the CLI as `PROC_TIMEOUT=100000 snyk ...`
const TIMEOUT = process.env.PROC_TIMEOUT || '0';
const PROC_TIMEOUT = parseInt(TIMEOUT, 10);

export const execute = (
  command: string,
  args: string[],
  options: {cwd?: string},
): Promise<string>  => {
  const spawnOptions: {cwd?: string, shell: boolean} = {shell: true};
  if (options && options.cwd) {
    spawnOptions.cwd = options.cwd;
  }
  args = quoteAll(args, spawnOptions);

  return new Promise((resolve, reject) => {
    const out = {
      stdout: '',
      stderr: '',
    };

    const proc = childProcess.spawn(command, args, spawnOptions);
    if (PROC_TIMEOUT !== 0) {
      setTimeout(kill(proc.pid, out), PROC_TIMEOUT);
    }

    proc.stdout.on('data', (data) => {
      const strData = data.toString();
      out.stdout = out.stdout + strData;
      strData.split('\n').forEach((str) => {
        debugLogging(str);
      });
      if (strData.includes('(q)uit')) {
        proc.stdin.write('q\n');
        debugLogging('sbt is requiring input. Provided (q)uit signal. ' +
          'There is no current workaround for this, see: https://stackoverflow.com/questions/21484166');
      }
    });

    proc.stderr.on('data', (data) => {
      out.stderr = out.stderr + data;
      data.toString().split('\n').forEach((str) => {
        debugLogging(str);
      });
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const fullCommand = command + ' ' + args.join(' ');
        const errorMessage = `>>> command: ${fullCommand} ` +
          (code ? `>>> exit code: ${code} ` : '') +
          (out.stdout ? `>>> stdout: ${out.stdout} ` : '') +
          (out.stderr ? `>>> stderr: ${out.stderr}` : 'null');
        return reject(new Error(errorMessage));
      }
      if (out.stderr) {
        debugLogging('subprocess exit code = 0, but stderr was not empty: ' + out.stderr);
      }
      resolve(out.stdout);
    });
  });
};

function kill(id, out) {
  return () => {
    out.stderr = out.stderr + 'Process timed out. To set longer timeout run with `PROC_TIMEOUT=value_in_ms`\n';
    return treeKill(id);
  };
}
