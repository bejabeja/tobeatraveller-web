import { fireEvent, render, screen } from "@testing-library/react";
import CountryPickerDialog from "./CountryPickerDialog.jsx";

const mockT = (key, vars) => (vars?.count != null ? `${key}:${vars.count}` : key);
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: "es" } }),
}));

const renderPicker = (props = {}) => render(
  <CountryPickerDialog
    isOpen
    onClose={jest.fn()}
    renderActions={(selected) => <span>selected:{selected.join(",")}</span>}
    {...props}
  />
);

describe("CountryPickerDialog", () => {
  it("finds a country by its name in the viewer language, ignoring accents", () => {
    renderPicker();

    fireEvent.change(screen.getByLabelText("passport.pickerSearch"), { target: { value: "japon" } });

    expect(screen.getByLabelText(/Japón/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Francia/)).not.toBeInTheDocument();
  });

  it("marks and unmarks countries, reporting the selection", () => {
    const onChange = jest.fn();
    renderPicker({ initialSelected: ["PT"], onChange });

    fireEvent.click(screen.getByLabelText(/Japón/));

    expect(onChange).toHaveBeenLastCalledWith(["PT", "JP"]);
    expect(screen.getByText("selected:PT,JP")).toBeInTheDocument();
    expect(screen.getByText("passport.pickerSelected:2")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Portugal/));
    expect(onChange).toHaveBeenLastCalledWith(["JP"]);
  });

  // Earned through activity: not something to add or remove by hand.
  it("shows countries already earned as marked and locked, counted but not selectable", () => {
    renderPicker({ lockedCodes: ["ES"] });

    const spain = screen.getByLabelText(/España/);
    expect(spain).toBeChecked();
    expect(spain).toBeDisabled();
    expect(screen.getByText("passport.pickerSelected:1")).toBeInTheDocument();
    expect(screen.getByText("selected:")).toBeInTheDocument();
  });

  it("says so when no country matches the search", () => {
    renderPicker();

    fireEvent.change(screen.getByLabelText("passport.pickerSearch"), { target: { value: "zzzz" } });

    expect(screen.getByText("passport.pickerNoResults")).toBeInTheDocument();
  });
});
