import { fireEvent } from "@testing-library/react";

// Opens a SelectMenu and picks the option with this value. The options are
// found by value, not by text, since several can read the same in a test
// where the translations are only keys.
export const chooseOption = (field, value) => {
  fireEvent.click(field);
  fireEvent.click(document.querySelector(`[role="option"][data-value="${value}"]`));
};
