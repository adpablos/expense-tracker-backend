import swaggerJsdoc from 'swagger-jsdoc';
import {Application} from 'express';
import swaggerUi from 'swagger-ui-express';

export const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Expense Tracker API',
            version: '1.0.0',
            description: 'The Expense Tracker API provides endpoints for managing your personal finances. With this API, you can manage expenses, categories, and subcategories, as well as upload receipts and audio logs. A key feature of the API is the use of AI to process uploaded documents (images or audio files) to automatically recognize and log expenses, enhancing the user experience by simplifying data entry.',
        },
        components: {
            schemas: {
                Category: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the category',
                        },
                        name: {
                            type: 'string',
                            description: 'The name of the category',
                        },
                    },
                },
                Subcategory: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the subcategory',
                        },
                        name: {
                            type: 'string',
                            description: 'The name of the subcategory',
                        },
                        categoryId: {
                            type: 'string',
                            description: 'The ID of the category this subcategory belongs to',
                        },
                    },
                },
                Expense: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the expense',
                            example: '1d311a67-3bf8-438b-a296-4e8b730268ae'
                        },
                        description: {
                            type: 'string',
                            description: 'A brief description of the expense',
                            example: 'Compra en supermercado'
                        },
                        amount: {
                            type: 'number',
                            description: 'The monetary amount of the expense',
                            example: 75.00
                        },
                        category: {
                            type: 'string',
                            description: 'The category under which this expense falls',
                            example: 'Alimentación'
                        },
                        subcategory: {
                            type: 'string',
                            description: 'The subcategory under which this expense falls',
                            example: 'Supermercado'
                        },
                        expenseDatetime: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the expense was incurred',
                            example: '2024-08-09T13:24:00-04:00'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the expense record was created',
                            example: '2024-08-09T14:30:00Z'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the expense record was last updated',
                            example: '2024-08-09T14:45:00Z'
                        }
                    },
                    required: ['description', 'amount', 'category', 'expenseDatetime']
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'],
};


const specs = swaggerJsdoc(options);

const setupSwagger = (app: Application) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};

export default setupSwagger;