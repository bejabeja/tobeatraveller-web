import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "es" } }),
}));
jest.mock("@tobeatraveller/shared", () => ({ formatDate: () => "" }));
jest.mock("./InternalAuditLog", () => ({ describeEntry: (entry) => entry.action }));
jest.mock("../../services/itineraries", () => ({ getItinerariesByUserId: jest.fn() }));
jest.mock("../../services/auditLog", () => ({ getRecentAuditLog: jest.fn() }));

import { getItinerariesByUserId } from "../../services/itineraries";
import { getRecentAuditLog } from "../../services/auditLog";
import UserDetailModal from "./UserDetailModal";

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

const renderModal = (user, onClose = jest.fn()) =>
  render(<MemoryRouter><UserDetailModal user={user} onClose={onClose} /></MemoryRouter>);

// Regression: switching from a slow-loading user A to user B before A's
// itineraries/history request resolved used to let A's response land after
// B's, overwriting B's already-displayed data with A's under B's own title.
it("ignores a stale response from a previously opened user", async () => {
  const forJane = { itineraries: deferred(), history: deferred() };
  const forJohn = { itineraries: deferred(), history: deferred() };

  getItinerariesByUserId.mockImplementation((id) =>
    (id === "jane-1" ? forJane.itineraries.promise : forJohn.itineraries.promise));
  getRecentAuditLog.mockImplementation(({ targetUserId }) =>
    (targetUserId === "jane-1" ? forJane.history.promise : forJohn.history.promise));

  const { rerender } = renderModal({ id: "jane-1", username: "jane" });

  rerender(
    <MemoryRouter>
      <UserDetailModal user={{ id: "john-1", username: "john" }} onClose={jest.fn()} />
    </MemoryRouter>
  );

  // John's (the currently open user) requests resolve first...
  forJohn.itineraries.resolve([{ id: "t1", title: "John's trip" }]);
  forJohn.history.resolve({ entries: [] });
  await screen.findByText("John's trip");

  // ...then Jane's stale ones resolve after, and must not overwrite the modal.
  forJane.itineraries.resolve([{ id: "t2", title: "Jane's trip" }]);
  forJane.history.resolve({ entries: [] });

  expect(await screen.findByText("John's trip")).toBeInTheDocument();
  // Give the stale .then() a chance to run before asserting it had no effect.
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByText("Jane's trip")).not.toBeInTheDocument();
});
