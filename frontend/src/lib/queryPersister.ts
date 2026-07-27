import { get, set, del } from 'idb-keyval'
import type { PersistedClient } from '@tanstack/react-query-persist-client'

export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQueryCache') {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, client)
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbValidKey)
    },
    removeClient: async () => {
      await del(idbValidKey)
    },
  }
}
