const SubmitButton = ({ label, loading = false, disabled = false }) => {
  const isDisabled = loading || disabled;
  return (
    <button
      type="submit"
      className="btn btn--primary"
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
    >
      {loading ? "Loading..." : label}
    </button>
  );
};

export default SubmitButton;
