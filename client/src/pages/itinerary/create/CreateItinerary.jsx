import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      isPublic: false,
    },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const tripDays =
    startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
      : 1;

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
          t("createItinerary.emptyDaysDesc", { days: emptyDays.join(", ") })
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
        loading: t("itinerary.createItinerary") + "...",
        success: <b>{t("itinerary.createItinerary")} 🎉</b>,
        error: <b>{t("errors.somethingWrong")}</b>,
      });

      dispatch(setUserInfo(userMe.id));
      dispatch(setUserInfoItineraries());
      navigate(`/profile/${userMe.id}`);
    } catch (error) {}
  };

  const sectionsDone = [isBasicInfoComplete, isDatesComplete, !!imageFile, isPlacesComplete, isBudgetComplete].filter(Boolean).length;
  const progress = Math.round((sectionsDone / 5) * 100);

  return (
    <section className="create-itinerary section__container">
      <h1 className="form__title">{t("itinerary.createItinerary")}</h1>
      {destVal?.name ? (
        <p className="form__hero-subtitle"
          dangerouslySetInnerHTML={{
            __html: t("itinerary.planningTo", { destination: destVal.label || destVal.name })
          }}
        />
      ) : (
        <p className="form__hero-subtitle">{t("itinerary.shareJourney")}</p>
      )}

      <div className="form__progress">
        <div className="form__progress-bar">
          <div className="form__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="form__progress-label">{progress}{t("itinerary.complete")}</span>
      </div>

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
          category={watch("category")}
          numberOfTravellers={watch("numberOfTravellers")}
          budget={watch("budget")}
          currency={watch("currency")}
        />
        <BudgetForm control={control} errors={errors} isComplete={isBudgetComplete} tripDays={tripDays} setValue={setValue} />
        <TravellersForm control={control} errors={errors} />
        <VisibilityForm control={control} />
        <div className="form__cta">
          <Link to="/my-itineraries" type="button" className="btn btn--ghost">
            {t("common.cancel")}
          </Link>
          <div className="form__cta-submit">
            {sectionsDone < 5 && (
              <span className="form__cta-hint">
                {(() => {
                  const missing = [
                    !isBasicInfoComplete && t("itinerary.basicInfo"),
                    !isDatesComplete && t("itinerary.dates"),
                    !imageFile && t("itinerary.coverPhoto"),
                    !isPlacesComplete && t("itinerary.placesLabel"),
                    !isBudgetComplete && t("itinerary.budgetLabel"),
                  ].filter(Boolean);
                  return t("itinerary.stillNeeded", { missing: missing.join(", ") });
                })()}
              </span>
            )}
            <SubmitButton label={t("itinerary.createItineraryBtn")} />
          </div>
        </div>
      </form>
    </section>
  );
};

export default CreateItinerary;
