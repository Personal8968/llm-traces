import { AppPlugin } from '@grafana/data';

import { TraceExplorer } from './src/pages/TraceExplorer';

import pluginJson from './plugin.json';

export { pluginJson };

export const plugin = new AppPlugin<{}>().setRootPage(TraceExplorer);
