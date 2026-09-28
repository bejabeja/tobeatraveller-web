import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }),
}));

import ExperienceStartDate from "./ExperienceStartDate";

describe("ExperienceStartDate", () => {
  it("can be left without a date", () => {
    render(<ExperienceStartDate startDate={null} days={5} onChange={jest.fn()} />);

    expect(screen.getByLabelText("createExperience.whenLeaving")).toHaveValue("");
    expect(screen.queryByText("createExperience.notSureYet")).not.toBeInTheDocument();
  });

  it("shows when the experience runs from the day chosen and its days", () => {
    render(<ExperienceStartDate startDate="2026-10-30" days={5} onChange={jest.fn()} />);

    expect(screen.getByText(/📅/).textContent).toMatch(/30.*3/);
  });

  it("passes on the day chosen", () => {
    const onChange = jest.fn();
    render(<ExperienceStartDate startDate={null} days={5} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("createExperience.whenLeaving"), { target: { value: "2026-10-30" } });

    expect(onChange).toHaveBeenCalledWith("2026-10-30");
  });

  it("drops the date when the traveller isn't sure yet", () => {
    const onChange = jest.fn();
    render(<ExperienceStartDate startDate="2026-10-30" days={5} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "createExperience.notSureYet" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
