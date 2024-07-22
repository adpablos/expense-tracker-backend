import express from 'express';
import cors from 'cors';
import expenseRoutes from './routes/expenseRoutes';
import categoryRoutes from './routes/categoryRoutes';
import subcategoryRoutes from './routes/subcategoryRoutes';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import setupSwagger from "./swagger";

const app = express();

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