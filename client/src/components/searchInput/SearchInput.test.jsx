import { fireEvent, render, screen } from "@testing-library/react";
import SearchInput from "./SearchInput";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

describe("SearchInput", () => {
  it("names the box for screen readers and passes on what is typed", () => {
    const onChange = jest.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Busca personas" label="Buscar" />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), { target: { value: "ana" } });

    expect(onChange).toHaveBeenCalledWith("ana");
  });

  it("empties the search from its clear button", () => {
    const onChange = jest.fn();
    render(<SearchInput value="ana" onChange={onChange} placeholder="Busca personas" />);

    fireEvent.click(screen.getByRole("button", { name: "explore.clearSearch" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("shows no clear button with nothing typed", () => {
    render(<SearchInput value="" onChange={jest.fn()} placeholder="Busca personas" />);

    expect(screen.queryByRole("button", { name: "explore.clearSearch" })).not.toBeInTheDocument();
  });
});
