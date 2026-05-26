let _storage = {
  getItem: async (_key) => null,
  setItem: async (_key, _value) => {},
  removeItem: async (_key) => {},
};

export const setTokenStorage = (storage) => {
  _storage = storage;
};

export const tokenStorage = {
  getItem: (key) => _storage.getItem(key),
  setItem: (key, value) => _storage.setItem(key, value),
  removeItem: (key) => _storage.removeItem(key),
};
