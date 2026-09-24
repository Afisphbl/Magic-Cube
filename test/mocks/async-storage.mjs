const storage = new Map();

const AsyncStorage = {
  getItem: async (key) => {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem: async (key, value) => {
    storage.set(key, String(value));
  },
  removeItem: async (key) => {
    storage.delete(key);
  },
  clear: async () => {
    storage.clear();
  },
  getAllKeys: async () => {
    return Array.from(storage.keys());
  },
  multiGet: async (keys) => {
    return keys.map((key) => [key, storage.has(key) ? storage.get(key) : null]);
  },
  multiSet: async (keyValuePairs) => {
    for (const [key, value] of keyValuePairs) {
      storage.set(key, String(value));
    }
  },
};

export default AsyncStorage;
export const getItem = AsyncStorage.getItem;
export const setItem = AsyncStorage.setItem;
export const removeItem = AsyncStorage.removeItem;
export const clear = AsyncStorage.clear;
export const getAllKeys = AsyncStorage.getAllKeys;
export const multiGet = AsyncStorage.multiGet;
export const multiSet = AsyncStorage.multiSet;
