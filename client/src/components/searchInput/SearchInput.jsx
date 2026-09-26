import { IoSearchOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import "./SearchInput.scss";

const SearchInput = ({ value, onChange, placeholder, label, name }) => {
  const { t } = useTranslation();

  return (
    <div className="search-input">
      <IoSearchOutline className="search-input__icon" aria-hidden="true" />
      <input
        type="search"
        className="search-input__field"
        name={name}
        value={value}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button type="button" className="search-input__clear" onClick={() => onChange("")} aria-label={t("explore.clearSearch")}>
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchInput;
