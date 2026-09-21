export const parseError = async (response, defaultMsg = "Something went wrong") => {
  let msg = defaultMsg;
  let field;
  try {
    const data = await response.json();
    msg = data?.error || msg;
    field = data?.field;
  } catch (_) { }
  const error = new Error(msg);
  error.status = response.status;
  error.field = field;
  throw error;
}

// A parseError()-thrown error with status 403 is Forbidden, but that now
// covers two distinct cases: requirePremium blocking a fully premium-gated
// feature (see api/src/middlewares/requirePremium.js), and a freemium
// feature's free-tier cap being reached (see VanLogService's `field:
// 'vanLogCap'`). The plain 403 has no `field`, so its absence is what marks
// the "whole feature needs premium" case specifically.
export const isPremiumRequiredError = (error) => error?.status === 403 && !error?.field;

export const isVanLogCapReachedError = (error) => error?.status === 403 && error?.field === 'vanLogCap';

export const isLifeDiaryCapReachedError = (error) => error?.status === 403 && error?.field === 'lifeDiaryCap';

export const isShoppingListCapReachedError = (error) => error?.status === 403 && error?.field === 'shoppingListCap';

export const isInventoryCapReachedError = (error) => error?.status === 403 && error?.field === 'inventoryCap';

// Marked by authFetch when the raw fetch() call itself rejects (no network),
// as opposed to a resolved Response with a non-2xx status. The message match
// is a fallback for call sites using plain fetch() instead of authFetch.
const NETWORK_ERROR_MESSAGE_PATTERN = /network request failed|failed to fetch/i;

export const isNetworkError = (error) =>
    error?.isNetworkError === true || NETWORK_ERROR_MESSAGE_PATTERN.test(error?.message ?? '');