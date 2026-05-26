export const parseError = async (response, defaultMsg = "Something went wrong") => {
  let msg = defaultMsg;
  try {

    const data = await response.json();
    msg = data?.error || msg;
  } catch (_) { }
  throw new Error(msg);
  // return msg;
}