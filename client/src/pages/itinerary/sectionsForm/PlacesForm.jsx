import { useEffect, useRef, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { MdClose, MdKeyboardArrowDown, MdKeyboardArrowRight, MdKeyboardArrowUp, MdOutlineExplore } from "react-icons/md";
import { RiSparklingLine } from "react-icons/ri";
import toast from "react-hot-toast";
import { aiPaceOptions, dayPlacesPreview, daysToFold, DEFAULT_AI_PACE, isPremiumRequiredError } from "@tobeatraveller/shared";
import { getCategoryIcon } from "../../../assets/icons";
import AiGenerationUpsell from "../../../components/aiGenerationUpsell/AiGenerationUpsell";
import AutocompletePlaceInput from "../../../components/form/AutocompletePlaceInput";
import SelectMenu from "../../../components/form/SelectMenu";
import Modal from "../../../components/modal/Modal";
import { TextAreaForm } from "../../../components/form/InputForm";
import { placeCategories } from "../../../utils/constants/constants";
import { GENERATE_TIMEOUT_MESSAGE, generateSmartItinerary } from "../../../services/itineraries";
import { trackEvent } from "../../../utils/analytics";
import { ANALYTICS_EVENTS, TRIP_KINDS } from "../../../utils/analyticsEvents";

const PlacesForm = ({
  control, errors, fields, append, remove, replace, move,
  destination, days, setDays, isPublic, tripDays, isComplete,
  category, numberOfTravellers, budget, currency,
  pace: controlledPace, setPace: setControlledPace,
}) => {
  const { t } = useTranslation();
  const f = (key, vars) => t(`itineraryForm.${key}`, vars);

  const maxDay = days.length > 0 ? Math.max(...days) : 0;
  const prevIsPublic = useRef(isPublic);
  const dayJustAddedTo = useRef(null);
  const [confirmRemoveDay, setConfirmRemoveDay] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [aiPremiumRequired, setAiPremiumRequired] = useState(false);
  const [uncontrolledPace, setUncontrolledPace] = useState(DEFAULT_AI_PACE);
  const pace = controlledPace ?? uncontrolledPace;
  const setPace = setControlledPace ?? setUncontrolledPace;
  const [foldedDays, setFoldedDays] = useState(() => new Set());
  // From 0, so places already there when the form appears (the edit page
  // shows it once the trip has loaded) count as arriving at once too.
  const previousPlaceCount = useRef(0);
  const foldOnceDaysArrive = useRef(false);
  const placeValues = useWatch({ control, name: "places" }) ?? [];

  // Places and days can arrive in separate renders: the folding waits until
  // both are there.
  useEffect(() => {
    if (previousPlaceCount.current === 0 && fields.length > 0) foldOnceDaysArrive.current = true;
    previousPlaceCount.current = fields.length;
    if (!foldOnceDaysArrive.current) return;
    if (!fields.every((field) => days.includes(field.dayNumber ?? 1))) return;
    foldOnceDaysArrive.current = false;
    setFoldedDays(new Set(daysToFold(days, fields.length)));
  }, [fields, days]);

  useEffect(() => {
    if (isPublic && !prevIsPublic.current) {
      const emptyDay = days.find((d) => !fields.some((f) => (f.dayNumber ?? 1) === d));
      if (emptyDay) {
        document.getElementById(`day-section-${emptyDay}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    prevIsPublic.current = isPublic;
  }, [isPublic, days, fields]);

  useEffect(() => {
    if (dayJustAddedTo.current === null) return;
    const cards = document.querySelectorAll(`#day-places-${dayJustAddedTo.current} .form__place-card`);
    dayJustAddedTo.current = null;
    cards[cards.length - 1]?.querySelector("input")?.focus();
  }, [fields.length]);

  const handleAddPlace = (dayNumber) => {
    append({ description: "", infoPlace: {}, category: "other", dayNumber });
    dayJustAddedTo.current = dayNumber;
  };

  const handleAddDay = () => setDays((prev) => [...prev, maxDay + 1]);

  const handleRemoveDay = (dayToRemove) => {
    const remaining = fields
      .filter((f) => (f.dayNumber ?? 1) !== dayToRemove)
      .map((f) => {
        const dn = f.dayNumber ?? 1;
        return { ...f, dayNumber: dn > dayToRemove ? dn - 1 : dn };
      });
    replace(remaining);
    const shiftDays = (dayNumbers) =>
      [...dayNumbers].filter((d) => d !== dayToRemove).map((d) => (d > dayToRemove ? d - 1 : d));
    setDays(shiftDays);
    setFoldedDays((prev) => new Set(shiftDays(prev)));
    setConfirmRemoveDay(null);
  };

  const handleMoveToDay = (fieldIndex, newDay) => {
    replace(fields.map((f, i) => (i === fieldIndex ? { ...f, dayNumber: newDay } : f)));
  };

  const toggleDay = (day) => setFoldedDays((prev) => {
    const next = new Set(prev);
    if (next.has(day)) next.delete(day); else next.add(day);
    return next;
  });

  const daysWithPlaces = days.filter((day) => fields.some((field) => (field.dayNumber ?? 1) === day));
  const allFolded = daysWithPlaces.length > 0 && daysWithPlaces.every((day) => foldedDays.has(day));
  const toggleAllDays = () => setFoldedDays(allFolded ? new Set() : new Set(daysWithPlaces));

  const handleAutoGenerateDays = () => {
    setDays(Array.from({ length: tripDays }, (_, i) => i + 1));
  };

  const handleGenerateWithAI = () => {
    if (!destination?.name) return;
    if (fields.length > 0) {
      setShowRegenConfirm(true);
      return;
    }
    runGenerateWithAI();
  };

  const runGenerateWithAI = async () => {
    setShowRegenConfirm(false);
    setAiPremiumRequired(false);
    const totalDays = tripDays || days.length || 1;
    setIsGenerating(true);
    try {
      const data = await generateSmartItinerary({
        destination: destination.name, days: totalDays,
        category, numberOfTravellers, budget, currency, pace,
      });
      const generatedPlaces = data.places.map((p) => ({
        description: p.description,
        category: p.category ?? "other",
        dayNumber: p.dayNumber ?? 1,
        infoPlace: {
          name: p.title,
          label: p.label ?? p.title,
          coordinates: {
            lat: parseFloat(p.latitude ?? p.lat ?? 0),
            lon: parseFloat(p.longitude ?? p.lng ?? 0),
          },
        },
      }));
      trackEvent(ANALYTICS_EVENTS.AI_ITINERARY_GENERATED, { kind: TRIP_KINDS.ITINERARY, pace, days: totalDays });
      replace(generatedPlaces);
      const uniqueDays = [...new Set(generatedPlaces.map((p) => p.dayNumber))].sort((a, b) => a - b);
      setDays(uniqueDays);
      setFoldedDays(new Set(daysToFold(uniqueDays, generatedPlaces.length)));
      toast.success(f("generated"));
    } catch (error) {
      if (isPremiumRequiredError(error)) {
        setAiPremiumRequired(true);
      } else {
        toast.error(error.message === GENERATE_TIMEOUT_MESSAGE ? f("generateTimeout") : (error.message || f("errorGenerate")));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="form__places">
      <div className="form__subtitle-row">
        <h2 className="form__subtitle">
          {f("placesTitle")}
          {fields.length > 0 && (
            <span className="form__places-summary">
              {t("itineraryForm.placesInDay", { count: fields.length })} · {t("itineraryForm.dayCount", { count: days.length })}
            </span>
          )}
          {isComplete && <span className="form__section-check">✓</span>}
        </h2>
        <div className="form__ai-controls">
          <SelectMenu
            variant="compact"
            className="form__ai-pace-select"
            ariaLabel={f("paceLabel")}
            disabled={isGenerating}
            options={aiPaceOptions.map(({ value, labelKey, descKey }) => ({ value, label: `${f(labelKey)} – ${f(descKey)}` }))}
            value={pace}
            onChange={setPace}
          />
          <button
            type="button"
            className="btn btn--secondary btn--sm form__ai-btn"
            onClick={handleGenerateWithAI}
            disabled={isGenerating || !destination?.name}
            title={!destination?.name ? f("setDestinationFirst") : f("generateWithAIHint")}
          >
            <RiSparklingLine />
            {isGenerating ? f("generating") : f("generateWithAI")}
          </button>
        </div>
      </div>

      {aiPremiumRequired && (
        <AiGenerationUpsell onDismiss={() => setAiPremiumRequired(false)} />
      )}

      {tripDays > days.length && (
        <div className="form__days-sync-hint">
          <span>{f("tripIsDays", { tripDays, configuredDays: days.length })}</span>
          <button type="button" className="form__days-sync-btn" onClick={handleAutoGenerateDays}>
            {f("setToDays", { count: tripDays })}
          </button>
        </div>
      )}

      {fields.length === 0 && (
        <div className="form__places-empty">
          <MdOutlineExplore className="form__places-empty-icon" />
          <p className="form__places-empty-text">{f("startBuilding")}</p>
          <p className="form__places-empty-hint">{f("startBuildingHint")}</p>
        </div>
      )}

      {daysWithPlaces.length > 1 && (
        <button type="button" className="form__days-fold-all" onClick={toggleAllDays}>
          {allFolded ? f("unfoldAllDays") : f("foldAllDays")}
        </button>
      )}

      {days.map((day) => {
        const dayFields = fields
          .map((field, index) => ({ ...field, index }))
          .filter((f) => (f.dayNumber ?? 1) === day);
        // A day with a place still to fix stays open, or its error would be hidden.
        const hasErrors = dayFields.some(({ index }) => errors?.places?.[index]);
        const isFolded = foldedDays.has(day) && dayFields.length > 0 && !hasErrors;
        const dayPlacesId = `day-places-${day}`;
        const dayCount = (
          <span className="form__day-count">
            {t("itineraryForm.placesInDay", { count: dayFields.length })}
          </span>
        );
        const preview = isFolded && dayPlacesPreview(dayFields.map(({ index }) => placeValues[index]?.infoPlace?.name));

        return (
          <div key={day} id={`day-section-${day}`} className="form__day-section">
            <div className="form__day-header">
              <h3 className="form__day-title">
                {dayFields.length > 0 ? (
                  <button
                    type="button"
                    className="form__day-toggle"
                    onClick={() => toggleDay(day)}
                    aria-expanded={!isFolded}
                    aria-controls={isFolded ? undefined : dayPlacesId}
                  >
                    {isFolded ? <MdKeyboardArrowRight aria-hidden="true" /> : <MdKeyboardArrowDown aria-hidden="true" />}
                    {f("dayTitle", { day })}
                    {dayCount}
                  </button>
                ) : (
                  <>
                    {f("dayTitle", { day })}
                    {dayCount}
                  </>
                )}
              </h3>

              {days.length > 1 && (
                confirmRemoveDay === day ? (
                  <div className="form__day-confirm-remove">
                    <span>{f("removeDayWithPlaces", { day, count: dayFields.length })}</span>
                    <button type="button" className="form__day-remove-btn" onClick={() => handleRemoveDay(day)}>
                      {f("removeDayConfirm")}
                    </button>
                    <button type="button" className="form__day-confirm-cancel" onClick={() => setConfirmRemoveDay(null)}>
                      {f("removeDayCancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="form__day-remove-btn"
                    onClick={() => dayFields.length > 0 ? setConfirmRemoveDay(day) : handleRemoveDay(day)}
                  >
                    {f("removeDay")}
                  </button>
                )
              )}
            </div>

            {dayFields.length === 0 && isPublic && (
              <p className="form__day-empty-warning">{f("addPlaceWarning")}</p>
            )}
            {dayFields.length === 0 && !isPublic && (
              <p className="form__day-empty-hint">{f("noPlacesDay")}</p>
            )}

            {isFolded ? (
              <p className="form__day-preview">
                {[preview.names.join(" · "), preview.moreCount > 0 && f("dayMorePlaces", { count: preview.moreCount })]
                  .filter(Boolean).join(" ")}
              </p>
            ) : (
              <div id={dayPlacesId} className="form__day-places">
                {dayFields.map(({ id, index }, position) => (
                  <PlaceField
                    key={id}
                    index={index}
                    control={control}
                    errors={errors}
                    remove={remove}
                    destination={destination}
                    days={days}
                    currentDay={day}
                    isFirst={position === 0}
                    isLast={position === dayFields.length - 1}
                    onMoveUp={() => move(index, dayFields[position - 1].index)}
                    onMoveDown={() => move(index, dayFields[position + 1].index)}
                    onMoveToDay={(newDay) => handleMoveToDay(index, newDay)}
                  />
                ))}

                <button type="button" className="btn btn--secondary" onClick={() => handleAddPlace(day)}>
                  {f("addPlaceToDay", { day })}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {(fields.length > 0 || days.length > 1) && (
        <div className="form__cta">
          <button type="button" className="btn btn--primary" onClick={handleAddDay}>
            {f("addDay", { day: maxDay + 1 })}
          </button>
        </div>
      )}

      <Modal
        isOpen={showRegenConfirm}
        onClose={() => setShowRegenConfirm(false)}
        onConfirm={runGenerateWithAI}
        title={f("confirmRegenerateTitle")}
        description={f("confirmRegenerateDesc")}
        confirmText={f("generateWithAI")}
        type="danger"
      />
    </div>
  );
};

const PlaceField = ({
  control, index, errors, remove, destination,
  days, currentDay, isFirst, isLast, onMoveUp, onMoveDown, onMoveToDay,
}) => {
  const { t } = useTranslation();
  const f = (key, vars) => t(`itineraryForm.${key}`, vars);
  const descriptionValue = useWatch({ control, name: `places.${index}.description` });
  const [showDescription, setShowDescription] = useState(!!descriptionValue);

  return (
    <div className="form__place-card">
      <div className="form__place-card-top">
        <div className="form__place-move-btns">
          <button type="button" className="form__place-move-btn" onClick={onMoveUp} disabled={isFirst} aria-label={f("movePlaceUp")}>
            <MdKeyboardArrowUp />
          </button>
          <button type="button" className="form__place-move-btn" onClick={onMoveDown} disabled={isLast} aria-label={f("movePlaceDown")}>
            <MdKeyboardArrowDown />
          </button>
        </div>

        <div className="form__place-card-body">
          <AutocompletePlaceInput
            name={`places.${index}.infoPlace`}
            label={f("placeName")}
            control={control}
            error={errors?.places?.[index]?.infoPlace}
            destination={destination}
          />

          <PlaceCategoryForm control={control} index={index} />

          {showDescription ? (
            <TextAreaForm
              name={`places.${index}.description`}
              label={f("descriptionOptional")}
              control={control}
              error={errors?.places?.[index]?.description}
              maxLength={500}
            />
          ) : (
            <button type="button" className="form__add-description-btn" onClick={() => setShowDescription(true)}>
              {f("addDescription")}
            </button>
          )}

          {days.length > 1 && (
            <div className="form__place-move-day">
              <span className="form__place-move-day-label">{f("moveTo")}</span>
              {days.filter((d) => d !== currentDay).map((d) => (
                <button key={d} type="button" className="form__place-move-day-btn" onClick={() => onMoveToDay(d)}>
                  {f("moveToDay", { day: d })}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="form__place-delete-btn" onClick={() => remove(index)} aria-label={f("deletePlace")}>
          <MdClose />
        </button>
      </div>
    </div>
  );
};

const PlaceCategoryForm = ({ control, index }) => {
  const { t } = useTranslation();
  return (
    <div className="form__icon-group form__icon-group--compact">
      <Controller
        name={`places.${index}.category`}
        control={control}
        render={({ field }) => (
          <>
            {placeCategories.map((type) => {
              const Icon = getCategoryIcon(type.value);
              return (
                <button
                  type="button"
                  key={type.value}
                  title={t(`placeCategories.${type.value}`)}
                  aria-label={t(`placeCategories.${type.value}`)}
                  aria-pressed={field.value === type.value}
                  className={`form__icon-group-button only-icon ${field.value === type.value ? "selected" : ""}`}
                  onClick={() => field.onChange(type.value)}
                >
                  <Icon />
                </button>
              );
            })}
            <span className="form__icon-group-caption">{t(`placeCategories.${field.value}`)}</span>
          </>
        )}
      />
    </div>
  );
};

export default PlacesForm;
