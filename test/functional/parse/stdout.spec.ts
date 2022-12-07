import { parseStdout } from '../../../lib/parse/stdout';

describe('stdout', () => {
  it('returns null if nothing between start and end', () => {
    const input = `Snyk Output Start
Snyk Output End
`;
    const result = parseStdout(input);
    expect(result).toBeNull();
  });
  it('returns empty object', () => {
    const input = `Snyk Output Start
    {
    }
Snyk Output End
`;
    const result = parseStdout(input);
    expect(result).toEqual({});
  });
  it('returns object with root dependency', () => {
    const input = `Snyk Output Start
{
  "com.example:hello_2.12": {
    "modules": {
      "com.example:hello_2.12": {
        "version": "0.1.0-SNAPSHOT",
        "configurations": ["compile"]
      },
      "com.example:depA": {
        "version": "1.0.0-SNAPSHOT",
        "configurations": ["compile"]
      }
    },
    "dependencies": {
      "com.example:hello_2.12": [
        "com.example:depA"
      ],
      "com.example:depA": []
    }
  }
}
Snyk Output End
`;
    const result = parseStdout(input);
    expect(result).toEqual({
      'com.example:hello_2.12': {
        modules: {
          'com.example:hello_2.12': {
            version: '0.1.0-SNAPSHOT',
            configurations: ['compile'],
          },
          'com.example:depA': {
            version: '1.0.0-SNAPSHOT',
            configurations: ['compile'],
          },
        },
        dependencies: {
          'com.example:hello_2.12': ['com.example:depA'],
          'com.example:depA': [],
        },
      },
    });
  });
});
