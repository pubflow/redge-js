import { useCallback, useEffect, useMemo, useState } from "react";
import type { RedgeClient } from "./client";
import type { CollectionClient } from "./collection";
import type {
  DocumentEnvelope,
  QueryOptions,
  QueryResult,
  SubscriptionEvent
} from "./types";

export interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload(): Promise<void>;
}

export interface SubscriptionState<TDoc> {
  events: Array<SubscriptionEvent<TDoc>>;
  latest: SubscriptionEvent<TDoc> | null;
  error: unknown;
  connected: boolean;
}

export function createRedgeReact(client: RedgeClient) {
  return {
    useDocument<TDoc extends object>(collection: string, id: string | null) {
      const collectionClient = useMemo(
        () => client.collection<TDoc>(collection),
        [collection]
      );
      return useDocument(collectionClient, id);
    },
    useCollectionQuery<TDoc extends object>(
      collection: string,
      options: QueryOptions = {}
    ) {
      const collectionClient = useMemo(
        () => client.collection<TDoc>(collection),
        [collection]
      );
      return useCollectionQuery(collectionClient, options);
    },
    useSubscription<TDoc extends object>(collection: string) {
      const collectionClient = useMemo(
        () => client.collection<TDoc>(collection),
        [collection]
      );
      return useSubscription(collectionClient);
    }
  };
}

export function useDocument<TDoc extends object>(
  collection: CollectionClient<TDoc>,
  id: string | null
): AsyncState<DocumentEnvelope<TDoc>> {
  const [data, setData] = useState<DocumentEnvelope<TDoc> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(id));

  const reload = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await collection.get(id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [collection, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function useCollectionQuery<TDoc extends object>(
  collection: CollectionClient<TDoc>,
  options: QueryOptions = {}
): AsyncState<QueryResult<TDoc>> {
  const stableOptions = useMemo(() => JSON.stringify(options), [options]);
  const [data, setData] = useState<QueryResult<TDoc> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await collection.find(JSON.parse(stableOptions) as QueryOptions));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [collection, stableOptions]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function useSubscription<TDoc extends object>(
  collection: CollectionClient<TDoc>
): SubscriptionState<TDoc> {
  const [events, setEvents] = useState<Array<SubscriptionEvent<TDoc>>>([]);
  const [latest, setLatest] = useState<SubscriptionEvent<TDoc> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    let cleanup: (() => Promise<void>) | undefined;
    collection
      .subscribe((event) => {
        if (!active) {
          return;
        }
        setLatest(event);
        setEvents((current) => [...current, event]);
      })
      .then((subscription) => {
        if (!active) {
          void subscription.unsubscribe();
          return;
        }
        setConnected(true);
        cleanup = () => subscription.unsubscribe();
      })
      .catch((err) => {
        if (active) {
          setError(err);
          setConnected(false);
        }
      });
    return () => {
      active = false;
      setConnected(false);
      if (cleanup) {
        void cleanup();
      }
    };
  }, [collection]);

  return { events, latest, error, connected };
}
