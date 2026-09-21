import { debounce } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useGeocodeSearch } from "../../hooks/useGeocodeSearch";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import UseCurrentLocationButton from "./UseCurrentLocationButton";
import "./InputForm.scss";

const AutocompletePlaceInput = ({
  label,
  name,
  control,
  error,
  disabled = false,
  destination,
}) => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { searchPOIs, reverseGeocode } = useGeocodeSearch();
  const { getCurrentLocation, loading: locating } = useCurrentLocation();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const destinationRef = useRef(destination);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  const debouncedSearch = useRef(
    debounce(async (val) => {
      if (val.length >= 3) {
        setIsLoading(true);
        const results = await searchPOIs(val, destinationRef.current);
        setSuggestions(results);
        setIsLoading(false);
      } else {
        setSuggestions([]);
        setIsLoading(false);
      }
    }, 600)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = useCallback(
    (val, onChange) => {
      onChange({ name: val });
      debouncedSearch(val);
    },
    [debouncedSearch]
  );

  const handleSuggestionClick = useCallback((place, onChange) => {
    debouncedSearch.cancel();
    onChange(place);
    setSuggestions([]);
  }, []);

  const handleUseCurrentLocation = useCallback(async (onChange) => {
    let coords;
    try {
      coords = await getCurrentLocation();
    } catch {
      toast.error(t("common.locationPermissionDeniedToast"));
      return;
    }
    try {
      const place = await reverseGeocode(coords);
      if (place) {
        debouncedSearch.cancel();
        onChange(place);
        setSuggestions([]);
      } else {
        toast.error(t("common.locationErrorToast"));
      }
    } catch {
      toast.error(t("common.locationErrorToast"));
    }
  }, [getCurrentLocation, reverseGeocode, debouncedSearch, t]);

  const shouldShowDropdown =
    inputRef.current?.value.length >= 3 &&
    (isLoading || suggestions.length > 0);

  return (
    <div className="autocomplete-input" ref={dropdownRef}>
      <label htmlFor={name} className="input__label">
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <>
            <div className="autocomplete-input__field-wrapper">
              <input
                id={name}
                type="text"
                value={field.value?.name ?? ""}
                onChange={(e) =>
                  handleInputChange(e.target.value, field.onChange)
                }
                placeholder={!destination?.name ? "Select a destination first" : "Search for a place..."}
                className={`input__field ${error ? "input__field--invalid" : ""}`}
                autoComplete="off"
                aria-invalid={!!error}
                ref={inputRef}
                disabled={!destination?.name || disabled}
              />
              <div className="input__footer">
                <div className="input__error">
                  {error?.label
                    ? "Please select a valid place from the list"
                    : error?.message || "\u00A0"}
                </div>
              </div>

              {shouldShowDropdown && (
                <ul className="autocomplete-dropdown">
                  {isLoading ? (
                    <li className="loading">Loading...</li>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((place, index) => (
                      <li
                        key={index}
                        onClick={() =>
                          handleSuggestionClick(place, field.onChange)
                        }
                      >
                        {place.label}
                      </li>
                    ))
                  ) : (
                    <li className="no-results">No results found</li>
                  )}
                </ul>
              )}
            </div>
            <UseCurrentLocationButton
              onClick={() => handleUseCurrentLocation(field.onChange)}
              loading={locating}
              disabled={!destination?.name}
            />
          </>
        )}
      />
    </div>
  );
};

export default AutocompletePlaceInput;
