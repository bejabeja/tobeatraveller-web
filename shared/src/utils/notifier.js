let _notifier = {
  promise: (p, _opts) => p,
  success: (_msg) => {},
  error: (_msg) => {},
};

export const setNotifier = (notifier) => {
  _notifier = notifier;
};

export const getNotifier = () => _notifier;
