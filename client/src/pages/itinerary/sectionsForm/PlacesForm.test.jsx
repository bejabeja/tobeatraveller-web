import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.day ? `${key}:${vars.day}` : key) }),
}));
jest.mock("../../../components/form/AutocompletePlaceInput", () => ({ name }) => <input aria-label={name} />);
jest.mock("../../../components/aiGenerationUpsell/AiGenerationUpsell", () => () => null);
jest.mock("../../../components/modal/Modal", () => () => null);
jest.mock("../../../utils/analytics", () => ({ trackEvent: jest.fn() }));
jest.mock("../../../services/itineraries", () => ({ generateSmartItinerary: jest.fn(), GENERATE_TIMEOUT_MESSAGE: "timeout" }));

import PlacesForm from "./PlacesForm";

const place = (name, dayNumber) => ({ description: "", category: "other", dayNumber, infoPlace: { name, label: name } });

const LONG_TRIP = [
  place("Sagrada Família", 1), place("Casa Batlló", 1),
  place("Park Güell", 2), place("Montjuïc", 2), place("Born", 2), place("Barceloneta", 2),
  place("Tibidabo", 3),
];

// Like the edit page: the form mounts empty, and once the trip loads its
// places arrive first and its days a render later.
const TripForm = ({ places, days, errors = {} }) => {
  const { control, reset } = useForm({ defaultValues: { places: [] } });
  const { fields, append, remove, replace, move } = useFieldArray({ control, name: "places" });
  const [tripDays, setTripDays] = useState([1]);
  useEffect(() => {
    reset({ places });
  }, []);
  useEffect(() => {
    if (fields.length > 0) setTripDays(days);
  }, [fields.length > 0]);
  return (
    <PlacesForm
      control={control} errors={errors} fields={fields}
      append={append} remove={remove} replace={replace} move={move}
      destination={{ name: "Barcelona" }} days={tripDays} setDays={setTripDays}
      isPublic={false} tripDays={tripDays.length}
    />
  );
};

// Like the edit page: the form only appears once the trip has loaded.
const LoadedTripForm = ({ places, days }) => {
  const { control } = useForm({ defaultValues: { places } });
  const { fields, append, remove, replace, move } = useFieldArray({ control, name: "places" });
  const [tripDays, setTripDays] = useState(days);
  return (
    <PlacesForm
      control={control} errors={{}} fields={fields}
      append={append} remove={remove} replace={replace} move={move}
      destination={{ name: "Barcelona" }} days={tripDays} setDays={setTripDays}
      isPublic={false} tripDays={tripDays.length}
    />
  );
};

const dayToggle = (day) => screen.getByRole("button", { name: new RegExp(`itineraryForm.dayTitle:${day}\\b`) });

describe("PlacesForm days", () => {
  it("opens a long trip with every day folded but the first, naming what each one has", () => {
    render(<TripForm places={LONG_TRIP} days={[1, 2, 3]} />);

    expect(dayToggle(1)).toHaveAttribute("aria-expanded", "true");
    expect(dayToggle(2)).toHaveAttribute("aria-expanded", "false");
    expect(dayToggle(3)).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Park Güell · Montjuïc · Born itineraryForm.dayMorePlaces")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  // Regression: the edit page shows the form once the trip has loaded, so
  // its places never "arrived" and every day stayed open.
  it("folds a long trip that is already there when the form appears", () => {
    render(<LoadedTripForm places={LONG_TRIP} days={[1, 2, 3]} />);

    expect(dayToggle(1)).toHaveAttribute("aria-expanded", "true");
    expect(dayToggle(2)).toHaveAttribute("aria-expanded", "false");
  });

  it("unfolds a day when its title is clicked", () => {
    render(<TripForm places={LONG_TRIP} days={[1, 2, 3]} />);

    fireEvent.click(dayToggle(2));

    expect(dayToggle(2)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("folds and unfolds every day at once", () => {
    render(<TripForm places={LONG_TRIP} days={[1, 2, 3]} />);

    fireEvent.click(screen.getByRole("button", { name: "itineraryForm.foldAllDays" }));
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "itineraryForm.unfoldAllDays" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(LONG_TRIP.length);
  });

  it("keeps open a day with a place still to fix", () => {
    const errors = { places: { 3: { infoPlace: { message: "validation.required" } } } };

    render(<TripForm places={LONG_TRIP} days={[1, 2, 3]} errors={errors} />);

    expect(dayToggle(2)).toHaveAttribute("aria-expanded", "true");
  });

  it("leaves a short trip open", () => {
    render(<TripForm places={[place("Sagrada Família", 1), place("Park Güell", 2)]} days={[1, 2]} />);

    expect(dayToggle(2)).toHaveAttribute("aria-expanded", "true");
  });

  // Regression: adding a place to an earlier day focused the last place of
  // the whole trip, in another day.
  it("puts the cursor on the new place, in the day it was added to", () => {
    const places = [place("Sagrada Família", 1), place("Park Güell", 2), place("Montjuïc", 2)];
    const { container } = render(<TripForm places={places} days={[1, 2]} />);

    fireEvent.click(screen.getByRole("button", { name: "itineraryForm.addPlaceToDay:1" }));

    const dayOnePlaces = within(container.querySelector("#day-places-1")).getAllByRole("textbox");
    expect(dayOnePlaces).toHaveLength(2);
    expect(dayOnePlaces[1]).toHaveFocus();
  });
});
