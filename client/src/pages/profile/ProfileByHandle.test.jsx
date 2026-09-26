import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock("../../services/users", () => ({ getUserByUsername: jest.fn() }));
jest.mock("./Profile", () => ({ __esModule: true, default: ({ id }) => <p>profile:{id}</p> }));

import { getUserByUsername } from "../../services/users";
import ProfileByHandle from "./ProfileByHandle";

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/:handle" element={<ProfileByHandle />} /></Routes>
  </MemoryRouter>
);

describe("ProfileByHandle", () => {
  beforeEach(() => jest.clearAllMocks());

  it("opens the profile of the name in the address", async () => {
    getUserByUsername.mockResolvedValue({ id: "user-1", username: "tbat" });

    renderAt("/@tbat");

    expect(await screen.findByText("profile:user-1")).toBeInTheDocument();
    expect(getUserByUsername).toHaveBeenCalledWith("tbat");
  });

  it("says so when nobody has that name", async () => {
    getUserByUsername.mockRejectedValue(new Error("User not found"));

    renderAt("/@nobody");

    expect(await screen.findByText("errors.profileNotFound")).toBeInTheDocument();
  });

  // Every unknown one-segment address reaches this route too.
  it("treats any other unknown address as a missing page, without asking the API", () => {
    renderAt("/pricing");

    expect(screen.getByText("errors.pageNotFound")).toBeInTheDocument();
    expect(getUserByUsername).not.toHaveBeenCalled();
  });
});
