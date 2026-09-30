// What Stripe shows next to the box the customer must tick before paying right
// away: the explicit request for Premium to start at once and the
// acknowledgment that the right of withdrawal is lost once the service has been
// provided. It is one text per session, so it is picked from the customer's
// language. Keep it in step with the subscriptions section of the terms
// (legalTerms in the shared locales).
const MESSAGES = {
    en: (url) => `I ask for Premium to start right away. I understand that I lose the 14-day right of withdrawal once the service has been fully provided, and that if I withdraw earlier I will pay the proportional part I have used. I accept the [Terms and refund conditions](${url}).`,
    es: (url) => `Pido que Premium empiece ya. Entiendo que pierdo el derecho de desistimiento de 14 días cuando el servicio se haya prestado por completo, y que si desisto antes pagaré la parte proporcional que haya usado. Acepto los [Términos y las condiciones de reembolso](${url}).`,
    fr: (url) => `Je demande que Premium commence tout de suite. Je comprends que je perds le droit de rétractation de 14 jours une fois le service pleinement exécuté, et que si je me rétracte avant, je paierai la partie proportionnelle utilisée. J'accepte les [Conditions et les conditions de remboursement](${url}).`,
    de: (url) => `Ich bitte darum, dass Premium sofort beginnt. Mir ist bewusst, dass ich das 14-tägige Widerrufsrecht verliere, sobald die Leistung vollständig erbracht ist, und dass ich bei einem früheren Widerruf den anteiligen Betrag für die genutzte Zeit zahle. Ich akzeptiere die [Nutzungsbedingungen und Erstattungsbedingungen](${url}).`,
    it: (url) => `Chiedo che Premium inizi subito. Comprendo che perdo il diritto di recesso di 14 giorni una volta che il servizio sia stato pienamente eseguito, e che se recedo prima pagherò la parte proporzionale utilizzata. Accetto i [Termini e le condizioni di rimborso](${url}).`,
};

const FALLBACK_LANGUAGE = 'en';

export const consentLanguageFor = (language) => (language in MESSAGES ? language : FALLBACK_LANGUAGE);

export const consentMessageFor = (language, termsUrl) => MESSAGES[consentLanguageFor(language)](termsUrl);
