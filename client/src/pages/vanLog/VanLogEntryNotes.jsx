import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const VanLogEntryNotes = ({ notes, expanded, onToggle }) => {
  const { t } = useTranslation();
  const notesRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // Only a clamped note can be cut off, so the toggle is offered just when
  // the text really overflows its two lines (and while expanded, to collapse).
  useLayoutEffect(() => {
    const element = notesRef.current;
    if (!element || expanded) return undefined;
    const measure = () => setIsTruncated(element.scrollHeight > element.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [notes, expanded]);

  return (
    <>
      <p ref={notesRef} className={`van-log__entry-notes${expanded ? " van-log__entry-notes--expanded" : ""}`}>
        {notes}
      </p>
      {(isTruncated || expanded) && (
        <button type="button" className="van-log__entry-notes-toggle" onClick={onToggle} aria-expanded={expanded}>
          {t(expanded ? "vanLog.notesShowLess" : "vanLog.notesShowMore")}
        </button>
      )}
    </>
  );
};

export default VanLogEntryNotes;
