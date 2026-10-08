import { readFileSync } from "node:fs";
import { join } from "node:path";

// Regression: the page that sets a new password opened from the emailed link showed the fields unstyled
// (the eye as a grey bar under each one), because this component leaned on another one having loaded the
// stylesheet first, which only happened on the pages that also have a plain field.
it("brings the stylesheet it needs, instead of relying on another component to load it", () => {
  const source = readFileSync(join(__dirname, "PasswordInputForm.jsx"), "utf8");

  expect(source).toMatch(/import "\.\/InputForm\.scss";/);
});
