import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { REPORT_DECISIONS, REPORT_STATUSES, REPORT_TARGET_TYPES } from "@tobeatraveller/shared";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import LoadingButton from "../../components/LoadingButton";
import Spinner from "../../components/spinner/Spinner";
import { decideReport, getReports } from "../../services/contentReports";
import "./InternalReports.scss";

const PAGE_SIZE = 20;

const targetPath = ({ targetType, targetId }) => {
  if (targetType === REPORT_TARGET_TYPES.ITINERARY) return `/itinerary/${targetId}`;
  if (targetType === REPORT_TARGET_TYPES.USER) return `/profile/${targetId}`;
  return null;
};

// The queue of what people reported, oldest first. A decision is one click on
// a report that is still open; the note is for the record.
const InternalReports = () => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState(REPORT_STATUSES.OPEN);
  const [reports, setReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [notes, setNotes] = useState({});
  const [deciding, setDeciding] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getReports({ status: status || undefined, limit: PAGE_SIZE })
      .then(({ reports: page, totalCount: total }) => { setReports(page); setTotalCount(total); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { reports: page, totalCount: total } = await getReports({ status: status || undefined, limit: PAGE_SIZE, offset: reports.length });
      setReports((current) => [...current, ...page]);
      setTotalCount(total);
    } catch {
      toast.error(t("admin.reportsLoadError"));
    } finally {
      setLoadingMore(false);
    }
  };

  const decide = async (report, decision) => {
    setDeciding(report.id);
    try {
      await decideReport(report.id, { decision, note: notes[report.id] });
      toast.success(t("admin.reportDecided"));
      load();
    } catch (decisionError) {
      toast.error(decisionError.message || t("admin.reportDecideError"));
    } finally {
      setDeciding(null);
    }
  };

  const filterButton = (value, label) => (
    <button
      type="button"
      className={`internal-reports__filter${status === value ? " internal-reports__filter--active" : ""}`}
      aria-pressed={status === value}
      onClick={() => setStatus(value)}
    >
      {label}
    </button>
  );

  return (
    <section className="internal-reports">
      <div className="internal-reports__filters">
        {filterButton(REPORT_STATUSES.OPEN, t("admin.reportsFilterOpen"))}
        {filterButton("", t("admin.reportsFilterAll"))}
      </div>

      {error ? (
        <FeatureLoadState status="error" onRetry={load} />
      ) : loading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <p className="internal-reports__empty">{t("admin.reportsEmpty")}</p>
      ) : (
        <ul className="internal-reports__list">
          {reports.map((report) => {
            const isOpen = report.status === REPORT_STATUSES.OPEN;
            const path = targetPath(report);
            return (
              <li key={report.id} className="internal-reports__item">
                <div className="internal-reports__head">
                  <strong>{t(`report.reason.${report.reason}`)}</strong>
                  <span className={`internal-reports__status internal-reports__status--${report.status}`}>
                    {t(`admin.reportStatus.${report.status}`)}
                  </span>
                  <time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString(i18n.language)}</time>
                </div>
                <p className="internal-reports__about">
                  {t("admin.reportAbout", { type: t(`report.targetType.${report.targetType}`), owner: `@${report.targetOwnerUsername ?? "?"}` })}
                  {path && <> · <Link to={path}>{t("admin.reportOpenTarget")}</Link></>}
                </p>
                {report.targetExcerpt && <blockquote className="internal-reports__excerpt">{report.targetExcerpt}</blockquote>}
                {report.details && <p className="internal-reports__details">{report.details}</p>}
                <p className="internal-reports__reporter">{t("admin.reportBy", { name: `@${report.reporterUsername ?? "?"}` })}</p>
                {report.resolutionNote && <p className="internal-reports__details">{report.resolutionNote}</p>}

                {isOpen && (
                  <div className="internal-reports__decide">
                    <label>
                      <span>{t("admin.reportNoteLabel")}</span>
                      <input
                        type="text"
                        value={notes[report.id] ?? ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                      />
                    </label>
                    <div className="internal-reports__buttons">
                      {report.targetType !== REPORT_TARGET_TYPES.USER && (
                        <button type="button" className="btn btn--danger" disabled={deciding === report.id} onClick={() => decide(report, REPORT_DECISIONS.REMOVE)}>
                          {t("admin.reportRemove")}
                        </button>
                      )}
                      <button type="button" className="btn btn--secondary" disabled={deciding === report.id} onClick={() => decide(report, REPORT_DECISIONS.DISMISS)}>
                        {t("admin.reportDismiss")}
                      </button>
                      {report.targetType === REPORT_TARGET_TYPES.USER && (
                        <button type="button" className="btn btn--secondary" disabled={deciding === report.id} onClick={() => decide(report, REPORT_DECISIONS.RESOLVE)}>
                          {t("admin.reportResolve")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && reports.length < totalCount && (
        <div className="internal-reports__more">
          <LoadingButton onClick={loadMore} isLoading={loadingMore}>{t("common.loadMore")}</LoadingButton>
        </div>
      )}
    </section>
  );
};

export default InternalReports;
