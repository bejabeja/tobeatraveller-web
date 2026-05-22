import { useEffect, useRef, useState } from "react";
import { MdOutlineCameraAlt } from "react-icons/md";

const ImageUpload = ({ onUpload, imageUrl: initialImageUrl, isComplete }) => {
  const [previewUrl, setPreviewUrl] = useState(initialImageUrl || "");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(initialImageUrl || "");
  }, [initialImageUrl]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    onUpload(file);
  };

  const handleSelectFile = (e) => handleFile(e.target.files[0]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleClear = () => {
    setPreviewUrl("");
    setFileName("");
    onUpload(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="image-upload-container">
      <h2 className="form__subtitle">
        Cover Photo
        {isComplete && <span className="form__section-check">✓</span>}
      </h2>

      {!previewUrl ? (
        <label
          htmlFor="image-upload-input"
          className={`form__dropzone${isDragging ? " form__dropzone--dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <MdOutlineCameraAlt className="form__dropzone-icon" />
          <span className="form__dropzone-text">Drop your cover photo here</span>
          <span className="form__dropzone-hint">
            or <span className="form__dropzone-link">browse files</span>
          </span>
        </label>
      ) : (
        <div className="form__dropzone-preview">
          <img src={previewUrl} alt="Cover preview" className="image-upload-preview" />
          <div className="form__dropzone-actions">
            <label htmlFor="image-upload-input" className="btn btn__secondary">
              Change
            </label>
            <button type="button" className="image-upload-clear" onClick={handleClear}>
              Remove
            </button>
          </div>
          {fileName && (
            <span className="image-upload-filename" title={fileName}>
              {fileName}
            </span>
          )}
        </div>
      )}

      <input
        id="image-upload-input"
        ref={inputRef}
        type="file"
        onChange={handleSelectFile}
        accept="image/*"
        style={{ display: "none" }}
      />
    </div>
  );
};

export default ImageUpload;
