{
  "name": "snyk-sbt-plugin",
  "description": "Snyk CLI SBT plugin",
  "homepage": "https://github.com/snyk/snyk-sbt-plugin",
  "repository": {
    "type": "git",
    "url": "https://github.com/snyk/snyk-sbt-plugin"
  },
  "files": [
    "dist",
    "scala"
  ],
  "directories": {
    "test": "test"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "lint": "tslint --project tsconfig.json --format stylish",
    "lint-fix": "tslint --project tsconfig.json --format stylish --fix",
    "prepare": "npm run build",
    "test": "npm run test-functional && npm run test-system && npm run test-jest",
    "test-jest": "jest",
    "test-functional": "tap -Rspec ./test/functional/*.test.[tj]s",
    "test-system": "tap -Rspec --timeout=1000 ./test/system/*.test.[tj]s",
    "test-system-windows": "tap -Rspec --timeout=700 ./test/system-windows/*.test.[tj]s"
  },
  "author": "snyk.io",
  "license": "Apache-2.0",
  "devDependencies": {
    "@types/jest": "^27.0.1",
    "@types/node": "6.14.6",
    "@types/sinon": "7.0.11",
    "jest": "^27.0.6",
    "jest-junit": "^12.2.0",
    "sinon": "^2.4.1",
    "tap": "12.6.1",
    "tap-only": "0.0.5",
    "ts-jest": "^27.0.5",
    "ts-node": "^10.2.1",
    "tslint": "5.16.0",
    "typescript": "^4.7.4"
  },
  "dependencies": {
    "debug": "^4.1.1",
    "semver": "^6.1.2",
    "shescape": "1.6.1",
    "tmp": "^0.1.0",
    "tree-kill": "^1.2.2",
    "tslib": "^1.10.0"
  },
  "jest-junit": {
    "outputDirectory": "./coverage"
  }
}
