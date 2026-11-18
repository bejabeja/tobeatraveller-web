import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join("/")}` : key), i18n: { language: "es" } }) }));
jest.mock("../../services/users", () => ({ getSignupBreakdown: jest.fn() }));
jest.mock("../../components/featureLoadState/FeatureLoadState", () => ({ onRetry }) => <button onClick={onRetry}>retry</button>);

import { getSignupBreakdown } from "../../services/users";
import InternalSignups from "./InternalSignups";

const breakdown = {
  recentDays: 30,
  countries: [{ countryCode: "CH", total: 3, recent: 1 }, { countryCode: null, total: 2, recent: 0 }],
  devices: [{ device: "mobile_web", total: 4, recent: 1 }, { device: "unknown", total: 1, recent: 0 }],
};

describe("InternalSignups", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the sign-ups by country, named in the team member's language, and by device", async () => {
    getSignupBreakdown.mockResolvedValue(breakdown);

    render(<InternalSignups />);

    const switzerland = (await screen.findByText(/Suiza/)).closest("tr");
    expect(switzerland).toHaveTextContent("31");
    expect(screen.getByText("admin.signupsUnknownCountry")).toBeInTheDocument();
    expect(screen.getByText("admin.signupDevices.mobile_web").closest("tr")).toHaveTextContent("41");
    expect(screen.getAllByText("admin.signupsRecent:30")).toHaveLength(2);
  });

  it("keeps both tables with their titles while the counts arrive", () => {
    getSignupBreakdown.mockReturnValue(new Promise(() => {}));

    render(<InternalSignups />);

    expect(screen.getByRole("status", { name: "common.loading" })).toBeInTheDocument();
    expect(screen.getByText("admin.signupsByCountry")).toBeInTheDocument();
    expect(screen.getByText("admin.signupsByDevice")).toBeInTheDocument();
  });

  it("lets the team try again when the counts could not be loaded", async () => {
    getSignupBreakdown.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(breakdown);

    render(<InternalSignups />);
    fireEvent.click(await screen.findByText("retry"));

    expect(await screen.findByText(/Suiza/)).toBeInTheDocument();
    expect(getSignupBreakdown).toHaveBeenCalledTimes(2);
  });
});
