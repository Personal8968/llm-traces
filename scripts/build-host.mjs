#!/usr/bin/env node
// Build the plugin on the host using the Grafana monorepo's webpack + plugin-configs.
// Run with: node scripts/build-host.mjs [--watch]
// Requires the grafana monorepo at ../grafana (or GRAFANA_ROOT env var).

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const grafanaRoot = process.env.GRAFANA_ROOT || path.resolve(projectRoot, '../grafana');
const isWatch = process.argv.includes('--watch');

// Use the monorepo's webpack binary and config package
const require = createRequire(import.meta.url);
const webpack = require(path.join(grafanaRoot, 'node_modules/webpack/lib/index.js'));

const { default: grafanaConfig } = await import(
  path.join(grafanaRoot, 'packages/grafana-plugin-configs/webpack.config.ts')
);

// grafanaConfig is an async function(env, argv) — pass production/development env
const env = isWatch ? 'development' : 'production';
const rawConfig = typeof grafanaConfig === 'function'
  ? await grafanaConfig({ [env]: true }, { mode: env })
  : grafanaConfig;

// Override context, output, and loader resolution to use the monorepo node_modules
const config = {
  ...rawConfig,
  context: projectRoot,
  output: {
    ...rawConfig.output,
    path: path.join(projectRoot, 'dist'),
  },
  mode: env,
  resolveLoader: {
    ...rawConfig.resolveLoader,
    modules: [
      path.join(grafanaRoot, 'node_modules'),
      'node_modules',
    ],
  },
  resolve: {
    ...rawConfig.resolve,
    modules: [
      path.join(grafanaRoot, 'node_modules'),
      'node_modules',
    ],
  },
};

if (isWatch) {
  console.log('Starting webpack watch...');
  const compiler = webpack(config);
  compiler.watch({}, (err, stats) => {
    if (err) { console.error(err); return; }
    console.log(stats.toString({ colors: true, chunks: false }));
  });
} else {
  console.log('Building plugin...');
  webpack(config, (err, stats) => {
    if (err) { console.error(err); process.exit(1); }
    const info = stats.toJson();
    if (stats.hasErrors()) { console.error(info.errors); process.exit(1); }
    console.log(stats.toString({ colors: true, chunks: false }));
    console.log('\nBuild complete.');
  });
}
