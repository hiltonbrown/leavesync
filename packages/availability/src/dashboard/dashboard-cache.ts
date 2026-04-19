export interface DashboardCache {
  get<TValue>(key: string): TValue | undefined;
  getOrLoad<TValue>(
    key: string,
    loader: () => Promise<TValue>
  ): Promise<TValue>;
  set<TValue>(key: string, value: TValue): void;
}

export function createDashboardCache(): DashboardCache {
  const values = new Map<string, unknown>();
  const pending = new Map<string, Promise<unknown>>();

  return {
    get<TValue>(key: string): TValue | undefined {
      return values.get(key) as TValue | undefined;
    },
    async getOrLoad<TValue>(
      key: string,
      loader: () => Promise<TValue>
    ): Promise<TValue> {
      const existing = values.get(key);
      if (existing !== undefined) {
        return existing as TValue;
      }

      const inFlight = pending.get(key);
      if (inFlight) {
        return (await inFlight) as TValue;
      }

      const loading = loader().then((loaded) => {
        values.set(key, loaded);
        pending.delete(key);
        return loaded;
      });
      pending.set(key, loading);

      return (await loading) as TValue;
    },
    set<TValue>(key: string, value: TValue): void {
      values.set(key, value);
    },
  };
}
