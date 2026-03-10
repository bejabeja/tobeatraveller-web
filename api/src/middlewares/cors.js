import cors from 'cors';
import config from '../config/config.js';

const ACCEPTED_ORIGINS = [config.originOne];
export const corsMiddleware = ({ acceptedOrigins = ACCEPTED_ORIGINS } = {}) =>
    cors({
        origin: (origin, callback) => {
            if (acceptedOrigins.includes(origin)) {
                return callback(null, true);
            }
            if (!origin) {
                return callback(null, true);
            }
            return callback(new Error('CORS policy error'));
        },
        credentials: true,
    });   