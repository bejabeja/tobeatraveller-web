// Copy of the emails users get, in English. Keep the same keys as es.js.
// Values that take a function get the parts that change per email; they
// return HTML, so anything inserted must already be safe to show.
export const en = {
    layout: {
        explore: 'Explore',
        community: 'Community',
        privacy: 'Privacy',
        contact: 'Contact',
        rights: (year) => `&copy; ${year} ToBeATraveller. All rights reserved.`,
    },
    welcome: {
        subject: 'Welcome to ToBeATraveller ✈️',
        title: 'Welcome to ToBeATraveller',
        preheader: (username) => `Hi ${username}, your account is ready. Start exploring journeys around the world.`,
        headline: (username) => `Welcome aboard, ${username}! ✈️`,
        intro: 'Your ToBeATraveller account is ready. Discover journeys shared by travellers around the world, or share your own.',
        features: [
            { emoji: '🗺️', title: 'Explore itineraries', description: 'Browse hundreds of real trips from travellers worldwide' },
            { emoji: '✏️', title: 'Share your journey', description: 'Create and publish your own travel itineraries' },
            { emoji: '👥', title: 'Connect', description: 'Follow people who inspire your next adventure' },
        ],
        cta: 'Start Exploring →',
        questions: (contactLink) => `Have questions? Reply to this email or visit our ${contactLink('contact page')}.`,
        footer: `You received this because you created an account at ToBeATraveller.<br/>
                 If this wasn't you, you can safely ignore this email.`,
    },
    passwordReset: {
        subject: 'Reset your password',
        title: 'Reset your password',
        preheader: 'Reset your ToBeATraveller password',
        headline: 'Reset your password',
        intro: (username) => `Hi ${username}, we received a request to reset the password for your ToBeATraveller account.
                  Click the button below to choose a new password.`,
        cta: 'Reset Password →',
        expiry: (newLinkLink) => `⏱ This link expires in <strong>1 hour</strong>. If it has expired, you can ${newLinkLink('request a new one')}.`,
        fallback: "If the button doesn't work, copy and paste this URL into your browser:",
        footer: `If you didn't request a password reset, you can safely ignore this email.<br/>
                 Your password will remain unchanged.`,
    },
    passwordChanged: {
        subject: 'Your password has been changed',
        title: 'Password changed',
        preheader: 'Your ToBeATraveller password was just changed',
        headline: 'Your password has been changed',
        intro: (username) => `Hi ${username}, this confirms that the password for your ToBeATraveller account was just changed.`,
        warning: (emailLink) => `If you didn't make this change, your account may be compromised. Contact us immediately at ${emailLink}.`,
        footer: (contactUsLink) => `This email was sent because the password on your ToBeATraveller account was changed.<br/>
                 If this was you, no further action is needed. Otherwise, please ${contactUsLink('contact us')} right away.`,
    },
    accountDeleted: {
        subject: 'Your account has been deleted',
        title: 'Account deleted',
        preheader: 'Your ToBeATraveller account has been permanently deleted',
        headline: 'Your account has been deleted',
        intro: (username) => `Hi ${username}, we're confirming that your ToBeATraveller account and all associated data
                  have been permanently deleted as requested.`,
        removedTitle: 'What has been removed',
        removed: [
            'Your profile and personal information',
            'All your itineraries and travel content',
            'Your followers and following connections',
            'All saved favourites and preferences',
        ],
        comeBack: `If this was a mistake, we're sorry to see you go, but you're always welcome back.
                  You can create a new account at any time.`,
        cta: 'Create a new account',
        footer: (emailLink) => `This email was sent because your ToBeATraveller account was deleted.<br/>
                 If you didn't request this, please contact us immediately at ${emailLink}.`,
    },
    referralReward: {
        subject: 'You just earned 1 month of Premium 🎁',
        title: 'Referral reward unlocked',
        preheader: (friendUsername) => `${friendUsername} shared their first trip, so you both got 1 month of Premium.`,
        headline: 'You just earned 1 month of Premium! 🎁',
        intro: (username, friendUsername) => `Hi ${username}, your friend @${friendUsername} just shared their first trip on ToBeATraveller
                  after joining with your invite link. As a thank you, you both got 1 month of Premium, free.`,
        cta: 'Invite more friends →',
        footer: 'You received this because someone joined ToBeATraveller with your invite link and shared their first trip.',
    },
    contactConfirmation: {
        subject: "We've received your message",
        title: 'Message received',
        preheader: "Thanks for reaching out, we'll get back to you shortly.",
        headline: (name) => `Thanks, ${name}!`,
        intro: `We've received your message and we'll get back to you as soon as possible,
                  usually within 1–2 business days.`,
        whileYouWait: `While you wait, feel free to explore itineraries from the community
                  or start planning your next trip.`,
        cta: 'Explore trips →',
        footer: `You received this because you submitted a message via the ToBeATraveller contact form.<br/>
                 Reply to this email if you have anything to add.`,
    },
};
