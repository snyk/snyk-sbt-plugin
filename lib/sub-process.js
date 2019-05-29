var childProcess = require('child_process');

module.exports.execute = function (command, args, options) {
  var spawnOptions = {shell: true};
  if (options && options.cwd) {
    spawnOptions.cwd = options.cwd;
  }
  spawnOptions.stdio = 'pipe';

  return new Promise(function (resolve, reject) {
    var proc = childProcess.spawnSync(command, args, spawnOptions);
    // proc.stdout.on('data', function (data) {
    //   stdout = stdout + data;
    // });
    // proc.stderr.on('data', function (data) {
    //   stderr = stderr + data;
    // });

    if (proc.error) {
      return reject(new Error(proc.stdout || proc.stderr));
    }
    resolve(proc.stdout || proc.stderr);
  });
};
