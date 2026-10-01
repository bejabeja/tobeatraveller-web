import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

let mockMe = { id: "user-1", name: "Ana", email: "ana@example.com" };
let mockAuthUser = { id: "user-1" };

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => jest.fn(),
}));
jest.mock("../../store/auth/authSelectors", () => ({ selectAuthUser: () => mockAuthUser }));
jest.mock("../../store/user/userInfoSelectors", () => ({ selectMe: () => mockMe, selectMeLoading: () => false }));
jest.mock("../../store/user/userInfoActions", () => ({ setUserInfo: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { resolvedLanguage: "es" } }),
}));
jest.mock("../../hooks/usePageMeta", () => ({ usePageMeta: jest.fn() }));
jest.mock("@tobeatraveller/shared", () => ({
  ...jest.requireActual("@tobeatraveller/shared"),
  sendContact: jest.fn(),
}));

import { sendContact } from "@tobeatraveller/shared";
import Contact from "./Contact";

const LONG_ENOUGH_MESSAGE = "Me cobraron dos veces";

const renderPage = () => render(<MemoryRouter><Contact /></MemoryRouter>);

const fillAndSubmit = async (user, { reason = "contact.reasonPayment" } = {}) => {
  if (reason) await user.click(screen.getByLabelText(reason));
  await user.type(screen.getByLabelText("contact.subject"), "Cobro doble");
  await user.type(screen.getByLabelText("contact.message"), LONG_ENOUGH_MESSAGE);
  await user.click(screen.getByRole("button", { name: "contact.send" }));
};

describe("Contact", () => {
  beforeEach(() => {
    mockMe = { id: "user-1", name: "Ana", email: "ana@example.com" };
    mockAuthUser = { id: "user-1" };
    sendContact.mockReset().mockResolvedValue({ message: "Message sent" });
    window.scrollTo = jest.fn();
  });

  it("starts with the name and the email of the person who is signed in", () => {
    renderPage();

    expect(screen.getByLabelText("contact.yourName")).toHaveValue("Ana");
    expect(screen.getByLabelText("contact.yourEmail")).toHaveValue("ana@example.com");
  });

  it("offers writing by email from the start, not only after a failure", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /tobeatravellercompany@gmail.com/ })).toHaveAttribute(
      "href",
      "mailto:tobeatravellercompany@gmail.com",
    );
  });

  it("sends what it is about, with the message and the language of the app", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user);

    await waitFor(() => expect(sendContact).toHaveBeenCalledTimes(1));
    expect(sendContact).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@example.com",
      reason: "payment",
      subject: "Cobro doble",
      message: LONG_ENOUGH_MESSAGE,
      language: "es",
    });
    expect(await screen.findByText("contact.sent")).toBeInTheDocument();
  });

  it("asks to pick what it is about before sending", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user, { reason: null });

    expect(await screen.findByText("validation.reasonRequired")).toBeInTheDocument();
    expect(sendContact).not.toHaveBeenCalled();
  });

  it("clears the reminder to pick one as soon as one is picked", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillAndSubmit(user, { reason: null });

    await user.click(screen.getByLabelText("contact.reasonBug"));

    expect(screen.queryByText("validation.reasonRequired")).not.toBeInTheDocument();
  });

  it("counts the characters of the message against the limit", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("0 / 1000")).toBeInTheDocument();

    await user.type(screen.getByLabelText("contact.message"), "hola!");

    expect(screen.getByText("5 / 1000")).toBeInTheDocument();
  });

  it("ties each error to its field, so it is announced with it", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "contact.send" }));

    const subject = screen.getByLabelText("contact.subject");
    expect(subject).toHaveAttribute("aria-invalid", "true");
    const errorId = subject.getAttribute("aria-describedby");
    expect(document.getElementById(errorId)).toHaveTextContent("validation.subjectMin");
  });

  // Regression: the limit answers 429, and telling someone "something went wrong, try again"
  // makes them keep retrying into it.
  it("says they sent too many messages, not that something went wrong, when the limit is reached", async () => {
    sendContact.mockRejectedValue(Object.assign(new Error("Too many contact messages"), { status: 429 }));
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user);

    expect(await screen.findByText(/contact.rateLimited/)).toBeInTheDocument();
    expect(screen.queryByText(/contact.errorMsg/)).not.toBeInTheDocument();
  });

  it("says something went wrong, and keeps what was written, when the send fails", async () => {
    sendContact.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user);

    expect(await screen.findByText(/contact.errorMsg/)).toBeInTheDocument();
    expect(screen.getByLabelText("contact.subject")).toHaveValue("Cobro doble");
  });
});
