import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import "../create/CreateItinerary.scss";
import Modal from "../../../components/modal/Modal";
import { getItineraryById, updateItinerary } from "../../../services/itinerary";
import {
  loadMyUserInfo,
  setUserInfo,
} from "../../../store/user/userInfoActions";
import { selectAuthUser } from "../../../store/auth/authSelectors";
import { selectMe } from "../../../store/user/userInfoSelectors";
import { createItinerarySchema, EXISTING_ITINERARY_VISIBILITY_FALLBACK } from "../../../utils/schemasValidation";
import BasicInfoForm from "../sectionsForm/BasicInfoForm";
import BudgetForm from "../sectionsForm/BudgetForm";
import DatesForm from "../sectionsForm/DatesForm";
import GalleryUpload from "../sectionsForm/GalleryUpload";
import ImageUpload from "../sectionsForm/ImageUpload";
import PlacesForm from "../sectionsForm/PlacesForm";
import TravellersForm from "../sectionsForm/TravellersForm";
import VisibilityForm from "../sectionsForm/VisibilityForm";

const EditItinerary = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { id } = useParams();
  const userMe = useSelector(selectMe);
  const authUser = useSelector(selectAuthUser);
  // Your trips live in your profile.
  const myTripsPath = `/profile/${authUser?.id}`;

  const [itineraryData, setItineraryData] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [initialGalleryImageIds, setInitialGalleryImageIds] = useState([]);
  const [days, setDays] = useState([1]);

  const isMyItinerary = () => {
    if (!userMe || !itineraryData) return false;
    return userMe.id === itineraryData.userId;
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
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
        coordinates: {
          lat: 0,
          lon: 0,
        },
      },
      description: "",
      startDate: "",
      endDate: "",
      places: [],
      budget: "",
      currency: "",
      numberOfTravellers: "",
      category: "",
      isPublic: EXISTING_ITINERARY_VISIBILITY_FALLBACK,
      byVan: false,
    },
  });

  const { fields, append, remove, replace, move } = useFieldArray({
    control,
    name: "places",
  });

  // #2: sync days/dates nudge (same as Create)
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const tripDays =
    startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
      : 1;

  useEffect(() => {
    const fetchItineraryData = async () => {
      let response;
      try {
        response = await getItineraryById(id);
      } catch {
        toast.error(t("errors.itineraryLoad"));
        navigate(myTripsPath);
        return;
      }
      const resetValues = {
        imageUrl: response.photoUrl,
        title: response.title,
        destination: {
          name: response.location.name,
          label: response.location.label,
          coordinates: {
            lat: Number(response.location.lat) || 0,
            lon: Number(response.location.lon) || 0,
          },
        },
        description: response.description,
        startDate: response.startDate.split("T")[0],
        endDate: response.endDate.split("T")[0],
        budget: response.budget?.toString() ?? "",
        currency: response.currency,
        numberOfTravellers: response.numberOfPeople.toString(),
        category: response.category,
        isPublic: response.isPublic ?? EXISTING_ITINERARY_VISIBILITY_FALLBACK,
        byVan: response.byVan ?? false,
        places: response.places.map((place) => ({
          id: place.id,
          description: place.description,
          category: place.category,
          dayNumber: place.dayNumber ?? 1,
          infoPlace: {
            name: place.name,
            label: place.label,
            coordinates: {
              lat: Number(place.latitude) || 0,
              lon: Number(place.longitude) || 0,
            },
          },
        })),
      };
      reset(resetValues);
      setItineraryData(response);
      setGalleryImages(response.images ?? []);
      setInitialGalleryImageIds((response.images ?? []).map((image) => image.id));
      const existingDays = response.places.length > 0
        ? [...new Set(response.places.map((p) => p.dayNumber ?? 1))].sort((a, b) => a - b)
        : [1];
      setDays(existingDays);
    };
    fetchItineraryData();
  }, [id]);

  const editItinerary = async (data) => {
    if (data.isPublic) {
      const emptyDays = days.filter(
        (d) => !data.places.some((p) => (p.dayNumber ?? 1) === d)
      );
      if (emptyDays.length > 0) {
        toast.error(
          t("createItinerary.emptyDaysDesc", { days: emptyDays.join(", "), count: emptyDays.length })
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
      budget: data.budget,
      currency: data.currency,
      numberOfPeople: Number(data.numberOfTravellers),
      places: data.places.map((place, index) => ({
        id: place.id,
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
      byVan: data.byVan,
      keepImageIds: galleryImages.filter((image) => !(image instanceof File)).map((image) => image.id),
    };

    const formData = new FormData();
    formData.append("file", imageFile);
    galleryImages.filter((image) => image instanceof File).forEach((file) => formData.append("images", file));
    formData.append("itinerary", JSON.stringify(body));

    await toast.promise(updateItinerary(id, formData), {
      loading: t("itinerary.updateItineraryBtn") + "...",
      success: t("itinerary.updatedSuccess"),
      error: t("errors.somethingWrong"),
    });
    dispatch(setUserInfo(userMe.id));
    dispatch(loadMyUserInfo(userMe.id));
    navigate(`/itinerary/${id}`);
  };

  const galleryChanged = () => {
    const keptIds = galleryImages.filter((image) => !(image instanceof File)).map((image) => image.id);
    const hasNewFiles = galleryImages.some((image) => image instanceof File);
    return hasNewFiles || keptIds.length !== initialGalleryImageIds.length;
  };

  const handleCancel = () => {
    if (isDirty || imageFile || galleryChanged()) setShowExitConfirm(true);
    else navigate(myTripsPath);
  };

  if (!itineraryData) {
    return (
      <section className="section__container">
        <p style={{ color: "var(--text-secondary-color)", padding: "2rem 0" }}>{t("common.loading")}</p>
      </section>
    );
  }

  return (
    <section className="section__container">
      <h1 className="form__title">{t("itinerary.editItinerary")}</h1>

      <form className="form__container" onSubmit={(e) => e.preventDefault()}>
        <BasicInfoForm control={control} errors={errors} disabled={true} />
        <DatesForm
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />
        <ImageUpload
          onUpload={(file) => setImageFile(file)}
          imageUrl={watch("imageUrl")}
        />
        <GalleryUpload images={galleryImages} onChange={setGalleryImages} />
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
          category={watch("category")}
          numberOfTravellers={watch("numberOfTravellers")}
          budget={watch("budget")}
          currency={watch("currency")}
        />
        <BudgetForm control={control} errors={errors} tripDays={tripDays} setValue={setValue} />
        <TravellersForm control={control} errors={errors} />
        <VisibilityForm control={control} />
        {isMyItinerary() && (
          <div className="form__cta form__cta--sticky">
            <button type="button" className="btn btn--ghost" onClick={handleCancel}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSubmit(async (data) => {
                try {
                  await editItinerary(data);
                } catch {
                  // editItinerary already told the person why.
                }
              })}
            >
              {t("itinerary.updateItineraryBtn")}
            </button>
          </div>
        )}
      </form>
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => navigate(myTripsPath)}
        title={t("editProfile.discardChanges")}
        description={t("editProfile.discardChangesDesc")}
        confirmText={t("common.discard")}
        type="danger"
      />
    </section>
  );
};

export default EditItinerary;
