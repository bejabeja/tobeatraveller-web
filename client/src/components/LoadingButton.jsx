import React from "react";
import "./LoadingButton.scss";

const LoadingButton = ({ isLoading, children, ...props }) => {
  return (
    <button
      className="btn btn--secondary loading-button"
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <span className="loading-dots">Loading</span> : children}
    </button>
  );
};

export default LoadingButton;
