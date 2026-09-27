import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { InputForm } from "./InputForm";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => `translated:${key}` }) }));

const Field = ({ error }) => {
  const { control } = useForm({ defaultValues: { email: "" } });
  return <InputForm name="email" label="Email" control={control} error={error} />;
};

describe("InputForm errors", () => {
  // Regression: validation messages were English sentences, in every language.
  it("shows a validation message in the app's language", () => {
    render(<Field error={{ message: "validation.emailInvalid" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("translated:validation.emailInvalid");
  });

  it("shows a message from the API as it came", () => {
    render(<Field error={{ message: "Email already in use" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Email already in use");
  });
});
