import { debounce } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { useGeocodeSearch } from "../../hooks/useGeocodeSearch";
import "./InputForm.scss";

const AutocompletePlaceInput = ({
  label,
  name,
  control,
  error,
  disabled = false,
  destination,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { searchPOIs } = useGeocodeSearch();
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
            <div className="input__error">
              {error?.label
                ? "Please select a valid place from the list"
                : error?.message || "\u00A0"}
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
          </>
        )}
      />
    </div>
  );
};

export default AutocompletePlaceInput;
