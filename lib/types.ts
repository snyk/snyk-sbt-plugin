export interface PluginResult {
  plugin: PluginMetadata;
  package: DepTree;
}

export interface DepDict {
  [name: string]: DepTree;
}

export interface DepRoot {
  depTree: DepTree; // to be soon replaced with depGraph
  meta?: any;
}

export interface DepTree {
  name: string;
  version: string;
  dependencies?: DepDict;
  packageFormatVersion?: string;
  multiBuild?: boolean;
}

export interface PluginMetadata {
  name: string;
  runtime: string;
  meta?: {
    versionBuildInfo?: {
      metaBuildVersion?: {
        sbtVersion?: string,
      },
    },
  };
}

interface Module {
  version: string;
  configurations: string[];
}

export interface SbtModulesGraph {
  modules: Record<string, Module>;
  dependencies: {
    string: string[];
  };
}
