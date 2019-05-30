const childProcess = require('child_process');
const debugModule = require('debug');

// To enable debugging output, run the CLI as `DEBUG=snyk-sbt-plugin snyk ...`
const debugLogging = debugModule('snyk-sbt-plugin');

module.exports.execute = (command, args, options) => {
  const spawnOptions = {shell: true};
  if (options && options.cwd) {
    spawnOptions.cwd = options.cwd;
  }

  const fullCommand = command + ' ' + args.join(' ');

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = childProcess.spawn(command, args, spawnOptions);
    proc.stdout.on('data', (data) => {
      const strData = data.toString();
      stdout = stdout + strData;
      strData.split('\n').forEach((str) => {
        debugLogging(str);
      });
    });

    proc.stderr.on('data', (data) => {
      stderr = stderr + data;
      data.toString().split('\n').forEach((str) => {
        debugLogging(str);
      });
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(
          `>>> command: ${fullCommand} >>> exit code: ${code} ` +
          `>>> stdout: ${stdout} >>> stderr: ${stderr}`));
      }
      if (stderr) {
        debugLogging('subprocess exit code = 0, but stderr was not empty: ' + stderr);
      }
      resolve(stdout);
    });
  });
};
