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
import { createDevRouter } from './src/routes/devRouter.js';
import { createEmailRouter } from './src/routes/emailRouter.js';
import { createCloudinaryRouter } from "./src/routes/cloudinaryRouter.js";
import { createCommentsRouter } from "./src/routes/commentsRouter.js";
import { createFavoritesRouter } from "./src/routes/favoritesRouter.js";
import { createLikesRouter } from "./src/routes/likesRouter.js";
import { createFollowRouter } from "./src/routes/followRouter.js";
import { healthCheckRouter } from './src/routes/healthCheckRouter.js';
import { createItinerariesRouter } from "./src/routes/itinerariesRouter.js";
import { createItineraryRouter } from './src/routes/itineraryRouter.js';
import { createUsersRouter } from './src/routes/usersRouter.js';

const app = express();

app.use(corsMiddleware());
app.use(express.json());
app.disable('x-powered-by');
app.use(cookieParser())

app.use('/itinerary', createItineraryRouter());
app.use('/users', createUsersRouter());
app.use('/users', authenticate, createFollowRouter());
app.use('/auth', createAuthRouter());
app.use('/itineraries', createItinerariesRouter());
app.use('/cloudinary', createCloudinaryRouter());
app.use('/favorites', authenticate, createFavoritesRouter());
app.use('/likes', authenticate, createLikesRouter());
app.use('/comments', createCommentsRouter());

app.use('/', createEmailRouter());
if (config.nodeEnv !== 'production') app.use('/dev', createDevRouter());
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