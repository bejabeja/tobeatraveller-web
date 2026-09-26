// Copy of the emails users get, in Italian. Keep the same keys as en.js.
export const it = {
    layout: {
        explore: 'Esplora',
        community: 'Community',
        privacy: 'Privacy',
        contact: 'Contatti',
        rights: (year) => `&copy; ${year} ToBeATraveller. Tutti i diritti riservati.`,
    },
    welcome: {
        subject: 'Ti diamo il benvenuto su ToBeATraveller ✈️',
        title: 'Ti diamo il benvenuto su ToBeATraveller',
        preheader: (username) => `Ciao ${username}, il tuo account è attivo. Inizia a scoprire viaggi da tutto il mondo.`,
        headline: (username) => `Ti diamo il benvenuto a bordo, ${username}! ✈️`,
        intro: 'Il tuo account ToBeATraveller è attivo. Scopri i viaggi condivisi da viaggiatori di tutto il mondo, oppure condividi i tuoi.',
        features: [
            { emoji: '🗺️', title: 'Esplora itinerari', description: 'Sfoglia centinaia di viaggi reali da tutto il mondo' },
            { emoji: '✏️', title: 'Condividi il tuo viaggio', description: 'Crea e pubblica i tuoi itinerari' },
            { emoji: '👥', title: 'Connettiti', description: 'Segui le persone che ispirano la tua prossima avventura' },
        ],
        cta: 'Inizia a esplorare →',
        questions: (contactLink) => `Hai domande? Rispondi a questa email o visita la nostra ${contactLink('pagina dei contatti')}.`,
        footer: `Ricevi questa email perché hai creato un account su ToBeATraveller.<br/>
                 Se non l'hai creato tu, puoi ignorarla.`,
    },
    passwordReset: {
        subject: 'Reimposta la tua password',
        title: 'Reimposta la tua password',
        preheader: 'Reimposta la password di ToBeATraveller',
        headline: 'Reimposta la tua password',
        intro: (username) => `Ciao ${username}, abbiamo ricevuto una richiesta di reimpostazione della password del tuo account ToBeATraveller.
                  Tocca il pulsante qui sotto per sceglierne una nuova.`,
        cta: 'Reimposta la password →',
        expiry: (newLinkLink) => `⏱ Questo link scade tra <strong>1 ora</strong>. Se è scaduto, puoi ${newLinkLink('richiederne uno nuovo')}.`,
        fallback: 'Se il pulsante non funziona, copia e incolla questo indirizzo nel browser:',
        footer: `Se non hai chiesto di reimpostare la password, puoi ignorare questa email.<br/>
                 La tua password resterà invariata.`,
    },
    passwordChanged: {
        subject: 'La tua password è stata cambiata',
        title: 'Password cambiata',
        preheader: 'La password del tuo account ToBeATraveller è appena stata cambiata',
        headline: 'La tua password è stata cambiata',
        intro: (username) => `Ciao ${username}, ti confermiamo che la password del tuo account ToBeATraveller è appena stata cambiata.`,
        warning: (emailLink) => `Se non l'hai cambiata tu, il tuo account potrebbe essere compromesso. Scrivici subito a ${emailLink}.`,
        footer: (contactUsLink) => `Ricevi questa email perché la password del tuo account ToBeATraveller è stata cambiata.<br/>
                 Se l'hai cambiata tu, non devi fare nulla. Altrimenti, ${contactUsLink('scrivici')} subito.`,
    },
    accountDeleted: {
        subject: 'Il tuo account è stato eliminato',
        title: 'Account eliminato',
        preheader: 'Il tuo account ToBeATraveller è stato eliminato definitivamente',
        headline: 'Il tuo account è stato eliminato',
        intro: (username) => `Ciao ${username}, ti confermiamo che il tuo account ToBeATraveller e tutti i suoi dati
                  sono stati eliminati definitivamente, come hai chiesto.`,
        removedTitle: 'Cosa è stato eliminato',
        removed: [
            'Il tuo profilo e i tuoi dati personali',
            'Tutti i tuoi itinerari e contenuti di viaggio',
            'I tuoi follower e le persone che seguivi',
            'Tutti i preferiti e le preferenze salvati',
        ],
        comeBack: `Se è stato un errore, ci dispiace vederti andare via, ma puoi sempre tornare.
                  Puoi creare un nuovo account quando vuoi.`,
        cta: 'Crea un nuovo account',
        footer: (emailLink) => `Ricevi questa email perché il tuo account ToBeATraveller è stato eliminato.<br/>
                 Se non l'hai chiesto tu, scrivici subito a ${emailLink}.`,
    },
    referralReward: {
        subject: 'Hai appena ottenuto 1 mese di Premium 🎁',
        title: 'Premio per invito sbloccato',
        preheader: (friendUsername) => `${friendUsername} ha condiviso il suo primo viaggio, quindi avete ottenuto entrambi 1 mese di Premium.`,
        headline: 'Hai appena ottenuto 1 mese di Premium! 🎁',
        intro: (username, friendUsername) => `Ciao ${username}, @${friendUsername} ha appena condiviso il suo primo viaggio su ToBeATraveller
                  dopo l'iscrizione con il tuo link di invito. Per ringraziarti, avete ottenuto entrambi 1 mese di Premium gratis.`,
        cta: 'Invita altre persone →',
        footer: 'Ricevi questa email perché qualcuno si è iscritto a ToBeATraveller con il tuo link di invito e ha condiviso il suo primo viaggio.',
    },
    contactConfirmation: {
        subject: 'Abbiamo ricevuto il tuo messaggio',
        title: 'Messaggio ricevuto',
        preheader: 'Grazie per averci scritto, ti risponderemo presto.',
        headline: (name) => `Grazie, ${name}!`,
        intro: `Abbiamo ricevuto il tuo messaggio e ti risponderemo il prima possibile,
                  di solito entro 1 o 2 giorni lavorativi.`,
        whileYouWait: `Nel frattempo, esplora gli itinerari della community
                  o inizia a pianificare il tuo prossimo viaggio.`,
        cta: 'Esplora i viaggi →',
        footer: `Ricevi questa email perché ci hai inviato un messaggio dal modulo di contatto di ToBeATraveller.<br/>
                 Rispondi a questa email se vuoi aggiungere qualcosa.`,
    },
};
