import cors from 'cors';
import config from '../config/config.js';

const getAcceptedOrigins = () => [config.originOne, config.originTwo].filter(Boolean);

export const corsMiddleware = ({ acceptedOrigins } = {}) =>
    cors({
        origin: (origin, callback) => {
            const allowed = acceptedOrigins ?? getAcceptedOrigins();
            if (!origin) return callback(null, true);
            if (allowed.includes(origin)) return callback(null, true);
            if (config.nodeEnv === 'development' && origin?.includes('localhost')) return callback(null, true);
            return callback(new Error('CORS policy error'));
        },
        credentials: true,
    });