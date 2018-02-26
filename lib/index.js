var path = require('path');
var subProcess = require('./sub-process');
var parser = require('./parse-sbt');
var packageFormatVersion = 'mvn:0.0.1';
var debug = require('debug')('snyk');

module.exports = {
  inspect: inspect,
};

module.exports.__tests = {
  buildArgs: buildArgs,
};

function inspect(root, targetFile, options) {
  if (!options) { options = { dev: false }; }
  return subProcess.execute('sbt',
    buildArgs(root, targetFile, options.args),
    { cwd: root })
  .then(function (result) {
    var packageName = path.basename(root);
    var packageVersion = '0.0.0';
    var depTree = parser.parse(result, packageName, packageVersion);
    depTree.packageFormatVersion = packageFormatVersion;

    return {
      plugin: {
        name: 'bundled:sbt',
        runtime: 'unknown',
      },
      package: depTree,
    };
  })
  .catch(function (error) {
    debug(error);
    if (typeof error == 'string') {
      var thrownError = parser.parseError(error);
      if (thrownError) {
        throw thrownError;
      }
      throw new Error('snyk-sbt-plugin error: ' + error);
    }

    throw error;
  });
}

function buildArgs(root, targetFile, sbtArgs) {
  var args = ['-Dsbt.log.noformat=true']; // force plain output
  if (sbtArgs) {
    args = args.concat(sbtArgs);
  }
  args.push('dependencyTree');
  return args;
}
