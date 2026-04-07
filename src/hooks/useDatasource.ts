import { ComponentType, useEffect, useRef, useState } from 'react';
import { DataSourceApi } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';

export interface UseDatasourceResult {
  datasourceUid: string | null;
  setDatasourceUid: (uid: string) => void;
  datasourceOptions: Array<{ label: string; value: string }>;
  ds: DataSourceApi | null;
  dsRef: React.MutableRefObject<DataSourceApi | null>;
  dsLoadError: string | null;
  QueryEditorComponent: ComponentType<any> | null;
  queryEditorDirtyRef: React.MutableRefObject<boolean>;
}

export function useDatasource(urlDsUid: string | undefined): UseDatasourceResult {
  const [datasourceUid, setDatasourceUid] = useState<string | null>(null);
  const [datasourceOptions, setDatasourceOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [ds, setDs] = useState<DataSourceApi | null>(null);
  const [dsLoadError, setDsLoadError] = useState<string | null>(null);
  const [QueryEditorComponent, setQueryEditorComponent] = useState<ComponentType<any> | null>(null);
  const dsRef = useRef<DataSourceApi | null>(null);
  const queryEditorDirtyRef = useRef(false);

  // Discover all Tempo datasources on mount and set default
  useEffect(() => {
    const sources = getDataSourceSrv().getList({ filter: (d) => d.type === 'tempo' });
    const options = sources.map((s) => ({ label: s.name, value: s.uid }));
    setDatasourceOptions(options);
    if (options.length > 0) {
      const target = (urlDsUid && options.find((o) => o.value === urlDsUid))
        ? urlDsUid
        : options[0].value;
      setDatasourceUid(target);
    } else {
      setDsLoadError('No Tempo datasource found. Add a Tempo datasource in Grafana settings.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load datasource + its QueryEditor when uid changes
  useEffect(() => {
    if (!datasourceUid) { return; }
    setDs(null);
    setDsLoadError(null);
    setQueryEditorComponent(null);
    queryEditorDirtyRef.current = false;
    getDataSourceSrv().get(datasourceUid)
      .then((datasource) => {
        setDsLoadError(null);
        setDs(datasource);
        dsRef.current = datasource;
        const Editor = (datasource as any).components?.QueryEditor ?? null;
        setQueryEditorComponent(() => Editor);
      })
      .catch((err) => {
        setDsLoadError(err?.message ?? 'Tempo datasource not found. Check plugin settings.');
      });
  }, [datasourceUid]);

  return { datasourceUid, setDatasourceUid, datasourceOptions, ds, dsRef, dsLoadError, QueryEditorComponent, queryEditorDirtyRef };
}
