import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import SubmitButton from "../../../components/form/SubmitButton";
import { createItinerary } from "../../../services/itinerary";
import {
  setUserInfo,
  setUserInfoItineraries,
} from "../../../store/user/userInfoActions";
import { selectMe } from "../../../store/user/userInfoSelectors";
import { createItinerarySchema } from "../../../utils/schemasValidation";
import BasicInfoForm from "../sectionsForm/BasicInfoForm";
import BudgetForm from "../sectionsForm/BudgetForm";
import DatesForm from "../sectionsForm/DatesForm";
import ImageUpload from "../sectionsForm/ImageUpload";
import PlacesForm from "../sectionsForm/PlacesForm";
import TravellersForm from "../sectionsForm/TravellersForm";
import VisibilityForm from "../sectionsForm/VisibilityForm";
import "./CreateItinerary.scss";

const CreateItinerary = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [imageFile, setImageFile] = useState(null);
  const [days, setDays] = useState([1]);
  const userMe = useSelector(selectMe);

  const today = new Date().toISOString().split("T")[0];
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(createItinerarySchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      destination: {
        name: "",
        label: "",
        coordinates: { lat: 0, lon: 0 },
      },
      description: "",
      startDate: today,
      endDate: today,
      places: [],
      budget: "",
      currency: "",
      numberOfTravellers: "1",
      category: "other",
      isPublic: false, // #8 — default to private
    },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const tripDays =
    startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
      : 1;

  // #3 — scroll/focus to first field with a validation error
  const onError = (errs) => {
    const firstKey = Object.keys(errs)[0];
    try {
      setFocus(firstKey);
    } catch {
      document.querySelector(`[name="${firstKey}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const { fields, append, remove, replace, move } = useFieldArray({
    control,
    name: "places",
  });

  // #6 — section completion signals
  const titleVal = watch("title");
  const destVal = watch("destination");
  const budgetVal = watch("budget");
  const currencyVal = watch("currency");

  const isBasicInfoComplete = (titleVal?.length ?? 0) >= 2 && !!destVal?.name;
  const isDatesComplete = !!(startDate && endDate);
  const isPlacesComplete = fields.length > 0 && fields.every((f) => !!f.infoPlace?.name);
  const isBudgetComplete = !!(parseFloat(budgetVal) > 0 && currencyVal);

  const addItinerary = async (data) => {
    if (data.isPublic) {
      const emptyDays = days.filter(
        (d) => !data.places.some((p) => (p.dayNumber ?? 1) === d)
      );
      if (emptyDays.length > 0) {
        toast.error(
          `Day ${emptyDays.join(", ")} ${emptyDays.length === 1 ? "has" : "have"} no places. Add places or switch to private.`
        );
        return;
      }
    }

    const body = {
      userId: userMe.id,
      title: data.title,
      description: data.description,
      location: {
        name: data.destination.name,
        label: data.destination.label,
        lat: data.destination.coordinates.lat,
        lon: data.destination.coordinates.lon,
      },
      startDate: data.startDate,
      endDate: data.endDate,
      budget: Number(data.budget),
      currency: data.currency,
      numberOfPeople: Number(data.numberOfTravellers),
      places: data.places.map((place, index) => ({
        description: place.description,
        category: place.category || "other",
        orderIndex: index,
        dayNumber: place.dayNumber ?? 1,
        infoPlace: {
          name: place.infoPlace.name,
          label: place.infoPlace.label ?? place.infoPlace.name,
          lat: place.infoPlace.coordinates?.lat ?? 0,
          lon: place.infoPlace.coordinates?.lon ?? 0,
        },
      })),
      category: data.category,
      isPublic: data.isPublic,
    };

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("itinerary", JSON.stringify(body));

    try {
      await toast.promise(createItinerary(formData), {
        loading: "Saving itinerary...",
        success: <b>Itinerary created successfully! 🎉</b>,
        error: <b>Failed to create itinerary. Please try again.</b>,
      });

      dispatch(setUserInfo(userMe.id));
      dispatch(setUserInfoItineraries(userMe.id));
      navigate(`/profile/${userMe.id}`);
    } catch (error) {}
  };

  return (
    <section className="create-itinerary section__container">
      <h1 className="form__title">Create Itinerary</h1>

      <form className="form__container" onSubmit={handleSubmit(addItinerary, onError)}>
        <BasicInfoForm control={control} errors={errors} isComplete={isBasicInfoComplete} />
        <DatesForm
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          isComplete={isDatesComplete}
        />
        <ImageUpload
          onUpload={(file) => setImageFile(file)}
          isComplete={!!imageFile}
        />
        <PlacesForm
          control={control}
          errors={errors}
          fields={fields}
          append={append}
          remove={remove}
          replace={replace}
          move={move}
          destination={watch("destination")}
          days={days}
          setDays={setDays}
          isPublic={watch("isPublic")}
          tripDays={tripDays}
          isComplete={isPlacesComplete}
        />
        <BudgetForm control={control} errors={errors} isComplete={isBudgetComplete} />
        <TravellersForm control={control} errors={errors} />
        <VisibilityForm control={control} />
        <div className="form__cta">
          <Link to="/my-itineraries" type="button" className="btn btn__tertiary">
            Cancel
          </Link>
          <SubmitButton label="Create itinerary" />
        </div>
      </form>
    </section>
  );
};

export default CreateItinerary;
