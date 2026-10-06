import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  IoAddOutline, IoJournalOutline, IoLocationOutline, IoPencilOutline, IoTrashOutline,
} from "react-icons/io5";
import { formatCalendarDay, isPremiumRequiredError, LIFE_DIARY_PAGE_SIZE, locationLine } from "@tobeatraveller/shared";
import LoadingButton from "../../components/LoadingButton";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import { deleteLifeDiaryEntry, getLifeDiaryEntries, getLifeDiaryUsage } from "../../services/lifeDiary";
import LifeDiaryFormModal from "./LifeDiaryFormModal";
import ToolHeader from "../../components/toolPage/ToolHeader";
import ToolEmptyState from "../../components/toolPage/ToolEmptyState";
import { usePageMeta } from "../../hooks/usePageMeta.js";
import "./LifeDiary.scss";

const ENTRY_DATE_FORMAT = { day: "numeric", month: "short", year: "numeric" };

const LifeDiary = () => {
  const { t, i18n } = useTranslation();
  usePageMeta({ title: t("nav.lifeDiary") });
  const d = (key, vars) => t(`lifeDiary.${key}`, vars);

  const [entries, setEntries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [freeTierUsage, setFreeTierUsage] = useState(null);

  const loadEntries = () => {
    setLoading(true);
    getLifeDiaryEntries({ limit: LIFE_DIARY_PAGE_SIZE })
      .then((page) => { setEntries(page.entries); setTotalCount(page.totalCount); setError(null); })
      .catch((err) => setError(isPremiumRequiredError(err) ? "premium" : "error"))
      .finally(() => setLoading(false));
  };

  // From where the list ends, not from a page number: an entry added or deleted meanwhile
  // would otherwise make one skipped or shown twice.
  const loadMore = () => {
    setLoadingMore(true);
    getLifeDiaryEntries({ limit: LIFE_DIARY_PAGE_SIZE, offset: entries.length })
      .then((page) => {
        // An empty page is the end, whatever the total says: asking again would never end.
        if (page.entries.length === 0) {
          setTotalCount(entries.length);
          return;
        }
        setEntries((prev) => {
          const known = new Set(prev.map((entry) => entry.id));
          return [...prev, ...page.entries.filter((entry) => !known.has(entry.id))];
        });
        setTotalCount(page.totalCount);
      })
      .catch(() => toast.error(d("loadMoreError")))
      .finally(() => setLoadingMore(false));
  };

  const loadUsage = () => {
    getLifeDiaryUsage().then(setFreeTierUsage).catch(() => {});
  };

  useEffect(() => { loadEntries(); loadUsage(); }, []);

  const atFreeTierCap = !!freeTierUsage?.limited && freeTierUsage.used >= freeTierUsage.limit;

  const openCreate = () => { setEditingEntry(null); setFormOpen(true); };
  const openEdit = (entry) => { setEditingEntry(entry); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const handleSaved = () => {
    closeForm();
    loadEntries();
    loadUsage();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteLifeDiaryEntry(deletingId);
      toast.success(d("deleted"));
      setDeletingId(null);
      setEntries((prev) => prev.filter((entry) => entry.id !== deletingId));
      setTotalCount((count) => Math.max(count - 1, 0));
      loadUsage();
    } catch (err) {
      toast.error(err.message || d("deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpanded = (id) => setExpandedId((prev) => (prev === id ? null : id));

  if (error) {
    return (
      <section className="section__container">
        <FeatureLoadState status={error} feature="lifeDiary" onRetry={loadEntries} />
      </section>
    );
  }

  return (
    <section className="life-diary section__container">
      <ToolHeader
        title={d("title")}
        description={d("purpose")}
        usage={freeTierUsage}
        usageLabel={freeTierUsage && d("freeTierUsage", { used: freeTierUsage.used, limit: freeTierUsage.limit })}
        actionLabel={d("addEntry")}
        ActionIcon={IoAddOutline}
        onAction={openCreate}
      />

      {loading ? (
        <div className="life-diary__entries">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton life-diary__entry-skeleton" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <ToolEmptyState Icon={IoJournalOutline} text={d("noEntries")} actionLabel={d("addEntry")} onAction={openCreate} />
      ) : (
        <div className="life-diary__entries">
          {entries.map((entry) => {
            const expanded = expandedId === entry.id;
            const hasMore = entry.lessonLearned || entry.memories || entry.peopleMet;
            return (
              <article key={entry.id} className="life-diary__entry">
                <div className="life-diary__entry-top">
                  <div className="life-diary__entry-place">
                    {entry.location?.name && (
                      <span className="life-diary__entry-location">
                        <IoLocationOutline className="life-diary__entry-location-icon" /> {locationLine(entry.location)}
                      </span>
                    )}
                    <span className="life-diary__entry-date">{formatCalendarDay(entry.entryDate, i18n.language, ENTRY_DATE_FORMAT)}</span>
                  </div>
                  <div className="life-diary__entry-actions">
                    <button type="button" onClick={() => openEdit(entry)} aria-label={t("common.edit")}>
                      <IoPencilOutline />
                    </button>
                    <button type="button" onClick={() => setDeletingId(entry.id)} aria-label={t("common.delete")}>
                      <IoTrashOutline />
                    </button>
                  </div>
                </div>

                {entry.images?.length > 0 && (
                  <div className="life-diary__entry-photos">
                    {entry.images.map((image) => (
                      <img key={image.id} src={image.photoUrl} alt="" className="life-diary__entry-photo" />
                    ))}
                  </div>
                )}

                {entry.bestMoment && (
                  <p className="life-diary__entry-excerpt">"{entry.bestMoment}"</p>
                )}

                {entry.wouldReturn !== null && (
                  <span className={`life-diary__badge ${entry.wouldReturn ? "life-diary__badge--yes" : "life-diary__badge--no"}`}>
                    {entry.wouldReturn ? d("wouldReturnBadge") : d("wouldNotReturnBadge")}
                  </span>
                )}

                {expanded && (
                  <div className="life-diary__entry-details">
                    {entry.lessonLearned && (
                      <p><strong>{d("lessonLearnedLabel")}:</strong> {entry.lessonLearned}</p>
                    )}
                    {entry.memories && (
                      <p className="life-diary__entry-memories">{entry.memories}</p>
                    )}
                    {entry.peopleMet && (
                      <p><strong>{d("peopleMetLabel")}:</strong> {entry.peopleMet}</p>
                    )}
                  </div>
                )}

                {hasMore && (
                  <button type="button" className="life-diary__read-more" onClick={() => toggleExpanded(entry.id)}>
                    {expanded ? t("common.close") : d("readMore")}
                  </button>
                )}
              </article>
            );
          })}
          {entries.length < totalCount && (
            <div className="life-diary__more">
              <LoadingButton onClick={loadMore} isLoading={loadingMore}>{t("common.loadMore")}</LoadingButton>
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <LifeDiaryFormModal
          entry={editingEntry}
          onClose={closeForm}
          onSaved={handleSaved}
          initialCapReached={!editingEntry && atFreeTierCap}
        />
      )}

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title={d("deleteConfirmTitle")}
        description={d("deleteConfirmDesc")}
        type="danger"
        loading={deleting}
      />
    </section>
  );
};

export default LifeDiary;
