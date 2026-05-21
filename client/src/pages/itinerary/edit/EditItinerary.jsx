import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import Modal from "../../../components/modal/Modal";
import { getItineraryById, updateItinerary } from "../../../services/itinerary";
import {
  loadMyUserInfo,
  setUserInfo,
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

const EditItinerary = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { id } = useParams();
  const userMe = useSelector(selectMe);

  const [itineraryData, setItineraryData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const isMyItinerary = () => {
    if (!userMe || !itineraryData) return false;
    return userMe.id === itineraryData.userId;
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isLoading },
    watch,
    setValue,
    trigger,
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
      isPublic: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "places",
  });

  useEffect(() => {
    const fetchItineraryData = async () => {
      const response = await getItineraryById(id);
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
        budget: response.budget?.toString(),
        currency: response.currency,
        numberOfTravellers: response.numberOfPeople.toString(),
        category: response.category,
        isPublic: response.isPublic ?? true,
        places: response.places.map((place) => ({
          id: place.id,
          description: place.description,
          category: place.category,
          infoPlace: {
            name: place.name,
            label: place.label,
            coordinates: {
              lat: Number(place.latitude),
              lon: Number(place.longitude),
            },
          },
        })),
      };
      reset(resetValues);
      setItineraryData(response);
    };
    fetchItineraryData();
  }, []);

  const editItinerary = async (data) => {
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
        id: place.id,
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

    await updateItinerary(id, formData);
    dispatch(setUserInfo(userMe.id));
    dispatch(loadMyUserInfo(userMe.id));
    navigate(`/profile/${userMe.id}`);
  };

  return (
    <section className="create-itinerary section__container">
      <h1 className="form__title">Edit Itinerary</h1>

      <form className="form__container">
        <ImageUpload
          onUpload={(file) => setImageFile(file)}
          imageUrl={watch("imageUrl")}
        />

        <BasicInfoForm control={control} errors={errors} disabled={true} />
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
        {isMyItinerary() && (
          <div className="form__cta">
            <Link
              to={`/my-itineraries`}
              type="button"
              className="btn btn__tertiary"
            >
              Cancel
            </Link>
            <button
              type="button"
              className="btn btn__primary"
              onClick={async () => {
                const isValid = await trigger();
                if (isValid) {
                  setIsModalOpen(true);
                }
              }}
            >
              Update itinerary
            </button>
          </div>
        )}
      </form>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSubmit(async (data) => {
          await editItinerary(data);
          toast.success("Itinerary updated successfully! 🎉");
          setIsModalOpen(false);
        })}
        title="Confirm Update"
        description="Are you sure you want to update this itinerary?"
        confirmText="Update"
        type="confirm"
      />
    </section>
  );
};

export default EditItinerary;
