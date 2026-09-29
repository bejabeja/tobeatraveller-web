import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ADMIN_NOTICE_MAX_LENGTH, adminNoticeSchema, formatDate } from "@tobeatraveller/shared";
import { IoEyeOutline, IoMailOutline, IoTrashOutline } from "react-icons/io5";
import { useSelector } from "react-redux";
import { TextAreaForm } from "../../components/form/InputForm";
import FeatureLoadState from "../../components/featureLoadState/FeatureLoadState";
import Modal from "../../components/modal/Modal";
import Spinner from "../../components/spinner/Spinner";
import SelectMenu from "../../components/form/SelectMenu";
import useDebouncedEffect from "../../hooks/useDebounced";
import { deleteUserById, getAllUsersForAdmin, sendAdminNotice, updateUserRole, updateUserTier } from "../../services/users";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import { generateAvatar } from "../../utils/constants/constants";
import UserDetailModal from "./UserDetailModal";
import "./InternalUsers.scss";

const PAGE_SIZE = 20;
const ASSIGNABLE_ROLES = ["user", "admin", "superadmin"];
const GIFT_PREMIUM_MONTHS = [1, 3, 12];
const REMOVE_PREMIUM = "free";
const GIFT_PREFIX = "gift:";
const TIER_FILTER_PREMIUM = "premium";
const TIER_FILTER_FREE = "free";
// A gift with no end date is stored a century out (see userService.js).
const INDEFINITE_AFTER_YEARS = 50;

const isIndefinite = (premiumUntil) =>
  new Date(premiumUntil).getFullYear() - new Date().getFullYear() > INDEFINITE_AFTER_YEARS;

const InternalUsers = () => {
  const { t, i18n } = useTranslation();
  const authUser = useSelector(selectAuthUser);
  const meDetail = useSelector(selectMe);
  const currentUserId = (meDetail ?? authUser)?.id;

  const [users, setUsers] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [sortBy, setSortBy] = useState("username");
  const [roleFilter, setRoleFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [updatingTierId, setUpdatingTierId] = useState(null);
  // { kind: "delete" | "grantSuperadmin", user, newRole? }
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [noticeUser, setNoticeUser] = useState(null);
  const [sendingNotice, setSendingNotice] = useState(false);

  const noticeForm = useForm({
    resolver: zodResolver(adminNoticeSchema),
    defaultValues: { message: "" },
  });

  const loadUsers = (targetPage = 1, name = searchName, sort = sortBy, role = roleFilter, tier = tierFilter) => {
    setLoading(true);
    getAllUsersForAdmin({
      searchName: name,
      page: targetPage,
      limit: PAGE_SIZE,
      sortBy: sort,
      role: role || undefined,
      isPremium: tier === TIER_FILTER_PREMIUM ? true : tier === TIER_FILTER_FREE ? false : undefined,
    })
      .then((res) => {
        setUsers(res.users);
        setPage(res.currentPage);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch(() => setError("error"))
      .finally(() => setLoading(false));
  };

  useDebouncedEffect(() => loadUsers(1, searchName, sortBy, roleFilter, tierFilter), [searchName, sortBy, roleFilter, tierFilter], 400);

  const applyRoleChange = async (user, newRole) => {
    setUpdatingRoleId(user.id);
    try {
      await updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      toast.success(t("admin.roleUpdated"));
    } catch (err) {
      toast.error(err.message || t("admin.roleUpdateError"));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRoleChange = (user, newRole) => {
    if (newRole === user.role) return;
    if (newRole === "superadmin") {
      setPendingAction({ kind: "grantSuperadmin", user, newRole });
      return;
    }
    applyRoleChange(user, newRole);
  };

  const shortDate = (date) => formatDate(date, i18n.language, { day: "numeric", month: "short", year: "numeric" });

  const tierStatus = (user) => {
    if (!user.isPremium) return t("admin.free");
    return isIndefinite(user.premiumUntil)
      ? t("admin.premiumIndefinite")
      : t("admin.premiumUntil", { date: shortDate(user.premiumUntil) });
  };

  const handleTierChange = async (user, choice) => {
    const isRemoval = choice === REMOVE_PREMIUM;
    const months = isRemoval ? undefined : Number(choice.slice(GIFT_PREFIX.length)) || undefined;

    setUpdatingTierId(user.id);
    try {
      const updated = await updateUserTier(user.id, isRemoval ? "free" : "premium", months);
      setUsers((prev) => prev.map((u) => (
        u.id === user.id ? { ...u, isPremium: updated.isPremium, premiumUntil: updated.premiumUntil } : u
      )));
      toast.success(isRemoval && updated.isPremium
        ? t("admin.tierKeptPaid", { date: shortDate(updated.premiumUntil) })
        : t("admin.tierUpdated"));
    } catch (err) {
      toast.error(err.message || t("admin.tierUpdateError"));
    } finally {
      setUpdatingTierId(null);
    }
  };

  const confirmPendingAction = async () => {
    setConfirmingAction(true);
    try {
      if (pendingAction.kind === "delete") {
        await deleteUserById(pendingAction.user.id);
        toast.success(t("admin.userDeleted"));
        loadUsers(page);
      } else {
        await applyRoleChange(pendingAction.user, pendingAction.newRole);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err.message || t("admin.deleteError"));
    } finally {
      setConfirmingAction(false);
    }
  };

  const submitNotice = async ({ message }) => {
    setSendingNotice(true);
    try {
      await sendAdminNotice(noticeUser.id, message);
      toast.success(t("admin.noticeSent"));
      setNoticeUser(null);
      noticeForm.reset();
    } catch (err) {
      toast.error(err.message || t("admin.noticeSendError"));
    } finally {
      setSendingNotice(false);
    }
  };

  if (error) {
    return <FeatureLoadState status={error} onRetry={() => loadUsers(page)} />;
  }

  const modalCopy = pendingAction?.kind === "delete"
    ? {
        title: t("admin.deleteConfirmTitle"),
        description: t("admin.deleteConfirmDesc", { username: pendingAction.user.username }),
      }
    : pendingAction
    ? {
        title: t("admin.grantSuperadminTitle"),
        description: t("admin.grantSuperadminDesc", { username: pendingAction.user.username }),
      }
    : null;

  return (
    <section className="internal-users">
      <div className="internal-users__header">
        <input
          type="text"
          className="internal-users__search"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder={t("community.searchPlaceholder")}
        />
        <SelectMenu
          variant="compact"
          className="internal-users__sort"
          ariaLabel={t("community.sortAZ")}
          options={[
            { value: "username", label: t("community.sortAZ") },
            { value: "newest", label: t("admin.sortNewest") },
            { value: "itineraries", label: t("community.sortMostItineraries") },
          ]}
          value={sortBy}
          onChange={setSortBy}
        />
        <SelectMenu
          variant="compact"
          className="internal-users__filter-role"
          ariaLabel={t("admin.allRoles")}
          options={[
            { value: "", label: t("admin.allRoles") },
            ...ASSIGNABLE_ROLES.map((role) => ({ value: role, label: t(`admin.roleName.${role}`, role) })),
          ]}
          value={roleFilter}
          onChange={setRoleFilter}
        />
        <SelectMenu
          variant="compact"
          className="internal-users__filter-tier"
          ariaLabel={t("admin.allTiers")}
          options={[
            { value: "", label: t("admin.allTiers") },
            { value: TIER_FILTER_PREMIUM, label: t("admin.premium") },
            { value: TIER_FILTER_FREE, label: t("admin.free") },
          ]}
          value={tierFilter}
          onChange={setTierFilter}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <p className="internal-users__empty">{t("admin.noUsers")}</p>
      ) : (
        <div className="internal-users__list">
          {users.map((user) => {
            const roleOptions = ASSIGNABLE_ROLES.includes(user.role)
              ? ASSIGNABLE_ROLES
              : [user.role, ...ASSIGNABLE_ROLES];

            return (
              <div key={user.id} className="internal-users__row">
                <img
                  className="internal-users__avatar"
                  src={user.avatarUrl || generateAvatar(user.username)}
                  alt=""
                  onError={(e) => { e.currentTarget.src = generateAvatar(user.username); }}
                />
                <div className="internal-users__info">
                  <span className="internal-users__username">
                    {user.username}
                    {user.isPremium ? ` · ${t("admin.premium")}` : ""}
                  </span>
                  <span className="internal-users__meta">{user.email}</span>
                  <span className="internal-users__meta">
                    {t("admin.joined", { date: shortDate(user.createdAt) })}
                    {" · "}
                    {t("admin.itinerariesCount", { count: user.totalItineraries })}
                  </span>
                </div>
                <SelectMenu
                  variant="compact"
                  className="internal-users__role-select"
                  ariaLabel={user.username}
                  disabled={user.id === currentUserId || updatingRoleId === user.id}
                  options={roleOptions.map((role) => ({ value: role, label: t(`admin.roleName.${role}`, role) }))}
                  value={user.role}
                  onChange={(role) => handleRoleChange(user, role)}
                />
                <SelectMenu
                  variant="compact"
                  className="internal-users__tier-select"
                  ariaLabel={t("admin.premium")}
                  placeholder={tierStatus(user)}
                  disabled={updatingTierId === user.id}
                  options={[
                    ...GIFT_PREMIUM_MONTHS.map((months) => ({
                      value: `${GIFT_PREFIX}${months}`,
                      label: t("admin.giftPremiumMonths", { count: months }),
                    })),
                    { value: GIFT_PREFIX, label: t("admin.giftPremiumIndefinite") },
                    ...(user.isPremium ? [{ value: REMOVE_PREMIUM, label: t("admin.removePremium") }] : []),
                  ]}
                  value=""
                  onChange={(value) => handleTierChange(user, value)}
                />
                <button
                  type="button"
                  className="internal-users__detail"
                  onClick={() => setDetailUser(user)}
                  aria-label={t("admin.userDetailTitle", { username: user.username })}
                >
                  <IoEyeOutline />
                </button>
                <button
                  type="button"
                  className="internal-users__notice"
                  onClick={() => setNoticeUser(user)}
                  disabled={user.id === currentUserId}
                  aria-label={t("admin.sendNotice")}
                >
                  <IoMailOutline />
                </button>
                <button
                  type="button"
                  className="internal-users__delete"
                  onClick={() => setPendingAction({ kind: "delete", user })}
                  disabled={user.id === currentUserId}
                  aria-label={t("common.delete")}
                >
                  <IoTrashOutline />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="internal-users__pagination">
          <button type="button" disabled={page <= 1} onClick={() => loadUsers(page - 1)}>
            {t("admin.previous")}
          </button>
          <span>{t("admin.pageOf", { page, totalPages })}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => loadUsers(page + 1)}>
            {t("admin.next")}
          </button>
        </div>
      )}

      <Modal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        title={modalCopy?.title}
        description={modalCopy?.description}
        type="danger"
        loading={confirmingAction}
      />

      <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />

      <Modal
        isOpen={!!noticeUser}
        onClose={() => { setNoticeUser(null); noticeForm.reset(); }}
        onConfirm={noticeForm.handleSubmit(submitNotice)}
        title={noticeUser ? t("admin.sendNoticeTitle", { username: noticeUser.username }) : ""}
        confirmText={t("admin.sendNotice")}
        loading={sendingNotice}
      >
        <TextAreaForm
          name="message"
          control={noticeForm.control}
          error={noticeForm.formState.errors.message}
          placeholder={t("admin.sendNoticePlaceholder")}
          maxLength={ADMIN_NOTICE_MAX_LENGTH}
        />
      </Modal>
    </section>
  );
};

export default InternalUsers;
