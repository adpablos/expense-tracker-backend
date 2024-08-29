import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import {Container} from 'inversify';
import {errorHandler} from './middleware/errorHandler';
import {AppError} from './utils/AppError';
import setupSwagger from "./swagger";
import expenseRoutes from './routes/expenseRoutes';
import categoryRoutes from './routes/categoryRoutes';
import subcategoryRoutes from './routes/subcategoryRoutes';
import userRoutes from "./routes/userRoutes";
import householdRoutes from "./routes/householdRoutes";
import authHelperRoutes from "./routes/authHelperRoutes";

export interface AppRoutes {
    main: { [key: string]: express.Router };
    dev?: { [key: string]: express.Router };
}

export function createApp(container: Container): express.Application {
    const app = express();

    const allowedOrigins = [
        'https://expense-tracker-pwa-eta.vercel.app', // Remote deployment
        'http://localhost:3002', // local development
    ];

    const corsOptions = {
        origin: (origin: string | undefined, callback: Function) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: 'GET,POST,PUT,DELETE',
        allowedHeaders: 'Content-Type,Authorization'
    };

    app.use(cors(corsOptions));
    app.use(express.json());

    setupSwagger(app);

    const routes: AppRoutes = {
        main: {
            '/api/expenses': expenseRoutes(container),
            '/api/categories': categoryRoutes(container),
            '/api/subcategories': subcategoryRoutes(container),
            '/api/users': userRoutes(container),
            '/api/households': householdRoutes(container),
        },
        dev: {
            '/auth-help': authHelperRoutes
        }
    };

    // Attach main routes
    Object.entries(routes.main).forEach(([path, router]) => {
        app.use(path, router);
    });

    // Attach development/test routes if they exist and we're in the right environment
    if (routes.dev && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
        Object.entries(routes.dev).forEach(([path, router]) => {
            app.use(path, router);
        });
    }

    // Middleware to handle not found routes
    app.use((req, res, next) => {
        next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
    });

    // Error handler Middleware
    app.use(errorHandler);

    return app;
}