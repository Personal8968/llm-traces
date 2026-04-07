import { useCallback, useRef, useState } from 'react';
import { PluginSpan, fetchTrace } from '../utils/tempoClient';

export interface UseOpenTraceResult {
  selectedTraceId: string | null;
  selectedTraceName: string | null;
  traceSpans: PluginSpan[] | null;
  traceLoading: boolean;
  traceError: string | null;
  openTrace: (traceId: string, traceName?: string) => void;
  openTraceRef: React.MutableRefObject<((id: string, name?: string) => void) | null>;
  /** Reset all trace state — call at the start of a new search to clear the detail pane */
  clearTrace: () => void;
}

export function useOpenTrace(
  datasourceUid: string | null,
  isMountedRef: React.MutableRefObject<boolean>
): UseOpenTraceResult {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTraceName, setSelectedTraceName] = useState<string | null>(null);
  const [traceSpans, setTraceSpans] = useState<PluginSpan[] | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const openTraceRequestIdRef = useRef(0);
  const openTraceRef = useRef<((id: string, name?: string) => void) | null>(null);

  const clearTrace = useCallback(() => {
    setSelectedTraceId(null);
    setSelectedTraceName(null);
    setTraceSpans(null);
    setTraceError(null);
  }, []);

  const openTrace = useCallback(async (traceId: string, traceName?: string) => {
    setSelectedTraceId(traceId);
    setSelectedTraceName(traceName || traceId);
    setTraceSpans(null);
    setTraceError(null);
    // BUG-064: guard before setTraceLoading(true) so a null datasource can't leave it stuck
    if (!datasourceUid) {
      setTraceLoading(false);
      return;
    }
    setTraceLoading(true);
    const requestId = ++openTraceRequestIdRef.current;
    try {
      const spans = await fetchTrace(datasourceUid, traceId);
      if (requestId !== openTraceRequestIdRef.current) { return; }
      if (!isMountedRef.current) { return; } // BUG-052
      setTraceSpans(spans);
    } catch (err) {
      if (requestId !== openTraceRequestIdRef.current) { return; }
      if (!isMountedRef.current) { return; } // BUG-052
      // BUG-065: handle Grafana's { data: { message } } error shape in addition to Error objects
      setTraceError((err as any)?.data?.message ?? (err as any)?.message ?? 'Failed to load trace');
    } finally {
      if (requestId === openTraceRequestIdRef.current) {
        if (isMountedRef.current) { // BUG-052
          setTraceLoading(false);
        }
      }
    }
  }, [datasourceUid, isMountedRef]);

  // Keep the ref current so runSearch can call the latest openTrace
  openTraceRef.current = openTrace;

  return { selectedTraceId, selectedTraceName, traceSpans, traceLoading, traceError, openTrace, openTraceRef, clearTrace };
}
