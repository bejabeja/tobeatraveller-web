import "./ToolPage.scss";

// A tool with nothing in it yet: what goes here and the button to add the
// first one, instead of a lone grey line on an empty page.
const ToolEmptyState = ({ Icon, text, actionLabel, onAction }) => (
  <div className="tool-empty">
    {Icon && (
      <span className="tool-empty__icon" aria-hidden="true">
        <Icon />
      </span>
    )}
    <p className="tool-empty__text">{text}</p>
    {onAction && (
      <button type="button" className="btn btn--primary tool-empty__action" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

export default ToolEmptyState;
