import swaggerJsdoc from 'swagger-jsdoc';
import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

export const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Expense Tracker API',
            version: '1.0.0',
            description: 'The Expense Tracker API provides endpoints for managing your personal finances. With this API, you can manage expenses, categories, and subcategories, as well as upload receipts and audio logs. A key feature of the API is the use of AI to process uploaded documents (images or audio files) to automatically recognize and log expenses, enhancing the user experience by simplifying data entry.\n\n' +
                'Authentication:\n' +
                'This API uses OAuth 2.0 with JWT tokens for authentication. To use the API from Swagger UI:\n\n' +
                '1. Click on the "Authorize" button at the top of this page.\n' +
                '2. In the "Value" field, enter your JWT token in the format: Bearer <your_token>\n' +
                '3. Click "Authorize" to apply the token to all endpoints.\n\n' +
                'For development purposes, you can use the /auth-help/generate-token endpoint to generate a token.',
        },
        tags: [
            {
                name: 'Auth',
                description: 'Authentication related endpoints',
            },
            {
                name: 'Users',
                description: 'Endpoints for managing users',
            },
            {
                name: 'Households',
                description: 'Endpoints for managing households',
            },
            {
                name: 'Categories',
                description: 'Endpoints for managing expense categories',
            },
            {
                name: 'Subcategories',
                description: 'Endpoints for managing expense subcategories',
            },
            {
                name: 'Expenses',
                description: 'Endpoints for managing expenses',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app: Application) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    }));
};

export default setupSwagger;