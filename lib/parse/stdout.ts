const START = 'Snyk Output Start';
const END = 'Snyk Output End';

export function parseStdout(stdout: string): object | null {
  const substr = stdout.substring(
    stdout.indexOf(START) + START.length,
    stdout.indexOf(END),
  );
  try {
    return JSON.parse(substr);
  } catch (err) {
    console.error(err);
    return null;
  }
}
