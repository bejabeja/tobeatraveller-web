// The questions that hold people back from subscribing, answered on the
// pricing page. The answers state what the API does (a free trial with no
// card that ends by canceling, free limits that only stop new entries), so
// change them together with that behavior.
export const SUBSCRIPTION_FAQ = Object.freeze([
  { id: "trial", questionKey: "subscription.faqTrialQuestion", answerKey: "subscription.faqTrialAnswer" },
  { id: "cancel", questionKey: "subscription.faqCancelQuestion", answerKey: "subscription.faqCancelAnswer" },
  { id: "data", questionKey: "subscription.faqDataQuestion", answerKey: "subscription.faqDataAnswer" },
  { id: "ads", questionKey: "subscription.faqAdsQuestion", answerKey: "subscription.faqAdsAnswer" },
  { id: "invoices", questionKey: "subscription.faqInvoicesQuestion", answerKey: "subscription.faqInvoicesAnswer" },
]);
