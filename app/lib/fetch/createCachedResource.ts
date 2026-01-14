export type CachedResourceOptions = {
  cacheTTLms?: number;
};

export type GetOptions = {
  force?: boolean;
};

type CachedEntry<V> = {
  value: V;
  cachedAt: number;
};

export function createCachedResource<K, V>(
  keyToString: (key: K) => string,
  options: CachedResourceOptions = {}
) {
  const cache = new Map<string, CachedEntry<V>>();
  const inflight = new Map<string, Promise<V>>();
  const cacheTTLms = options.cacheTTLms ?? 0;

  const isFresh = (entry: CachedEntry<V>) => {
    if (!cacheTTLms) return true;
    return Date.now() - entry.cachedAt < cacheTTLms;
  };

  const get = (key: K, fetcher: () => Promise<V>, opts: GetOptions = {}) => {
    const cacheKey = keyToString(key);
    const cached = cache.get(cacheKey);

    if (!opts.force && cached && isFresh(cached)) {
      return Promise.resolve(cached.value);
    }

    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    const request = fetcher()
      .then((value) => {
        cache.set(cacheKey, { value, cachedAt: Date.now() });
        return value;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });

    inflight.set(cacheKey, request);
    return request;
  };

  const clear = (key?: K) => {
    if (typeof key === "undefined") {
      cache.clear();
      inflight.clear();
      return;
    }

    const cacheKey = keyToString(key);
    cache.delete(cacheKey);
    inflight.delete(cacheKey);
  };

  const prime = (key: K, value: V) => {
    cache.set(keyToString(key), { value, cachedAt: Date.now() });
  };

  return { get, clear, prime };
}
