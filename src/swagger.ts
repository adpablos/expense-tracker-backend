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
            schemas: {
                Category: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the category'
                        },
                        name: {
                            type: 'string',
                            description: 'The name of the category'
                        },
                        householdId: {
                            type: 'string',
                            description: 'The ID of the household this category belongs to'
                        }
                    }
                },
                Subcategory: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the subcategory'
                        },
                        name: {
                            type: 'string',
                            description: 'The name of the subcategory'
                        },
                        categoryId: {
                            type: 'string',
                            description: 'The ID of the parent category'
                        },
                        householdId: {
                            type: 'string',
                            description: 'The ID of the household this subcategory belongs to'
                        }
                    }
                },
                Expense: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the expense'
                        },
                        description: {
                            type: 'string',
                            description: 'A brief description of the expense'
                        },
                        amount: {
                            type: 'number',
                            description: 'The amount of the expense'
                        },
                        category: {
                            type: 'string',
                            description: 'The category of the expense'
                        },
                        subcategory: {
                            type: 'string',
                            description: 'The subcategory of the expense'
                        },
                        expenseDatetime: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the expense occurred'
                        },
                        householdId: {
                            type: 'string',
                            description: 'The ID of the household this expense belongs to'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the expense was created'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the expense was last updated'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the user'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'The email address of the user'
                        },
                        name: {
                            type: 'string',
                            description: 'The name of the user'
                        },
                        authProviderId: {
                            type: 'string',
                            description: 'The ID provided by the authentication provider'
                        },
                        households: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'An array of household IDs the user belongs to'
                        }
                    }
                },
                Household: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the household'
                        },
                        name: {
                            type: 'string',
                            description: 'The name of the household'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the household was created'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the household was last updated'
                        }
                    }
                },
                HouseholdMember: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The unique identifier for the household member relationship'
                        },
                        householdId: {
                            type: 'string',
                            description: 'The ID of the household'
                        },
                        userId: {
                            type: 'string',
                            description: 'The ID of the user'
                        },
                        role: {
                            type: 'string',
                            enum: ['owner', 'member'],
                            description: 'The role of the user in the household'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'invited', 'removed'],
                            description: 'The status of the user in the household'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the member was added to the household'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'The date and time when the member\'s status was last updated'
                        }
                    }
                }
            }
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