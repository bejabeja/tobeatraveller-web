import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: process.env.PORT || 3000,
    sentryDsn: process.env.SENTRY_DSN,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    originOne: process.env.ORIGIN_ONE,
    originTwo: process.env.ORIGIN_TWO,

    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    dbPort: process.env.DB_PORT,

    brevoApiKey: process.env.BREVO_API_KEY,
    brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || 'tobeatravellercompany@gmail.com',
    brevoSenderName: process.env.BREVO_SENDER_NAME || 'ToBeATraveller',
    contactRecipientEmail: process.env.CONTACT_RECIPIENT_EMAIL || process.env.BREVO_SENDER_EMAIL || 'tobeatravellercompany@gmail.com',
    appUrl: process.env.APP_URL || 'http://localhost:5173',
};

export default config;