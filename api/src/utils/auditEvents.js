// Central registry of audit_log `action` values. Kept in one place so every
// service logs consistent, greppable event names instead of ad hoc strings,
// and so the events required for GDPR accountability (who did what to whose
// data, and when: logins, password resets, exports, deletions, role changes)
// stay visible as a single list.
export const AUDIT_EVENTS = Object.freeze({
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    PASSWORD_RESET_REQUESTED: 'password_reset_requested',
    PASSWORD_RESET_COMPLETED: 'password_reset_completed',
    PASSWORD_CHANGED: 'password_changed',
    EMAIL_VERIFIED: 'email_verified',
    EMAIL_CHANGED: 'email_changed',
    USERNAME_CHANGED: 'username_changed',
    DATA_EXPORTED: 'data_exported',
    ACCOUNT_DELETED_BY_SELF: 'account_deleted_by_self',
    ACCOUNT_DELETED_BY_ADMIN: 'account_deleted_by_admin',
    ROLE_UPDATED: 'role_updated',
    TIER_UPDATED: 'tier_updated',
    ADMIN_NOTICE_SENT: 'admin_notice_sent',
    AUDIT_LOG_PURGED: 'audit_log_purged',
    AI_ITINERARY_GENERATED: 'ai_itinerary_generated',
    SUBSCRIPTION_TERMS_ACCEPTED: 'subscription_terms_accepted',
    SUBSCRIPTION_STARTED: 'subscription_started',
    SUBSCRIPTION_CANCELED: 'subscription_canceled',
    SUBSCRIPTION_CANCELLATION_SCHEDULED: 'subscription_cancellation_scheduled',
    SUBSCRIPTION_RESUMED: 'subscription_resumed',
    SUBSCRIPTION_TRIAL_CONVERTED: 'subscription_trial_converted',
    SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
    SUBSCRIPTION_REFUNDED: 'subscription_refunded',
    SUBSCRIPTION_DISPUTED: 'subscription_disputed',
    REFERRAL_REWARD_GRANTED: 'referral_reward_granted',
    REFERRAL_REWARD_CAPPED: 'referral_reward_capped',
});
