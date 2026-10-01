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
            { emoji: '🗺️', title: 'Explora itinerarios', description: 'Recorre viajes reales compartidos por viajeros de todo el mundo' },
            { emoji: '✏️', title: 'Comparte tu viaje', description: 'Crea y publica tus propios itinerarios' },
            { emoji: '👥', title: 'Conecta', description: 'Sigue a quienes inspiran tu próxima aventura' },
        ],
        cta: 'Empieza a explorar →',
        verifyIntro: 'Un último paso: confirma tu dirección de correo para que podamos contactarte sobre tu cuenta.',
        verifyCta: 'Confirmar mi correo →',
        questions: (contactLink) => `¿Tienes dudas? Responde a este email o visita nuestra ${contactLink('página de contacto')}.`,
        footer: `Recibes este email porque has creado una cuenta en ToBeATraveller.<br/>
                 Si no has sido tú, puedes ignorarlo.`,
    },
    verifyEmail: {
        subject: 'Confirma tu correo electrónico',
        title: 'Confirma tu correo',
        preheader: 'Confirma tu correo para terminar de configurar tu cuenta de ToBeATraveller',
        headline: 'Confirma tu correo',
        intro: (username) => `Hola, ${username}: confirma que esta es tu dirección de correo para que podamos contactarte sobre tu cuenta. Solo te llevará un clic.`,
        cta: 'Confirmar mi correo →',
        expiry: '⏱ Este enlace caduca en <strong>48 horas</strong>. Si ya ha caducado, inicia sesión y pide uno nuevo desde el aviso de la parte superior.',
        fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
        footer: `Recibes este correo porque se usó esta dirección para crear una cuenta en ToBeATraveller.<br/>
                 Si no has sido tú, puedes ignorar este email.`,
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
    trialEnding: {
        subject: 'Tu prueba gratuita de Premium termina pronto',
        title: 'Tu prueba está a punto de terminar',
        preheader: (date) => `Tu prueba gratuita termina el ${date}.`,
        headline: (date) => `Tu prueba gratuita termina el ${date}`,
        introNoCard: (username) => `Hola ${username}, tu prueba de Premium está a punto de terminar. No se te cobrará nada: si no haces nada, ese día pasas al plan gratuito y todo lo que has guardado sigue en tu cuenta (el plan gratuito tiene sus límites). Para mantener Premium sin límites, suscríbete antes.`,
        introWithCard: (username) => `Hola ${username}, tu prueba de Premium está a punto de terminar. Como has añadido un método de pago, ese día empezará tu suscripción y se cobrará a tu tarjeta. Si no quieres que se cobre, cancélala antes desde tu página de facturación.`,
        ctaNoCard: 'Mantener Premium →',
        ctaWithCard: 'Gestionar mi suscripción →',
        footer: 'Recibes este correo porque empezaste una prueba gratuita de Premium en ToBeATraveller.',
    },
    trialEnded: {
        subject: 'Tu prueba de Premium ha terminado',
        title: 'Prueba de Premium terminada',
        preheader: 'Ahora estás en el plan gratuito. Todo lo que guardaste sigue aquí.',
        headline: 'Tu prueba de Premium ha terminado',
        intro: (username) => `Hola ${username}, tu prueba gratuita ha terminado y ahora estás en el plan gratuito. Todo lo que guardaste sigue en tu cuenta y puedes seguir usando las herramientas dentro de los límites gratuitos. Si quieres volver a tener Premium sin límites, puedes suscribirte cuando quieras.`,
        cta: 'Ver los planes Premium →',
        footer: 'Recibes este correo porque tu prueba gratuita de Premium en ToBeATraveller ha terminado.',
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
