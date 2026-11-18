// The modal dialogs open right now, the last one on top. What has to stay
// usable while one is open (the toasts) moves into the top one: the browser
// leaves everything outside it inert and behind it.
const openDialogs = [];
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

export const addOpenDialog = (dialog) => {
  openDialogs.push(dialog);
  notify();
};

export const removeOpenDialog = (dialog) => {
  const index = openDialogs.indexOf(dialog);
  if (index !== -1) openDialogs.splice(index, 1);
  notify();
};

export const subscribeToOpenDialogs = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getTopDialog = () => openDialogs[openDialogs.length - 1] ?? null;
