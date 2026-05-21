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
  const userMe = useSelector(selectMe);

  const today = new Date().toISOString().split("T")[0];
  const {
    control,
    handleSubmit,
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
        coordinates: {
          lat: 0,
          lon: 0,
        },
      },
      description: "",
      startDate: today,
      endDate: today,
      places: [],
      budget: "0",
      currency: "",
      numberOfTravellers: "1",
      category: "other",
      isPublic: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "places",
  });

  const addItinerary = async (data) => {
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
        infoPlace: {
          name: place.infoPlace.name,
          label: place.infoPlace.label,
          lat: place.infoPlace.coordinates.lat,
          lon: place.infoPlace.coordinates.lon,
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

      <form className="form__container" onSubmit={handleSubmit(addItinerary)}>
        <ImageUpload onUpload={(file) => setImageFile(file)} />
        <BasicInfoForm control={control} errors={errors} />
        <DatesForm
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />
        <PlacesForm
          control={control}
          errors={errors}
          fields={fields}
          append={append}
          remove={remove}
          destination={watch("destination")}
        />
        <BudgetForm control={control} errors={errors} />
        <TravellersForm control={control} errors={errors} />
        <VisibilityForm control={control} />
        <div className="form__cta">
          <Link
            to={`/my-itineraries`}
            type="button"
            className="btn btn__tertiary"
          >
            Cancel
          </Link>
          <SubmitButton label="Create itinerary" />
        </div>
      </form>
    </section>
  );
};

export default CreateItinerary;
