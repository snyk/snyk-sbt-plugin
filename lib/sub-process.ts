import * as childProcess from 'child_process';
import * as treeKill from 'tree-kill';
import * as debugModule from 'debug';
import { escapeAll, quoteAll } from 'shescape/stateless';
import * as os from 'node:os';

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debugLogging = debugModule('snyk-sbt-plugin');

// Disabled by default, to set run the CLI as `PROC_TIMEOUT=100000 snyk ...`
const TIMEOUT = process.env.PROC_TIMEOUT || '0';
const PROC_TIMEOUT = parseInt(TIMEOUT, 10);

export const execute = (
  command: string,
  args: string[],
  options: { cwd?: string },
): Promise<string[]> => {
  const spawnOptions: { cwd?: string; shell: boolean } = { shell: false };
  if (options && options.cwd) {
    spawnOptions.cwd = options.cwd;
  }

  if (args) {
    // Best practices, also security-wise, is to not invoke processes in a shell, but as a stand-alone command.
    // However, on Windows, we need to invoke the command in a shell, due to internal NodeJS problems with this approach
    // see: https://nodejs.org/docs/latest-v24.x/api/child_process.html#spawning-bat-and-cmd-files-on-windows
    const isWinLocal = /^win/.test(os.platform());
    if (isWinLocal) {
      spawnOptions.shell = true;
      // Further, we distinguish between quoting and escaping arguments since quoteAll does not support quoting without
      // supplying a shell, but escapeAll does.
      // See this (very long) discussion for more details: https://github.com/ericcornelissen/shescape/issues/2009
      args = quoteAll(args, { ...spawnOptions, flagProtection: false });
    } else {
      args = escapeAll(args, { ...spawnOptions, flagProtection: false });
    }
  }
  return new Promise((resolve, reject) => {
    const out = {
      stdout: [],
      stderr: '',
    };
    let lastLine = '';

    const proc = childProcess.spawn(command, args, spawnOptions);
    if (PROC_TIMEOUT !== 0) {
      setTimeout(kill(proc.pid, out), PROC_TIMEOUT);
    }

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');

      lines[0] = lastLine + lines[0];
      lastLine = lines.pop();

      lines.forEach((str) => {
        out.stdout.push(str);
        debugLogging(str);
      });
      if (lastLine.includes('(q)uit')) {
        proc.stdin.write('q\n');
        debugLogging(
          'sbt is requiring input. Provided (q)uit signal. ' +
            'There is no current workaround for this, see: https://stackoverflow.com/questions/21484166',
        );
      }
    });

    proc.stderr.on('data', (data) => {
      out.stderr = out.stderr + data;
      data
        .toString()
        .split('\n')
        .forEach((str) => {
          debugLogging(str);
        });
    });

    proc.on('error', (err) => {
      debugLogging(`Child process errored with: ${err.message}`);
    });

    proc.on('exit', (code) => {
      debugLogging(`Child process exited with code: ${code}`);
    });

    proc.on('close', (code) => {
      out.stdout.push(lastLine);
      debugLogging(lastLine);
      lastLine = '';

      if (code !== 0) {
        const fullCommand = command + ' ' + args.join(' ');
        const errorMessage =
          `>>> command: ${fullCommand} ` +
          (code ? `>>> exit code: ${code} ` : '') +
          `>>> stdout: ${out.stdout.join('\n')} ` +
          (out.stderr ? `>>> stderr: ${out.stderr}` : 'null');
        return reject(new Error(errorMessage));
      }
      if (out.stderr) {
        debugLogging(
          'subprocess exit code = 0, but stderr was not empty: ' + out.stderr,
        );
      }
      resolve(out.stdout);
    });
  });
};

function kill(id, out) {
  return () => {
    out.stderr =
      out.stderr +
      'Process timed out. To set longer timeout run with `PROC_TIMEOUT=value_in_ms`\n';
    return treeKill(id);
  };
}
