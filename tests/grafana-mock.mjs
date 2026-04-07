// Minimal stub for @grafana/runtime — only exports what tempoClient.ts needs.
export function getBackendSrv() {
  return {
    get: async () => ({}),
    post: async () => ({}),
  };
}
export const config = {};
export const locationService = {};
