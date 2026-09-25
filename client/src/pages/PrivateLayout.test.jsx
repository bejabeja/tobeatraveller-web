import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PrivateLayout from "./PrivateLayout.jsx";

let mockAuth = { isAuthenticated: false, isAuthChecked: false };
jest.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: mockAuth }),
}));

const LoginPage = () => {
  const location = useLocation();
  return <p>login page, back to {location.state?.redirectTo ?? "-"}</p>;
};

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateLayout />}>
        <Route path="/recap" element={<p>recap page</p>} />
      </Route>
    </Routes>
  </MemoryRouter>
);

describe("PrivateLayout", () => {
  // Opening or reloading a private page: the stored session is still being
  // checked, and a signed-in user must not be sent to log in meanwhile.
  it("waits while the session is being checked", () => {
    mockAuth = { isAuthenticated: false, isAuthChecked: false };

    renderAt("/recap?from=notification");

    expect(screen.queryByText(/login page/)).not.toBeInTheDocument();
    expect(screen.queryByText("recap page")).not.toBeInTheDocument();
  });

  it("shows the page once the session is confirmed", () => {
    mockAuth = { isAuthenticated: true, isAuthChecked: true };

    renderAt("/recap");

    expect(screen.getByText("recap page")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to log in, to come back to the page afterwards", () => {
    mockAuth = { isAuthenticated: false, isAuthChecked: true };

    renderAt("/recap?from=notification");

    expect(screen.getByText("login page, back to /recap?from=notification")).toBeInTheDocument();
  });
});
