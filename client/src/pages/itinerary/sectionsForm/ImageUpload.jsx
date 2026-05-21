import React, { useEffect, useState } from "react";

const ImageUpload = ({ onUpload, imageUrl: initialImageUrl, isComplete }) => {
  const [previewUrl, setPreviewUrl] = useState(initialImageUrl || "");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    setPreviewUrl(initialImageUrl || "");
  }, [initialImageUrl]);

  const handleSelectFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    onUpload(file);
  };

  // #7 — clear image
  const handleClear = () => {
    setPreviewUrl("");
    setFileName("");
    onUpload(null);
    document.getElementById("image-upload-input").value = "";
  };

  return (
    <div className="image-upload-container">
      <h2 className="form__subtitle">
        Image
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>
      <div className="buttons-row">
        <label htmlFor="image-upload-input" className="btn btn__primary">
          {previewUrl ? "Change image" : "Upload image"}
        </label>
        {previewUrl && (
          <button type="button" className="image-upload-clear" onClick={handleClear}>
            Remove
          </button>
        )}
      </div>
      <input
        id="image-upload-input"
        type="file"
        onChange={handleSelectFile}
        accept="image/*"
        style={{ display: "none" }}
      />
      {fileName && (
        <span className="image-upload-filename" title={fileName}>
          {fileName}
        </span>
      )}
      {previewUrl && (
        <img src={previewUrl} alt="Uploaded preview" className="image-upload-preview" />
      )}
    </div>
  );
};

export default ImageUpload;
