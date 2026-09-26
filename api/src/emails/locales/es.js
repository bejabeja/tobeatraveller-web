// Copy of the emails users get, in Spanish. Keep the same keys as en.js.
export const es = {
    layout: {
        explore: 'Explorar',
        community: 'Comunidad',
        privacy: 'Privacidad',
        contact: 'Contacto',
        rights: (year) => `&copy; ${year} ToBeATraveller. Todos los derechos reservados.`,
    },
    welcome: {
        subject: 'Te damos la bienvenida a ToBeATraveller ✈️',
        title: 'Te damos la bienvenida a ToBeATraveller',
        preheader: (username) => `Hola, ${username}: tu cuenta ya está lista. Empieza a descubrir viajes de todo el mundo.`,
        headline: (username) => `¡Te damos la bienvenida, ${username}! ✈️`,
        intro: 'Tu cuenta de ToBeATraveller ya está lista. Descubre viajes compartidos por viajeros de todo el mundo o comparte los tuyos.',
        features: [
            { emoji: '🗺️', title: 'Explora itinerarios', description: 'Recorre cientos de viajes reales de viajeros de todo el mundo' },
            { emoji: '✏️', title: 'Comparte tu viaje', description: 'Crea y publica tus propios itinerarios' },
            { emoji: '👥', title: 'Conecta', description: 'Sigue a quienes inspiran tu próxima aventura' },
        ],
        cta: 'Empieza a explorar →',
        questions: (contactLink) => `¿Tienes dudas? Responde a este email o visita nuestra ${contactLink('página de contacto')}.`,
        footer: `Recibes este email porque has creado una cuenta en ToBeATraveller.<br/>
                 Si no has sido tú, puedes ignorarlo.`,
    },
    passwordReset: {
        subject: 'Restablece tu contraseña',
        title: 'Restablece tu contraseña',
        preheader: 'Restablece tu contraseña de ToBeATraveller',
        headline: 'Restablece tu contraseña',
        intro: (username) => `Hola, ${username}: hemos recibido una solicitud para restablecer la contraseña de tu cuenta de ToBeATraveller.
                  Pulsa el botón de abajo para elegir una nueva.`,
        cta: 'Restablecer contraseña →',
        expiry: (newLinkLink) => `⏱ Este enlace caduca en <strong>1 hora</strong>. Si ya ha caducado, puedes ${newLinkLink('pedir uno nuevo')}.`,
        fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
        footer: `Si no has pedido restablecer tu contraseña, puedes ignorar este email.<br/>
                 Tu contraseña seguirá siendo la misma.`,
    },
    passwordChanged: {
        subject: 'Tu contraseña se ha cambiado',
        title: 'Contraseña cambiada',
        preheader: 'Se acaba de cambiar tu contraseña de ToBeATraveller',
        headline: 'Tu contraseña se ha cambiado',
        intro: (username) => `Hola, ${username}: te confirmamos que se acaba de cambiar la contraseña de tu cuenta de ToBeATraveller.`,
        warning: (emailLink) => `Si no has sido tú, puede que alguien haya entrado en tu cuenta. Escríbenos cuanto antes a ${emailLink}.`,
        footer: (contactUsLink) => `Recibes este email porque se ha cambiado la contraseña de tu cuenta de ToBeATraveller.<br/>
                 Si has sido tú, no tienes que hacer nada. Si no, ${contactUsLink('escríbenos')} cuanto antes.`,
    },
    accountDeleted: {
        subject: 'Tu cuenta se ha eliminado',
        title: 'Cuenta eliminada',
        preheader: 'Tu cuenta de ToBeATraveller se ha eliminado para siempre',
        headline: 'Tu cuenta se ha eliminado',
        intro: (username) => `Hola, ${username}: te confirmamos que tu cuenta de ToBeATraveller y todos sus datos
                  se han eliminado para siempre, como pediste.`,
        removedTitle: 'Qué se ha eliminado',
        removed: [
            'Tu perfil y tus datos personales',
            'Todos tus itinerarios y contenido de viajes',
            'Tus seguidores y las personas a las que seguías',
            'Todos tus favoritos y preferencias guardados',
        ],
        comeBack: `Si ha sido un error, sentimos que te vayas, pero siempre puedes volver.
                  Puedes crear una cuenta nueva cuando quieras.`,
        cta: 'Crear una cuenta nueva',
        footer: (emailLink) => `Recibes este email porque se ha eliminado tu cuenta de ToBeATraveller.<br/>
                 Si no lo has pedido tú, escríbenos cuanto antes a ${emailLink}.`,
    },
    referralReward: {
        subject: 'Acabas de ganar 1 mes de Premium 🎁',
        title: 'Recompensa por invitar desbloqueada',
        preheader: (friendUsername) => `${friendUsername} ha compartido su primer viaje, así que los dos habéis ganado 1 mes de Premium.`,
        headline: '¡Acabas de ganar 1 mes de Premium! 🎁',
        intro: (username, friendUsername) => `Hola, ${username}: @${friendUsername} acaba de compartir su primer viaje en ToBeATraveller
                  después de unirse con tu enlace de invitación. Para darte las gracias, los dos habéis ganado 1 mes de Premium gratis.`,
        cta: 'Invita a más gente →',
        footer: 'Recibes este email porque alguien se ha unido a ToBeATraveller con tu enlace de invitación y ha compartido su primer viaje.',
    },
    contactConfirmation: {
        subject: 'Hemos recibido tu mensaje',
        title: 'Mensaje recibido',
        preheader: 'Gracias por escribirnos, te responderemos pronto.',
        headline: (name) => `¡Gracias, ${name}!`,
        intro: `Hemos recibido tu mensaje y te responderemos lo antes posible,
                  normalmente en 1 o 2 días laborables.`,
        whileYouWait: `Mientras tanto, puedes explorar itinerarios de la comunidad
                  o empezar a planear tu próximo viaje.`,
        cta: 'Explorar viajes →',
        footer: `Recibes este email porque nos has enviado un mensaje desde el formulario de contacto de ToBeATraveller.<br/>
                 Responde a este email si quieres añadir algo.`,
    },
};
