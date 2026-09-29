import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { IoCameraOutline, IoCloseOutline } from "react-icons/io5";
import "./ReceiptPhotoInput.scss";

const MAX_RECEIPT_PHOTO_BYTES = 5 * 1024 * 1024;

// `value` is a freshly picked File (not yet uploaded), an existing photo URL
// string, or null. Uploading/removing on the server is the caller's job (it
// happens after the entry itself is saved); this component only picks,
// previews and clears.
//
// `compact` drops the field label and shrinks the button to a small chip:
// the quick-add flow already gives "add a photo" a big-enough affordance
// through its own rhythm (emoji grid, big amount), and a labeled dashed
// dropzone there reads as a form field bolted onto an otherwise lightweight
// screen. The full edit form keeps the labeled version, matching its other
// labeled fields.
const ReceiptPhotoInput = ({ value, onChange, compact = false }) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!(value instanceof File)) return;
    const url = URL.createObjectURL(value);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const preview = value instanceof File ? objectUrl : value;

  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RECEIPT_PHOTO_BYTES) {
      toast.error(t("validation.imageTooLarge"));
      return;
    }
    onChange(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`receipt-photo-input${compact ? " receipt-photo-input--compact" : ""}`}>
      {!compact && <span className="receipt-photo-input__label">{t("vanLog.receiptPhotoLabel")}</span>}
      {preview ? (
        <div className="receipt-photo-input__preview">
          <img src={preview} alt="" />
          <button
            type="button"
            className="receipt-photo-input__remove"
            onClick={() => onChange(null)}
            aria-label={t("vanLog.removeReceiptPhoto")}
          >
            <IoCloseOutline />
          </button>
        </div>
      ) : (
        <label className="receipt-photo-input__add">
          <IoCameraOutline />
          <span>{t("vanLog.addReceiptPhoto")}</span>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleSelect} style={{ display: "none" }} />
        </label>
      )}
    </div>
  );
};

export default ReceiptPhotoInput;
