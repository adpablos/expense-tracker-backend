import express from 'express';
import cors from 'cors';
import expenseRoutes from './routes/expenseRoutes';
import categoryRoutes from './routes/categoryRoutes';
import subcategoryRoutes from './routes/subcategoryRoutes';
import {errorHandler} from './middleware/errorHandler';
import {AppError} from './utils/AppError';
import setupSwagger from "./swagger";

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

app.use(cors());
app.use(express.json());

setupSwagger(app);

app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);

// Middleware to handle not found routes
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handler Middleware
app.use(errorHandler);

export default app;