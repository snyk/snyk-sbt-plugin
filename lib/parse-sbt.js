var tabdown = require('./tabdown');

function convertStrToTree(dependenciesTextTree) {
  var lines = dependenciesTextTree.toString().split('\n') || [];
  var newLines = lines
    .map(function (line) {
      return line.replace(/\u001b\[0m/g, '');
    })
    .filter(function (line) {
      if (line.indexOf('[info] ') === 0 && line.indexOf('+-') > -1) {
        return true;
      }
      var match = line.match(/\[info\]\s[\w_\.\-]+:[\w_\.\-]+:[\w_\.\-]+/);
      if (match && match[0].length === line.length) {
        return true;
      }
      match = line.match(/\[info\]\s[\w_\.\-]+:[\w_\.\-]+:[\w_\.\-]+\s\[S\]/);
      if (match && match[0].length === line.length) {
        return true;
      }
      return false;
    })
    .map(function (line) {
      return line
        .slice(7, line.length) // slice off '[info] '
        .replace(' [S]', '')
        .replace(/\|/g, ' ')
        .replace('+-', '')
        .replace(/\s\s/g, '\t');
    });
  var tree = tabdown.parse(newLines, '\t');
  return tree;
}

function convertCoursierStrToTree(dependenciesTextTree) {
  const lines = dependenciesTextTree.toString().split('\n') || [];
  const newLines = lines
    .map(function (line) {
      return line.replace(/\u001b\[0m/g, '');
    })
    .filter(function (line) {
      if (line.match(/[│├└].*/)) {
        return true;
      }
      if (line.match(/[^\s]+\s\(configurations.*/)) {
        return true;
      }
      return false;
    })
    .map(function (line) {
      return line
        .replace(/\│/g, ' ')
        .replace('├─ ', '   ')
        .replace('└─ ', '   ')
        .replace(/\s\s\s/g, '\t');
    });
  const tree = tabdown.parse(newLines, '\t');
  return tree;
}

function walkInTree(toNode, fromNode) {
  if (fromNode.children && fromNode.children.length > 0) {
    for (var j = 0; j < fromNode.children.length; j++) {
      var externalNode = getPackageNameAndVersion(
        fromNode.children[j].data);
      if (externalNode) {
        var newNode = {
          version: externalNode.version,
          name: externalNode.name,
          dependencies: [],
        };
        toNode.dependencies.push(newNode);
        walkInTree(toNode.dependencies[toNode.dependencies.length - 1],
          fromNode.children[j],
          toNode);
      }
    }
  }
  delete toNode.parent;
}

function getPackageNameAndVersion(packageDependency) {
  var splited, version, app;
  if (packageDependency.indexOf('(evicted by:') > -1) {
    return null;
  }
  if (packageDependency.indexOf('->') > -1) {
    return null;
  }
  splited = packageDependency.split(':');
  version = splited[splited.length - 1];
  app = splited[0] + ':' + splited[1];
  app = app.split('\t').join('');
  app = app.trim();
  version = version.trim();
  return {name: app, version: version};
}

function convertDepArrayToObject(depsArr) {
  if (!depsArr) {
    return null;
  }
  return depsArr.reduce(function (acc, dep) {
    dep.dependencies = convertDepArrayToObject(dep.dependencies);
    acc[dep.name] = dep;
    return acc;
  }, {});
}

function createSnykTree(rootTree, name, version) {
  let snykTree;
  let appTree;
  if (rootTree.root.length === 1) {
    // single build configuration
    // - use parsed package name and version
    // - use single project as root
    appTree = rootTree.root[0];
    snykTree = getPackageNameAndVersion(getKeys(appTree).pop());
    snykTree.dependencies = [];
  } else {
    // multi build configuration
    // - use provided package name and version
    // - use complete tree as root
    appTree = rootTree;
    snykTree = {
      multiBuild: true, // multi build == fake broken diamond! == beware
      name: name,
      version: version,
      dependencies: [],
    };
  }
  walkInTree(snykTree, appTree);
  snykTree.dependencies = convertDepArrayToObject(snykTree.dependencies);
  return snykTree;
}

function getProjectName(root) {
  const app = root.split(' ')[0].trim();
  return {name: app};
}

function createCoursierSnykTree(rootTree, name, version) {
  let snykTree;
  if (rootTree.root.length === 1) {
    // single build configuration
    // - use parsed package name - we don't have version in output
    // - use single project as root
    const appTree = rootTree.root[0];
    snykTree = getProjectName(getKeys(appTree).pop());
    snykTree.dependencies = [];
    walkInTree(snykTree, appTree);
  } else {
    // multi build configuration
    // - use provided package name and version
    // - use complete tree as root
    const dependencies = rootTree.root.map(function(appTree){
      const subTree = getProjectName(getKeys(appTree).pop());
      subTree.dependencies = [];
      walkInTree(subTree, appTree);
      return subTree;
    });
    snykTree = {
      multiBuild: true, // multi build == fake broken diamond! == beware
      name: name,
      version: version,
      dependencies: dependencies,
    };
  }
  snykTree.dependencies = convertDepArrayToObject(snykTree.dependencies);
  return snykTree;
}

function parse(text, name, version, isCoursier) {
  if (isCoursier) {
    const coursierRootTree = convertCoursierStrToTree(text);
    return createCoursierSnykTree(coursierRootTree, name, version);
  }

  const rootTree = convertStrToTree(text);
  return createSnykTree(rootTree, name, version);
}

module.exports = {
  parse: parse,
};

function getKeys(obj) {
  var keys = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key);
    }
  }
  return keys;
}
