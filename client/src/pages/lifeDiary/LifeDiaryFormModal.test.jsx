import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/lifeDiary", () => ({ createLifeDiaryEntry: jest.fn(), updateLifeDiaryEntry: jest.fn() }));
jest.mock("../itinerary/sectionsForm/GalleryUpload", () => () => null);
jest.mock("../../components/form/AutocompleteObjectInput", () => () => null);
jest.mock("../../components/form/SubmitButton", () => () => <button type="submit">save</button>);
jest.mock("../../components/form/InputForm", () => {
  const { useController } = require("react-hook-form");
  const Field = ({ name, label, control }) => {
    const { field } = useController({ name, control });
    return <input aria-label={label} {...field} value={field.value ?? ""} />;
  };
  return { InputForm: Field, TextAreaForm: Field };
});

import LifeDiaryFormModal from "./LifeDiaryFormModal";

const renderForm = (onClose = jest.fn()) => {
  render(<MemoryRouter><LifeDiaryFormModal onClose={onClose} onSaved={jest.fn()} /></MemoryRouter>);
  return onClose;
};

const clickOutside = () => fireEvent.click(document.querySelector(".life-diary-form__backdrop"));

describe("LifeDiaryFormModal: leaving", () => {
  it("closes at once, with a click outside, when nothing was written", () => {
    const onClose = renderForm();

    clickOutside();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Regression: a click outside closed the form and threw away a whole entry, photos included.
  it("asks before throwing away what was written, instead of closing", () => {
    const onClose = renderForm();
    fireEvent.change(screen.getByLabelText("lifeDiary.bestMomentLabel"), { target: { value: "Atardecer en Sagres" } });

    clickOutside();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("editProfile.discardChanges")).toBeInTheDocument();
  });

  it("asks the same with Escape, and closes once they choose to discard", () => {
    const onClose = renderForm();
    fireEvent.change(screen.getByLabelText("lifeDiary.bestMomentLabel"), { target: { value: "Atardecer en Sagres" } });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "common.discard" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("goes on with the entry when they decide to keep editing", () => {
    const onClose = renderForm();
    fireEvent.change(screen.getByLabelText("lifeDiary.bestMomentLabel"), { target: { value: "Atardecer en Sagres" } });
    clickOutside();

    fireEvent.click(screen.getAllByRole("button", { name: "common.cancel" }).at(-1));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText("editProfile.discardChanges")).not.toBeInTheDocument();
    expect(screen.getByLabelText("lifeDiary.bestMomentLabel")).toHaveValue("Atardecer en Sagres");
  });
});
