// Node.js ESM loader hooks for running unit tests against Grafana plugin code.
// - Maps @grafana/runtime to a lightweight stub (avoids CSS/browser deps)
// - Silences .css / .scss / .less imports
// Usage: node --import ./tests/node-loader.mjs --experimental-strip-types <test-file>

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const grafanaMockUrl = new URL('./grafana-mock.mjs', import.meta.url).href;

register(
  `data:text/javascript,
  const GRAFANA_MOCK = ${JSON.stringify(grafanaMockUrl)};
  export function resolve(specifier, ctx, nextResolve) {
    if (specifier === '@grafana/runtime' ||
        specifier === '@grafana/data' ||
        specifier === '@grafana/ui') {
      return { shortCircuit: true, url: GRAFANA_MOCK };
    }
    return nextResolve(specifier, ctx);
  }
  export function load(url, ctx, next) {
    if (url.endsWith('.css') || url.endsWith('.scss') || url.endsWith('.less')) {
      return { format: 'module', shortCircuit: true, source: '' };
    }
    return next(url, ctx);
  }`,
  import.meta.url
);
