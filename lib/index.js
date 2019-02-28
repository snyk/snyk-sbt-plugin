var path = require('path');
var fs = require('fs');
var subProcess = require('./sub-process');
var parser = require('./parse-sbt');
var packageFormatVersion = 'mvn:0.0.1';

module.exports = {
  inspect: inspect,
};

module.exports.__tests = {
  buildArgs: buildArgs,
};

function inspect(root, targetFile, options) {
  if (!options) {
    options = {dev: false};
  }

  const targetFilePath = path.dirname(path.resolve(root, targetFile));
  const detectedCoursier = coursierPluginInProject(targetFilePath);
  let useCoursier = detectedCoursier;

  const sbtArgs = buildArgs(options.args, useCoursier);

  return subProcess.execute('sbt', sbtArgs, {cwd: targetFilePath})
    .catch(function (error) {
      if (detectedCoursier) {
        // if we've tried coursier already, we'll fallback to dependency-graph
        // in case we've failed to parse the files correctly #paranoid
        useCoursier = false;
        const sbtArgs = buildArgs(options.args, useCoursier);
        return subProcess.execute('sbt', sbtArgs, {cwd: targetFilePath});
      }
      // otherwise cascade the reject
      return new Promise((resolve, reject) => {
        reject(error);
      });
    })
    .then(function (result) {
      const packageName = path.basename(root);
      const packageVersion = '0.0.0';
      const depTree = parser
        .parse(result, packageName, packageVersion, useCoursier);
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
      const dgArgs = '`sbt '+ buildArgs(options.args, false).join(' ') + '`';
      const csArgs = '`sbt ' + buildArgs(options.args, true).join(' ') + '`';
      error.message = error.message + '\n\n' +
        'Please make sure that the `sbt-dependency-graph` plugin ' +
        '(https://github.com/jrudolph/sbt-dependency-graph) is installed ' +
        'globally or on the current project, and that ' +
        dgArgs + ' executes successfully on this project.\n\n' +
        'Alternatively you can use `sbt-coursier` for dependency resolution ' +
        '(https://get-coursier.io/docs/sbt-coursier), in which case ensure ' +
        'that the plugin is installed on the current project and that ' +
        csArgs + ' executes successfully on this project.\n\n' +
        'For this project we guessed that you are using ' +
        (detectedCoursier ? 'sbt-coursier' : 'sbt-dependency-graph') + '.\n\n' +
        'If the problem persists, collect the output of ' +
        dgArgs + ' or ' + csArgs + ' and contact support@snyk.io\n';
      throw error;
    });
}

// guess whether we have the couriser plugin by looking for sbt-coursier
// in project and project/project
function coursierPluginInProject(basePath) {
  const sbtFileList = sbtFiles(path.join(basePath, 'project'))
    .concat(sbtFiles(path.join(basePath, 'project', 'project')));
  const searchResults = sbtFileList.map ( function (file) {
    return searchWithFs(file);
  });
  return searchResults.includes(true);
}

// provide a list of .sbt files in the specified directory
function sbtFiles(basePath) {
  if (fs.existsSync(basePath) && fs.lstatSync(basePath).isDirectory()) {
    return fs.readdirSync(basePath).filter(function (fileName) {
      return path.extname(fileName) === '.sbt';
    }).map(function (file) {
      return path.join(basePath, file);
    });
  }
  return [];
}

function searchWithFs( filename ) {
  const buffer = fs.readFileSync(filename);
  return buffer.indexOf('sbt-coursier') > -1;
}

function buildArgs(sbtArgs, isCoursierProject) {
  // force plain output so we don't have to parse colour codes
  let args = ['-Dsbt.log.noformat=true'];
  if (sbtArgs) {
    args = args.concat(sbtArgs);
  }
  if (isCoursierProject) {
    args.push('coursierDependencyTree');
  } else {
    args.push('dependencyTree');
  }
  return args;
}
