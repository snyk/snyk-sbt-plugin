// Stand-in for a build tool. Reports SNYK_* names (never values) and the proxy variables in both casings.
const keys = Object.keys(process.env);
// On Windows process.env ignores case, so a lowercase name is only reported when that exact key exists.
const value = (name) => (keys.includes(name) ? process.env[name] : undefined);

process.stdout.write(
  JSON.stringify({
    snykKeys: keys.filter((key) => /^snyk_/i.test(key)),
    HTTP_PROXY: value('HTTP_PROXY'),
    http_proxy: value('http_proxy'),
    HTTPS_PROXY: value('HTTPS_PROXY'),
    https_proxy: value('https_proxy'),
    NO_PROXY: value('NO_PROXY'),
    no_proxy: value('no_proxy'),
  }),
);
