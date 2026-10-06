import * as Sentry from "@sentry/node";
import cookieParser from 'cookie-parser';
import express from 'express';
import config from "./src/config/config.js";
import './src/config/instrument.js';
import { testConnection } from "./src/db/clientPostgres.js";
import { authenticate } from "./src/middlewares/authenticate.js";
import { corsMiddleware } from './src/middlewares/cors.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import { createAuthRouter } from './src/routes/authRouter.js';
import { createAuditLogRouter } from './src/routes/auditLogRouter.js';

import { createEmailRouter } from './src/routes/emailRouter.js';
import { createCommentsRouter } from "./src/routes/commentsRouter.js";
import { createNotificationsRouter } from "./src/routes/notificationsRouter.js";
import { createFavoritesRouter } from "./src/routes/favoritesRouter.js";
import { createLikesRouter } from "./src/routes/likesRouter.js";
import { createFollowRouter } from "./src/routes/followRouter.js";
import { healthCheckRouter } from './src/routes/healthCheckRouter.js';
import { createItinerariesRouter } from "./src/routes/itinerariesRouter.js";
import { createUsersRouter } from './src/routes/usersRouter.js';
import { createOgRouter } from './src/routes/ogRouter.js';
import { createRecapRouter } from './src/routes/recapRouter.js';
import { createBadgesRouter } from './src/routes/badgesRouter.js';
import { createSitemapRouter } from './src/routes/sitemapRouter.js';
import { createVanLogsRouter } from './src/routes/vanLogsRouter.js';
import { createSuppliesRouter } from './src/routes/suppliesRouter.js';
import { createPackingChecklistRouter } from './src/routes/packingChecklistRouter.js';
import { createLifeDiaryRouter } from './src/routes/lifeDiaryRouter.js';
import { createSubscriptionRouter } from './src/routes/subscriptionRouter.js';
import { createSubscriptionWebhookRouter } from './src/routes/subscriptionWebhookRouter.js';
import { createSubscriptionCronRouter } from './src/routes/subscriptionCronRouter.js';
import { createReferralRouter } from './src/routes/referralRouter.js';
import { createPushTokensRouter } from './src/routes/pushTokensRouter.js';
import { createContentReportsRouter } from './src/routes/contentReportsRouter.js';

const app = express();

// Behind Vercel's edge network, so req.ip needs the first X-Forwarded-For hop
// to reflect the real visitor instead of Vercel's own infra address.
app.set('trust proxy', true);

app.use(corsMiddleware());
// Mounted before express.json(): Stripe's signature verification needs the
// raw request body (see subscriptionWebhookRouter.js).
app.use('/subscription/webhook', createSubscriptionWebhookRouter());
app.use(express.json());
app.disable('x-powered-by');
app.use(cookieParser())

app.use('/users', createUsersRouter());
app.use('/users', authenticate, createFollowRouter());
app.use('/auth', createAuthRouter());
app.use('/itineraries', createItinerariesRouter());
app.use('/favorites', authenticate, createFavoritesRouter());
app.use('/likes', authenticate, createLikesRouter());
app.use('/comments', createCommentsRouter());
app.use('/reports', createContentReportsRouter());
app.use('/notifications', authenticate, createNotificationsRouter());
// Not premium-gated at the mount point: Van Log, Life Diary, Supplies and
// the packing lists are free up to a cap enforced in their own service
// (entries, items or, for packing, how many lists), so the gate lives there
// instead of blocking the whole route tree.
app.use('/van-logs', authenticate, createVanLogsRouter());
app.use('/supplies', authenticate, createSuppliesRouter());
// Auth lives inside the router: its scheduled reminders run on the cron secret.
app.use('/packing-checklist', createPackingChecklistRouter());
app.use('/life-diary', authenticate, createLifeDiaryRouter());
app.use('/subscription/scheduled-trial-reminders', createSubscriptionCronRouter());
app.use('/subscription', authenticate, createSubscriptionRouter());
// Same again: the purge of earlier invite codes runs on the cron secret.
app.use('/referrals', createReferralRouter());
// Auth/role checks live inside the router itself: the scheduled-purge route
// is triggered by Vercel Cron with a shared secret instead of a user JWT, so
// it can't sit behind a blanket authenticate() at the mount point.
app.use('/audit-log', createAuditLogRouter());
// Same as /audit-log: the scheduled token purge authenticates with the cron
// secret, so authenticate() is applied per route inside the router.
app.use('/push-tokens', createPushTokensRouter());
// Same again: the yearly recap announcement runs on the cron secret.
app.use('/recap', createRecapRouter());
// And the daily stamping of the countries of trips starting today.
app.use('/badges', createBadgesRouter());

app.use('/', createEmailRouter());
if (config.nodeEnv !== 'production') {
    const { createDevRouter } = await import('./src/routes/devRouter.js');
    app.use('/dev', createDevRouter());
}
app.use('/og', createOgRouter());
app.use('/', createSitemapRouter());
app.use('/api', healthCheckRouter());

Sentry.setupExpressErrorHandler(app);

app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler)

app.listen(config.port, async () => {
    console.log(`Server running on port ${config.port}`);
    await testConnection();
});

// export default app;