import * as tabdown from './tabdown';

export function parse(text: string, name: string, version: string, isCoursier?: boolean) {
  if (isCoursier) {
    const coursierRootTree = convertCoursierStrToTree(text);
    return createCoursierSnykTree(coursierRootTree, name, version);
  }

  const rootTree = convertStrToTree(text);
  return createSnykTree(rootTree, name, version);
}

function convertStrToTree(dependenciesTextTree) {
  const lines = dependenciesTextTree.toString().split('\n') || [];
  const newLines = lines
    .map((line) => {
      return line.replace(/\u001b\[0m/g, '');
    })
    .filter((line) => {
      if (line.indexOf('[info] ') === 0 && line.indexOf('+-') > -1) {
        return true;
      }
      let match = line.match(/\[info\]\s[\w_\.\-]+:[\w_\.\-]+:[\w_\.\-]+/);
      if (match && match[0].length === line.length) {
        return true;
      }
      match = line.match(/\[info\]\s[\w_\.\-]+:[\w_\.\-]+:[\w_\.\-]+\s\[S\]/);
      if (match && match[0].length === line.length) {
        return true;
      }
      return false;
    })
    .map((line) => {
      return line
        .slice(7, line.length) // slice off '[info] '
        .replace(' [S]', '')
        .replace(/\|/g, ' ')
        .replace('+-', '')
        .replace(/\s\s/g, '\t');
    });
  return tabdown.parse(newLines, '\t');
}

function convertCoursierStrToTree(dependenciesTextTree) {
  const quirkyCoursier = dependenciesTextTree.match(/│   [│├└]/);
  const lines = dependenciesTextTree.toString().split('\n') || [];
  const newLines = lines
    .map((line) => {
      return line.replace(/\u001b\[0m/g, '');
    })
    .filter((line) => {
      if (line.match(/[│├└].*/)) {
        return true;
      }
      return line.match(/^[^\s\[\]]+(:?\s\(configurations)?.*/);
    })
    .map((line) => {
      if (quirkyCoursier) {
        line = line.replace(/│   /g, '│  ');
      }
      return line
        .replace(/│/g, ' ')
        .replace(/├──? /, '   ')
        .replace(/└──? /, '   ')
        .replace(/\s\s\s/g, '\t');
    });
  return tabdown.parse(newLines, '\t');
}

function walkInTree(toNode, fromNode) {
  if (fromNode.children && fromNode.children.length > 0) {
    for (const child of fromNode.children) {
      const externalNode = getPackageNameAndVersion(
        child.data);
      if (externalNode) {
        const newNode = {
          version: externalNode.version,
          name: externalNode.name,
          dependencies: [],
        };
        toNode.dependencies.push(newNode);
        walkInTree(toNode.dependencies[toNode.dependencies.length - 1],
          child);
      }
    }
  }
  delete toNode.parent;
}

function getPackageNameAndVersion(packageDependency) {
  if (packageDependency.indexOf('(evicted by:') > -1) {
    return null;
  }
  if (packageDependency.indexOf('->') > -1) {
    return null;
  }
  const split = packageDependency.split(':');
  const version = split.length > 1 ? split[split.length - 1].trim() : undefined;
  const app = `${split[0]}${split[1] ? ':' + split[1] : ''}`
    .split('\t')
    .join('')
    .trim();
  return {name: app, version};
}

function convertDepArrayToObject(depsArr) {
  if (!depsArr) {
    return null;
  }
  return depsArr.reduce((acc, dep) => {
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
      name,
      version,
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
    const dependencies = rootTree.root.map((appTree) => {
      const subTree: any = getProjectName(getKeys(appTree).pop());
      subTree.dependencies = [];
      walkInTree(subTree, appTree);
      return subTree;
    });
    snykTree = {
      multiBuild: true, // multi build == fake broken diamond! == beware
      name,
      version,
      dependencies,
    };
  }
  snykTree.dependencies = convertDepArrayToObject(snykTree.dependencies);
  return snykTree;
}

function getKeys(obj) {
  const keys = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key);
    }
  }
  return keys;
}
