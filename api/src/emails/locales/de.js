// Copy of the emails users get, in German. Keep the same keys as en.js.
export const de = {
    layout: {
        explore: 'Entdecken',
        community: 'Community',
        privacy: 'Datenschutz',
        contact: 'Kontakt',
        rights: (year) => `&copy; ${year} ToBeATraveller. Alle Rechte vorbehalten.`,
    },
    welcome: {
        subject: 'Willkommen bei ToBeATraveller ✈️',
        title: 'Willkommen bei ToBeATraveller',
        preheader: (username) => `Hallo ${username}, dein Konto ist startklar. Entdecke Reisen aus aller Welt.`,
        headline: (username) => `Willkommen an Bord, ${username}! ✈️`,
        intro: 'Dein ToBeATraveller-Konto ist startklar. Entdecke Reisen, die Reisende aus aller Welt teilen, oder teile deine eigenen.',
        features: [
            { emoji: '🗺️', title: 'Routen entdecken', description: 'Stöbere in Hunderten echter Reisen aus aller Welt' },
            { emoji: '✏️', title: 'Teile deine Reise', description: 'Erstelle und veröffentliche deine eigenen Routen' },
            { emoji: '👥', title: 'Vernetze dich', description: 'Folge Menschen, die dein nächstes Abenteuer inspirieren' },
        ],
        cta: 'Jetzt entdecken →',
        questions: (contactLink) => `Fragen? Antworte auf diese E-Mail oder besuche unsere ${contactLink('Kontaktseite')}.`,
        footer: `Du bekommst diese E-Mail, weil du ein Konto bei ToBeATraveller erstellt hast.<br/>
                 Falls das nicht du warst, kannst du sie einfach ignorieren.`,
    },
    passwordReset: {
        subject: 'Setze dein Passwort zurück',
        title: 'Setze dein Passwort zurück',
        preheader: 'Setze dein ToBeATraveller-Passwort zurück',
        headline: 'Setze dein Passwort zurück',
        intro: (username) => `Hallo ${username}, wir haben eine Anfrage zum Zurücksetzen des Passworts für dein ToBeATraveller-Konto erhalten.
                  Klicke auf den Button unten, um ein neues Passwort festzulegen.`,
        cta: 'Passwort zurücksetzen →',
        expiry: (newLinkLink) => `⏱ Dieser Link ist <strong>1 Stunde</strong> gültig. Wenn er abgelaufen ist, kannst du ${newLinkLink('einen neuen anfordern')}.`,
        fallback: 'Falls der Button nicht funktioniert, kopiere diese Adresse in deinen Browser:',
        footer: `Wenn du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren.<br/>
                 Dein Passwort bleibt unverändert.`,
    },
    passwordChanged: {
        subject: 'Dein Passwort wurde geändert',
        title: 'Passwort geändert',
        preheader: 'Das Passwort deines ToBeATraveller-Kontos wurde gerade geändert',
        headline: 'Dein Passwort wurde geändert',
        intro: (username) => `Hallo ${username}, wir bestätigen dir, dass das Passwort deines ToBeATraveller-Kontos gerade geändert wurde.`,
        warning: (emailLink) => `Falls du das nicht warst, ist dein Konto möglicherweise nicht mehr sicher. Schreib uns sofort an ${emailLink}.`,
        footer: (contactUsLink) => `Du bekommst diese E-Mail, weil das Passwort deines ToBeATraveller-Kontos geändert wurde.<br/>
                 Wenn du das warst, musst du nichts tun. Andernfalls ${contactUsLink('schreib uns')} bitte sofort.`,
    },
    accountDeleted: {
        subject: 'Dein Konto wurde gelöscht',
        title: 'Konto gelöscht',
        preheader: 'Dein ToBeATraveller-Konto wurde endgültig gelöscht',
        headline: 'Dein Konto wurde gelöscht',
        intro: (username) => `Hallo ${username}, wir bestätigen dir, dass dein ToBeATraveller-Konto und alle zugehörigen Daten
                  wie gewünscht endgültig gelöscht wurden.`,
        removedTitle: 'Was gelöscht wurde',
        removed: [
            'Dein Profil und deine persönlichen Daten',
            'Alle deine Routen und Reiseinhalte',
            'Deine Follower und die Konten, denen du gefolgt bist',
            'Alle gespeicherten Favoriten und Einstellungen',
        ],
        comeBack: `Falls das ein Versehen war: Schade, dass du gehst, aber du bist jederzeit wieder willkommen.
                  Du kannst jederzeit ein neues Konto erstellen.`,
        cta: 'Neues Konto erstellen',
        footer: (emailLink) => `Du bekommst diese E-Mail, weil dein ToBeATraveller-Konto gelöscht wurde.<br/>
                 Falls du das nicht veranlasst hast, schreib uns bitte sofort an ${emailLink}.`,
    },
    referralReward: {
        subject: 'Du hast gerade 1 Monat Premium bekommen 🎁',
        title: 'Einladungsprämie freigeschaltet',
        preheader: (friendUsername) => `${friendUsername} hat die erste Reise geteilt, deshalb bekommt ihr beide 1 Monat Premium.`,
        headline: 'Du hast gerade 1 Monat Premium bekommen! 🎁',
        intro: (username, friendUsername) => `Hallo ${username}, @${friendUsername} hat sich mit deinem Einladungslink angemeldet
                  und gerade die erste Reise auf ToBeATraveller geteilt. Als Dankeschön bekommt ihr beide 1 Monat Premium gratis.`,
        cta: 'Mehr Leute einladen →',
        footer: 'Du bekommst diese E-Mail, weil sich jemand mit deinem Einladungslink bei ToBeATraveller angemeldet und die erste Reise geteilt hat.',
    },
    contactConfirmation: {
        subject: 'Wir haben deine Nachricht erhalten',
        title: 'Nachricht erhalten',
        preheader: 'Danke für deine Nachricht, wir melden uns bald.',
        headline: (name) => `Danke, ${name}!`,
        intro: `Wir haben deine Nachricht erhalten und melden uns so schnell wie möglich,
                  meist innerhalb von 1–2 Werktagen.`,
        whileYouWait: `In der Zwischenzeit kannst du Routen aus der Community entdecken
                  oder deine nächste Reise planen.`,
        cta: 'Reisen entdecken →',
        footer: `Du bekommst diese E-Mail, weil du uns über das Kontaktformular von ToBeATraveller geschrieben hast.<br/>
                 Antworte einfach auf diese E-Mail, wenn du noch etwas ergänzen möchtest.`,
    },
};
