// Copy of the emails users get, in French. Keep the same keys as en.js.
export const fr = {
    layout: {
        explore: 'Explorer',
        community: 'Communauté',
        privacy: 'Confidentialité',
        contact: 'Contact',
        rights: (year) => `&copy; ${year} ToBeATraveller. Tous droits réservés.`,
    },
    welcome: {
        subject: 'Bienvenue sur ToBeATraveller ✈️',
        title: 'Bienvenue sur ToBeATraveller',
        preheader: (username) => `Salut ${username}, ton compte est prêt à l'emploi. Pars à la découverte de voyages du monde entier.`,
        headline: (username) => `Bienvenue à bord, ${username} ! ✈️`,
        intro: 'Ton compte ToBeATraveller est prêt à l\'emploi. Découvre les voyages partagés par des voyageurs du monde entier, ou partage les tiens.',
        features: [
            { emoji: '🗺️', title: 'Explore des itinéraires', description: 'Parcours des centaines de vrais voyages du monde entier' },
            { emoji: '✏️', title: 'Partage ton voyage', description: 'Crée et publie tes propres itinéraires' },
            { emoji: '👥', title: 'Connecte-toi', description: 'Suis les personnes qui inspirent ta prochaine aventure' },
        ],
        cta: 'Commencer à explorer →',
        questions: (contactLink) => `Une question ? Réponds à cet e-mail ou consulte notre ${contactLink('page de contact')}.`,
        footer: `Tu reçois cet e-mail parce que tu as créé un compte sur ToBeATraveller.<br/>
                 Si ce n'était pas toi, tu peux l'ignorer.`,
    },
    passwordReset: {
        subject: 'Réinitialise ton mot de passe',
        title: 'Réinitialise ton mot de passe',
        preheader: 'Réinitialise ton mot de passe ToBeATraveller',
        headline: 'Réinitialise ton mot de passe',
        intro: (username) => `Salut ${username}, nous avons reçu une demande de réinitialisation du mot de passe de ton compte ToBeATraveller.
                  Clique sur le bouton ci-dessous pour en choisir un nouveau.`,
        cta: 'Réinitialiser le mot de passe →',
        expiry: (newLinkLink) => `⏱ Ce lien expire dans <strong>1 heure</strong>. S'il a expiré, tu peux ${newLinkLink('en demander un nouveau')}.`,
        fallback: 'Si le bouton ne fonctionne pas, copie et colle cette adresse dans ton navigateur :',
        footer: `Si tu n'as pas demandé de réinitialisation, tu peux ignorer cet e-mail.<br/>
                 Ton mot de passe restera le même.`,
    },
    passwordChanged: {
        subject: 'Ton mot de passe a été modifié',
        title: 'Mot de passe modifié',
        preheader: 'Le mot de passe de ton compte ToBeATraveller vient d\'être modifié',
        headline: 'Ton mot de passe a été modifié',
        intro: (username) => `Salut ${username}, nous te confirmons que le mot de passe de ton compte ToBeATraveller vient d'être modifié.`,
        warning: (emailLink) => `Si ce n'était pas toi, ton compte est peut-être compromis. Écris-nous au plus vite à ${emailLink}.`,
        footer: (contactUsLink) => `Tu reçois cet e-mail parce que le mot de passe de ton compte ToBeATraveller a été modifié.<br/>
                 Si c'était toi, tu n'as rien à faire. Sinon, ${contactUsLink('écris-nous')} au plus vite.`,
    },
    accountDeleted: {
        subject: 'Ton compte a été supprimé',
        title: 'Compte supprimé',
        preheader: 'Ton compte ToBeATraveller a été supprimé définitivement',
        headline: 'Ton compte a été supprimé',
        intro: (username) => `Salut ${username}, nous te confirmons que ton compte ToBeATraveller et toutes ses données
                  ont été supprimés définitivement, comme tu l'as demandé.`,
        removedTitle: 'Ce qui a été supprimé',
        removed: [
            'Ton profil et tes données personnelles',
            'Tous tes itinéraires et contenus de voyage',
            'Tes abonnés et tes abonnements',
            'Tous tes favoris et préférences enregistrés',
        ],
        comeBack: `Si c'était une erreur, nous sommes désolés de te voir partir, mais tu peux toujours revenir.
                  Tu peux créer un nouveau compte quand tu veux.`,
        cta: 'Créer un nouveau compte',
        footer: (emailLink) => `Tu reçois cet e-mail parce que ton compte ToBeATraveller a été supprimé.<br/>
                 Si tu ne l'as pas demandé, écris-nous au plus vite à ${emailLink}.`,
    },
    referralReward: {
        subject: 'Tu viens de gagner 1 mois de Premium 🎁',
        title: 'Récompense de parrainage débloquée',
        preheader: (friendUsername) => `${friendUsername} a partagé son premier voyage : vous gagnez tous les deux 1 mois de Premium.`,
        headline: 'Tu viens de gagner 1 mois de Premium ! 🎁',
        intro: (username, friendUsername) => `Salut ${username}, @${friendUsername} vient de partager son premier voyage sur ToBeATraveller
                  après son inscription avec ton lien d'invitation. Pour te remercier, vous gagnez tous les deux 1 mois de Premium offert.`,
        cta: 'Invite d\'autres personnes →',
        footer: 'Tu reçois cet e-mail parce que quelqu\'un a rejoint ToBeATraveller avec ton lien d\'invitation et a partagé son premier voyage.',
    },
    contactConfirmation: {
        subject: 'Nous avons bien reçu ton message',
        title: 'Message reçu',
        preheader: 'Merci de nous avoir écrit, nous te répondrons bientôt.',
        headline: (name) => `Merci, ${name} !`,
        intro: `Nous avons bien reçu ton message et nous te répondrons dès que possible,
                  généralement sous 1 à 2 jours ouvrés.`,
        whileYouWait: `En attendant, explore les itinéraires de la communauté
                  ou commence à préparer ton prochain voyage.`,
        cta: 'Explorer les voyages →',
        footer: `Tu reçois cet e-mail parce que tu nous as envoyé un message via le formulaire de contact de ToBeATraveller.<br/>
                 Réponds à cet e-mail si tu veux ajouter quelque chose.`,
    },
};
