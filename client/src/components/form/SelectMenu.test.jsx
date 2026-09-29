import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import SelectMenu from "./SelectMenu";

const OPTIONS = [
  { value: "", label: "All trips" },
  { value: "t1", label: "Portugal" },
  { value: "t2", label: "Pyrenees" },
];

const Harness = ({ initial = "", onChange = () => {}, disabled = false }) => {
  const [value, setValue] = useState(initial);
  return (
    <SelectMenu
      options={OPTIONS}
      value={value}
      onChange={(next) => { setValue(next); onChange(next); }}
      placeholder="Trip"
      ariaLabel="Trip"
      disabled={disabled}
    />
  );
};

const field = () => screen.getByRole("combobox", { name: "Trip" });

describe("SelectMenu", () => {
  it("shows the label of the chosen option", () => {
    render(<Harness initial="t1" />);

    expect(field()).toHaveTextContent("Portugal");
  });

  it("shows the placeholder when the value matches no option", () => {
    render(<Harness initial="unknown" />);

    expect(field()).toHaveTextContent("Trip");
  });

  it("opens on click and lists every option", () => {
    render(<Harness />);

    fireEvent.click(field());

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["All trips", "Portugal", "Pyrenees"]);
    expect(field()).toHaveAttribute("aria-expanded", "true");
  });

  it("gives the chosen value to onChange, shows it and closes", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(field());
    fireEvent.click(screen.getByRole("option", { name: "Pyrenees" }));

    expect(onChange).toHaveBeenCalledWith("t2");
    expect(field()).toHaveTextContent("Pyrenees");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("does not call onChange when the option that is already chosen is picked again", () => {
    const onChange = jest.fn();
    render(<Harness initial="t1" onChange={onChange} />);

    fireEvent.click(field());
    fireEvent.click(screen.getByRole("option", { name: "Portugal" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks the chosen option as selected", () => {
    render(<Harness initial="t1" />);

    fireEvent.click(field());

    expect(screen.getByRole("option", { name: "Portugal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Pyrenees" })).toHaveAttribute("aria-selected", "false");
  });

  it("can be used with the keyboard: arrows to move, Enter to choose", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("t1");
  });

  it("closes on Escape without choosing anything", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(field());
    fireEvent.keyDown(field(), { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes when the user clicks somewhere else", () => {
    render(<Harness />);

    fireEvent.click(field());
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("does not close when the user presses inside the list, so the choice can be made", () => {
    render(<Harness />);

    fireEvent.click(field());
    fireEvent.mouseDown(screen.getByRole("option", { name: "Portugal" }));

    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("does not open when it is disabled", () => {
    render(<Harness disabled />);

    fireEvent.click(field());

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(field()).toBeDisabled();
  });

  it("closes only the menu on Escape, leaving a dialog around it open", () => {
    const closeDialog = jest.fn();
    const onKey = (event) => { if (event.key === "Escape") closeDialog(); };
    document.addEventListener("keydown", onKey);
    render(<Harness />);

    fireEvent.click(field());
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(closeDialog).not.toHaveBeenCalled();

    // With the menu already closed, Escape is the dialog's again.
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(closeDialog).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", onKey);
  });

  it("jumps to the option that starts with what is typed", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.keyDown(field(), { key: "p" });
    fireEvent.keyDown(field(), { key: "y" });
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("t2");
  });

  it("goes on to the next option with the same letter when it is typed again", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} initial="t1" />);

    fireEvent.click(field());
    jest.useFakeTimers();
    fireEvent.keyDown(field(), { key: "p" });
    fireEvent.keyDown(field(), { key: "Enter" });
    jest.useRealTimers();

    expect(onChange).toHaveBeenCalledWith("t2");
  });

  it("finds an option whose label starts with a symbol by its first letter", () => {
    const onChange = jest.fn();
    render(
      <SelectMenu options={[{ value: "a", label: "🔥 Gas" }, { value: "b", label: "⛽ Fuel" }]} value="a" onChange={onChange} ariaLabel="Category" />
    );

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "f" });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("stays open when the window is resized, as the keyboard of a phone does", () => {
    render(<Harness />);

    fireEvent.click(field());
    fireEvent(window, new Event("resize"));

    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("does not scroll the list when an option is only hovered", () => {
    const scrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<Harness />);

    fireEvent.click(field());
    const scrolledOnOpen = scrollIntoView.mock.calls.length;
    fireEvent.mouseEnter(screen.getByRole("option", { name: "Pyrenees" }));

    expect(scrollIntoView.mock.calls.length).toBe(scrolledOnOpen);
    delete window.HTMLElement.prototype.scrollIntoView;
  });

  it("does not let Space be released as a second click (Firefox)", () => {
    render(<Harness />);

    const notPrevented = fireEvent.keyUp(field(), { key: " " });

    expect(notPrevented).toBe(false);
  });

  it("hands its button to the ref of a form, so the form can focus a field that is in error", () => {
    const fieldRef = jest.fn();
    render(<SelectMenu options={OPTIONS} value="" onChange={() => {}} fieldRef={fieldRef} ariaLabel="Trip" />);

    expect(fieldRef).toHaveBeenCalledWith(field());
  });

  it("hands the same ref over once, not on every render", () => {
    const fieldRef = jest.fn();
    const { rerender } = render(<SelectMenu options={OPTIONS} value="" onChange={() => {}} fieldRef={fieldRef} ariaLabel="Trip" />);

    rerender(<SelectMenu options={OPTIONS} value="t1" onChange={() => {}} fieldRef={fieldRef} ariaLabel="Trip" />);

    expect(fieldRef).toHaveBeenCalledTimes(1);
  });
});
