import request from 'supertest';
import {Pool, QueryResult, QueryResultRow} from 'pg';
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import { CategoryService } from '../../../services/categoryService';
import { NotificationService } from '../../../services/external/notificationService';

// Mock user and household Ids
const mockUserId = 'd59c6410-45d8-4646-84be-6a24a14de81c';
const mockHouseholdId = 'e70e8400-c09c-4a77-8f08-6f8f9f7b6f5d';

// Mocks
jest.mock('../../../config/db', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        connect: jest.fn().mockResolvedValue({
            query: jest.fn(),
            release: jest.fn(),
        }),
    },
}));

jest.mock('../../../middleware/authMiddleware', () => ({
    authMiddleware: jest.fn((req, res, next) => next()),
    attachUser: jest.fn((req, res, next) => {
        req.user = {
            id: mockUserId,
            email: 'test@example.com',
            name: 'Test User',
            authProviderId: 'auth0|123456',
        };
        req.currentHouseholdId = mockHouseholdId;
        next();
    }),
}));

jest.mock('../../../middleware/householdMiddleware', () => ({
    setCurrentHousehold: jest.fn((householdService) => (req: { headers: { [x: string]: string; }; user: { id: any; }; currentHouseholdId: string; }, res: {
        status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; };
    }, next: () => void) => {
        if (req.headers['x-household-id']) {
            householdService.userHasAccessToHousehold(req.user.id, req.headers['x-household-id'])
                .then((hasAccess: any) => {
                    if (hasAccess) {
                        req.currentHouseholdId = req.headers['x-household-id'] as string;
                        next();
                    } else {
                        res.status(403).json({ message: 'User does not have access to this household' });
                    }
                })
                .catch(next);
        } else {
            next();
        }
    }),
    ensureHouseholdSelected: jest.fn((req, res, next) => next()),
}));

jest.mock('../../../config/openaiConfig', () => ({
    __esModule: true,
    default: {
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Mocked response' } }]
                })
            }
        },
        audio: {
            transcriptions: {
                create: jest.fn().mockResolvedValue({ text: 'Mocked transcription' })
            }
        }
    }
}));

jest.mock('axios');

// Mock household service
const createMockHouseholdService = () => ({
    createHousehold: jest.fn().mockImplementation((household, user) => {
        if (user.email === 'existing@example.com') {
            const error: any = new Error('Duplicate entry: User or Household already exists');
            error.code = '23505';
            throw error;
        }
        return Promise.resolve({
            id: uuidv4(),
            name: household.name,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }),
    getUserHouseholds: jest.fn().mockResolvedValue([
        {
            id: uuidv4(),
            name: 'Mock Household 1',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: uuidv4(),
            name: 'Mock Household 2',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]),
    getHouseholdById: jest.fn().mockResolvedValue({
        id: uuidv4(),
        name: 'Mock Household',
        createdAt: new Date(),
        updatedAt: new Date()
    }),
    inviteMember: jest.fn().mockResolvedValue(undefined),
    acceptInvitation: jest.fn().mockResolvedValue(undefined),
    rejectInvitation: jest.fn().mockResolvedValue(undefined),
    getHouseholdMembers: jest.fn().mockResolvedValue([
        {
            id: uuidv4(),
            userId: uuidv4(),
            role: 'owner',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: uuidv4(),
            userId: uuidv4(),
            role: 'member',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]),
    removeMember: jest.fn().mockResolvedValue(undefined),
    isMember: jest.fn().mockResolvedValue(true),
    userHasAccessToHousehold: jest.fn().mockResolvedValue(true),
    getDefaultHouseholdForUser: jest.fn().mockResolvedValue({
        id: uuidv4(),
        name: 'Default Household',
        createdAt: new Date(),
        updatedAt: new Date()
    })
});

// Mock user service
const createMockUserService = () => ({
    getUserByAuthProviderId: jest.fn().mockResolvedValue({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        authProviderId: 'auth0|123456',
        households: [mockHouseholdId]
    }),
    updateUser: jest.fn().mockImplementation((id, updates) => {
        if (updates.email === 'existing@example.com') {
            const error: any = new Error('Duplicate key value violates unique constraint');
            error.code = '23505';
            throw error;
        }
        return Promise.resolve({
            id: id,
            email: updates.email || 'updated@example.com',
            name: updates.name || 'Updated User',
            authProviderId: 'auth0|123456',
            households: [mockHouseholdId]
        });
    }),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    createUser: jest.fn().mockImplementation((user) => {
        if (user.email === 'existing@example.com') {
            const error: any = new Error('Duplicate key value violates unique constraint');
            error.code = '23505';
            throw error;
        }
        return Promise.resolve({...user, id: uuidv4()});
    }),
    createUserWithHousehold: jest.fn().mockImplementation((user) => {
        if (user.email === 'existing@example.com') {
            const error: any = new Error('Duplicate key value violates unique constraint');
            error.code = '23505';
            throw error;
        }
        return Promise.resolve({
            user: {...user, id: uuidv4()},
            household: {id: uuidv4(), name: `${user.name}'s Household`, createdAt: new Date(), updatedAt: new Date()}
        });
    })
});

const mockUserService = createMockUserService();
const mockHouseholdService = createMockHouseholdService();

jest.mock('../../../services/userService', () => ({
    UserService: jest.fn().mockImplementation(() => mockUserService)
}));

jest.mock('../../../services/householdService', () => ({
    HouseholdService: jest.fn().mockImplementation(() => mockHouseholdService)
}));

jest.mock('../../../services/external/notificationService');

jest.mock('../../../services/categoryService');

const mockCategoryService = {
    updateCategory: jest.fn(),
};

const mockNotificationService = {
    notifyHouseholdMembers: jest.fn(),
};

(CategoryService as jest.MockedClass<typeof CategoryService>).mockImplementation(() => mockCategoryService as any);
(NotificationService as jest.MockedClass<typeof NotificationService>).mockImplementation(() => mockNotificationService as any);

// Define a mock type for the Pool object
interface MockPool extends Omit<Pool, 'query'> {
    query: jest.Mock<Promise<QueryResult<any>>>;
}

// Helper function to create mock QueryResults
export function createMockQueryResult<T extends QueryResultRow>(rows: T[], rowCount?: number): QueryResult<T> {
    return {
        rows,
        rowCount: rowCount ?? rows.length,
        command: '',
        oid: 0,
        fields: []
    };
}

// Import app and other necessary modules after all mocks are set up
import app from "../../../app";
import {Expense} from "../../../models/Expense";

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Integration Tests', () => {
    let mockPool: MockPool;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPool = require('../../../config/db').default as MockPool;

        // Config Axios mock for OAuth token endpoint
        mockedAxios.post.mockResolvedValue({
            data: {
                access_token: 'mocked_token',
                token_type: 'Bearer',
                expires_in: 86400
            }
        });
    });

    describe('POST /auth-help/get-token', () => {
        it('should return a token when valid credentials are provided', async () => {
            const validCredentials = {
                email: 'test@example.com',
                password: 'validPassword123'
            };

            const response = await request(app)
                .post('/auth-help/get-token')
                .send(validCredentials);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('access_token', 'mocked_token');
            expect(response.body).toHaveProperty('token_type', 'Bearer');
            expect(response.body).toHaveProperty('expires_in', 86400);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/oauth/token'),
                expect.objectContaining({
                    grant_type: 'password',
                    username: validCredentials.email,
                    password: validCredentials.password,
                })
            );
        });

        it('should return 401 when invalid credentials are provided', async () => {
            const invalidCredentials = {
                email: 'test@example.com',
                password: 'wrongPassword'
            };

            mockedAxios.post.mockRejectedValueOnce({
                response: {
                    status: 401,
                    data: { error: 'invalid_grant', error_description: 'Wrong email or password.' }
                }
            });

            const response = await request(app)
                .post('/auth-help/get-token')
                .send(invalidCredentials);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message', 'Invalid credentials');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/oauth/token'),
                expect.objectContaining({
                    grant_type: 'password',
                    username: invalidCredentials.email,
                    password: invalidCredentials.password,
                })
            );
        });
    });

    describe('GET /api/users/me', () => {
        it('should return the current user', async () => {
            const response = await request(app)
                .get('/api/users/me')
                .set('Authorization', 'Bearer mock_token');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                id: mockUserId,
                email: 'test@example.com',
                name: 'Test User',
                authProviderId: 'auth0|123456',
            });
        });

        it('should return 404 if user not found', async () => {
            mockUserService.getUserByAuthProviderId.mockResolvedValueOnce(null);

            const response = await request(app)
                .get('/api/users/me')
                .set('Authorization', 'Bearer mock_token');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message', 'User not found');
        });
    });

    describe('POST /api/users', () => {
        it('should create a new user', async () => {
            const newUser = {
                email: 'newuser@example.com',
                name: 'New User',
                auth_provider_id: 'auth0|newuser123',
            };

            mockPool.query
                .mockResolvedValueOnce(createMockQueryResult([{ id: uuidv4() }])) // User creation
                .mockResolvedValueOnce(createMockQueryResult([{ id: uuidv4() }])) // Household creation
                .mockResolvedValueOnce(createMockQueryResult([{ id: uuidv4() }])); // Household member creation

            const response = await request(app)
                .post('/api/users')
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body.user).toMatchObject({
                id: expect.any(String),
                email: newUser.email,
                name: newUser.name,
                authProviderId: newUser.auth_provider_id,
            });
            expect(response.body.household).toBeDefined();
        });

        it('should return 409 if user already exists', async () => {
            const existingUser = {
                email: 'existing@example.com',
                name: 'Existing User',
                auth_provider_id: 'auth0|existing123',
            };

            const response = await request(app)
                .post('/api/users')
                .send(existingUser);

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('message', 'Duplicate entry: User or Household already exists');
        });
    });

    describe('GET /api/users/me/households', () => {
        it('should return all households for the current user', async () => {
            const mockHouseholds = [
                { id: uuidv4(), name: 'Home', createdAt: new Date(), updatedAt: new Date() },
                { id: uuidv4(), name: 'Work', createdAt: new Date(), updatedAt: new Date() },
            ];

            mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockHouseholds));

            const response = await request(app).get('/api/users/me/households');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('name', 'Mock Household 1');
            expect(response.body[1]).toHaveProperty('name', 'Mock Household 2');
        });
    });

    describe('PUT /api/users/me', () => {
        it('should update the current user profile', async () => {
            const updatedUserData = {
                email: 'updated@example.com',
                name: 'Updated User',
            };

            const mockUpdatedUser = {
                id: uuidv4(),
                ...updatedUserData,
                authProviderId: 'auth0|123456',
            };

            mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockUpdatedUser]));

            const response = await request(app)
                .put('/api/users/me')
                .send(updatedUserData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(updatedUserData);
        });

        it('should return 409 when trying to update email to one that already exists', async () => {
            const updatedUserData = {
                email: 'existing@example.com',
                name: 'Updated User',
            };

            const response = await request(app)
                .put('/api/users/me')
                .send(updatedUserData)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('message', 'Email already in use');
        });
    });

    describe('DELETE /api/users/me', () => {
        it('should delete the current user account', async () => {
            mockPool.query.mockResolvedValueOnce(createMockQueryResult([], 1)); // Mock successful deletion

            const response = await request(app).delete('/api/users/me');

            expect(response.status).toBe(204);
        });
    });

    describe('GET /api/categories', () => {
        it('should return 403 when user does not have access to the specified household', async () => {
            const householdId = uuidv4();

            // Simular que el usuario no tiene acceso al hogar
            mockHouseholdService.userHasAccessToHousehold.mockResolvedValueOnce(false);

            const response = await request(app)
                .get('/api/categories')
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message', 'User does not have access to this household');
        });
    });

    describe('PUT /api/categories/{id}', () => {
        it('should update an existing category', async () => {
            const categoryId = uuidv4();
            const householdId = uuidv4();
            const updateData = {
                name: 'Updated Category Name'
            };

            const mockUpdatedCategory = {
                id: categoryId,
                name: updateData.name,
                householdId: householdId
            };

            mockCategoryService.updateCategory.mockResolvedValue(mockUpdatedCategory);

            const response = await request(app)
                .put(`/api/categories/${categoryId}`)
                .send(updateData)
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(categoryId, updateData.name, householdId);
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockUpdatedCategory);
        });

        it('should return 404 when category is not found', async () => {
            const nonExistentCategoryId = uuidv4();
            const householdId = uuidv4();
            const updateData = {
                name: 'Updated Category Name'
            };

            mockCategoryService.updateCategory.mockResolvedValue(null);

            const response = await request(app)
                .put(`/api/categories/${nonExistentCategoryId}`)
                .send(updateData)
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(nonExistentCategoryId, updateData.name, householdId);
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message', 'Category not found');
        });
    });

    describe('GET /api/subcategories', () => {
        it('should retrieve all subcategories for a household', async () => {
            const householdId = uuidv4();
            const mockSubcategories = [
                { id: uuidv4(), name: 'Subcategory 1', category_id: uuidv4(), household_id: householdId },
                { id: uuidv4(), name: 'Subcategory 2', category_id: uuidv4(), household_id: householdId }
            ];

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockSubcategories });

            const response = await request(app)
                .get('/api/subcategories')
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('name', 'Subcategory 1');
            expect(response.body[1]).toHaveProperty('name', 'Subcategory 2');
        });
    });

    describe('POST /api/subcategories', () => {
        it('should create a new subcategory', async () => {
            const newSubcategory = {
                name: 'New Subcategory',
                categoryId: uuidv4()
            };

            const mockCreatedSubcategory = {
                id: uuidv4(),
                ...newSubcategory,
                householdId: uuidv4()
            };

            mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockCreatedSubcategory]));

            const response = await request(app)
                .post('/api/subcategories')
                .send(newSubcategory)
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', mockCreatedSubcategory.householdId);

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject(mockCreatedSubcategory);
        });

        it('should return 404 when parent category does not exist', async () => {
            const newSubcategory = {
                name: 'New Subcategory',
                categoryId: uuidv4()
            };

            mockPool.query.mockRejectedValueOnce(new Error('Parent category not found'));

            const response = await request(app)
                .post('/api/subcategories')
                .send(newSubcategory)
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', uuidv4());

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message', 'Parent category not found');
        });
    });

    describe('PUT /api/subcategories/{id}', () => {
        it('should update an existing subcategory', async () => {
            const subcategoryId = uuidv4();
            const householdId = uuidv4();
            const updateData = {
                name: 'Updated Subcategory',
                categoryId: uuidv4()
            };

            const mockUpdatedSubcategory = {
                id: subcategoryId,
                ...updateData,
                household_id: householdId
            };

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedSubcategory] });

            const response = await request(app)
                .put(`/api/subcategories/${subcategoryId}`)
                .send(updateData)
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(mockUpdatedSubcategory);
        });
    });

    describe('DELETE /api/subcategories/{id}', () => {
        it('should delete a subcategory', async () => {
            const subcategoryId = uuidv4();
            const householdId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            const response = await request(app)
                .delete(`/api/subcategories/${subcategoryId}`)
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(response.status).toBe(204);
        });
    });

    describe('GET /api/expenses', () => {
        it('should return all expenses for a household with pagination', async () => {
            const mockExpenses = [
                { id: uuidv4(), description: 'Expense 1', amount: 100, category: 'Food', subcategory: 'Groceries', expenseDatetime: new Date().toISOString() },
                { id: uuidv4(), description: 'Expense 2', amount: 200, category: 'Transport', subcategory: 'Gas', expenseDatetime: new Date().toISOString() },
            ];

            mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockExpenses));
            mockPool.query.mockResolvedValueOnce(createMockQueryResult([{ count: '10' }]));

            const response = await request(app).get('/api/expenses?page=1&limit=10');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('expenses');
            expect(response.body.expenses).toHaveLength(2);
            expect(response.body).toHaveProperty('totalItems', 10);
            expect(response.body).toHaveProperty('page', 1);
            expect(response.body).toHaveProperty('totalPages', 1);
        });

        it('should filter expenses based on query parameters', async () => {
            const queryParams = {
                startDate: '2023-01-01T00:00:00Z',
                endDate: '2023-12-31T23:59:59Z',
                category: 'Food',
                subcategory: 'Groceries',
                page: 1,
                limit: 10
            };

            const mockExpenses = [
                {
                    id: uuidv4(),
                    description: 'Grocery shopping',
                    amount: 50.00,
                    category: 'Food',
                    subcategory: 'Groceries',
                    expenseDatetime: '2023-06-15T14:30:00Z'
                },
                {
                    id: uuidv4(),
                    description: 'Gas station',
                    amount: 30.50,
                    category: 'Transport',
                    subcategory: 'Fuel',
                    expenseDatetime: '2023-06-16T10:15:00Z'
                },
                {
                    id: uuidv4(),
                    description: 'Movie tickets',
                    amount: 25.00,
                    category: 'Entertainment',
                    subcategory: 'Cinema',
                    expenseDatetime: '2023-06-17T20:00:00Z'
                }
            ];

            const mockTotalCount = { count: '15' };

            mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockExpenses));
            mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockTotalCount]));

            const response = await request(app)
                .get('/api/expenses')
                .query(queryParams)
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', uuidv4());

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('expenses');
            expect(response.body.expenses).toHaveLength(mockExpenses.length);
            expect(response.body).toHaveProperty('totalItems', 15);
            expect(response.body).toHaveProperty('page', 1);
            expect(response.body).toHaveProperty('totalPages', 2);
        });
    });

    describe('POST /api/expenses', () => {
        it('should create a new expense', async () => {
            const newExpense = {
                description: 'Test Expense',
                amount: 100,
                category: 'Food',
                subcategory: 'Groceries',
                expenseDatetime: new Date().toISOString(),
            };

            const mockCreatedExpense = {
                ...newExpense,
                id: uuidv4(),
                householdId: uuidv4(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockCreatedExpense]));

            const response = await request(app)
                .post('/api/expenses')
                .send(newExpense);

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject(mockCreatedExpense);
        });
    });

    describe('POST /api/expenses/upload', () => {
        it('should process an uploaded image and create an expense', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();
            const mockFile = Buffer.from('mock image content');
            const mockExpense = new Expense('Test expense', 100, 'Food', 'Groceries', householdId, new Date());

            // Mock for successful image processing
            jest.spyOn(require('../../../services/external/openaiService'), 'processReceipt')
                .mockResolvedValue(mockExpense);

            const response = await request(app)
                .post('/api/expenses/upload')
                .attach('file', mockFile, 'receipt.jpg')
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Expense logged successfully.');
            expect(response.body.expense).toMatchObject({
                description: mockExpense.description,
                amount: mockExpense.amount,
                category: mockExpense.category,
                subcategory: mockExpense.subcategory
            });
        });

        it('should process an uploaded audio file and create an expense', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();
            const mockFile = Buffer.from('mock audio content');
            const mockExpense = new Expense('Audio expense', 50, 'Transportation', 'Fuel', householdId, new Date());

            // Mocks para el procesamiento de audio
            jest.spyOn(require('../../../services/external/openaiService'), 'transcribeAudio')
                .mockResolvedValue('Transcribed audio content');
            jest.spyOn(require('../../../services/external/openaiService'), 'analyzeTranscription')
                .mockResolvedValue(mockExpense);

            const response = await request(app)
                .post('/api/expenses/upload')
                .attach('file', mockFile, 'expense.mp3')
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Expense logged successfully.');
            expect(response.body.expense).toMatchObject({
                description: mockExpense.description,
                amount: mockExpense.amount,
                category: mockExpense.category,
                subcategory: mockExpense.subcategory
            });
        });

        it('should return 422 when no valid expense could be identified from the file', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();
            const mockFile = Buffer.from('mock content');

            // Mock para simular que no se pudo identificar un gasto válido
            jest.spyOn(require('../../../services/external/openaiService'), 'processReceipt')
                .mockResolvedValue(null);

            const response = await request(app)
                .post('/api/expenses/upload')
                .attach('file', mockFile, 'invalid.jpg')
                .set('Authorization', 'Bearer mockToken')
                .set('X-Household-Id', householdId);

            expect(response.status).toBe(422);
            expect(response.body).toHaveProperty('message', 'No expense logged.');
            expect(response.body).toHaveProperty('details', 'The file was processed successfully, but no valid expense could be identified.');
        });
    });

    describe('PUT /api/expenses/:id', () => {
        it('should update an existing expense', async () => {
            const expenseId = uuidv4();
            const updatedExpenseData = {
                description: 'Updated Expense',
                amount: 150,
                category: 'Transport',
                subcategory: 'Fuel',
                expenseDatetime: new Date().toISOString(),
            };

            const mockUpdatedExpense = {
                id: expenseId,
                ...updatedExpenseData,
                householdId: uuidv4(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockUpdatedExpense]));

            const response = await request(app)
                .put(`/api/expenses/${expenseId}`)
                .send(updatedExpenseData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(mockUpdatedExpense);
        });
    });

    describe('DELETE /api/expenses/:id', () => {
        it('should delete an expense', async () => {
            const expenseId = uuidv4();

            mockPool.query.mockResolvedValueOnce(createMockQueryResult([], 1));

            const response = await request(app).delete(`/api/expenses/${expenseId}`);

            expect(response.status).toBe(204);
        });
    });

    describe('POST /api/households', () => {
        it('should create a new household', async () => {
            const newHousehold = {
                name: 'New Household'
            };

            const mockCreatedHousehold = {
                id: uuidv4(),
                ...newHousehold,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockCreatedHousehold]));

            const response = await request(app)
                .post('/api/households')
                .send(newHousehold)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject(mockCreatedHousehold);
        });

        it('should return 409 when a household with the same name already exists for the user', async () => {
            const existingHousehold = {
                name: 'Existing Household'
            };

            mockPool.query.mockRejectedValueOnce({ code: '23505' }); // Unique constraint violation

            const response = await request(app)
                .post('/api/households')
                .send(existingHousehold)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('message', 'A household with this name already exists for the user');
        });
    });

    describe('POST /api/households/{householdId}/invite', () => {
        it('should send an invitation to join a household', async () => {
            const householdId = uuidv4();
            const ownerId = uuidv4();
            const invitedUserId = uuidv4();

            // Mock to verify that the user is the owner of the household
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: ownerId, role: 'owner' }] });
            // Mock to verify the user is not a member anymore
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
            // Mock to create the invitation
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: uuidv4() }] });

            const response = await request(app)
                .post(`/api/households/${householdId}/invite`)
                .send({ invitedUserId })
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Invitation sent successfully');
        });

        it('should return 403 when the user is not the household owner', async () => {
            const householdId = uuidv4();
            const memberId = uuidv4();
            const invitedUserId = uuidv4();

            // Mock to simulate user not being the owner of the household
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: memberId, role: 'member' }] });

            const response = await request(app)
                .post(`/api/households/${householdId}/invite`)
                .send({ invitedUserId })
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message', 'You do not have permission to invite members');
        });
    });

    describe('POST /api/households/{householdId}/accept', () => {
        it('should accept an invitation to join a household', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            // Mock to update the invitation status
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: uuidv4() }] });

            const response = await request(app)
                .post(`/api/households/${householdId}/accept`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Invitation accepted successfully');
        });
    });

    describe('POST /api/households/{householdId}/reject', () => {
        it('should reject an invitation to join a household', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            // Mock to remove the invitation
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            const response = await request(app)
                .post(`/api/households/${householdId}/reject`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Invitation rejected successfully');
        });
    });

    describe('GET /api/households/{householdId}/members', () => {
        it('should retrieve all members of a household', async () => {
            const householdId = uuidv4();
            const mockMembers = [
                { id: uuidv4(), user_id: uuidv4(), role: 'owner', status: 'active' },
                { id: uuidv4(), user_id: uuidv4(), role: 'member', status: 'active' }
            ];

            // Mock to verify the household exists
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ exists: true }] });
            // Mock to retrieve the household members
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockMembers });

            const response = await request(app)
                .get(`/api/households/${householdId}/members`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('role', 'owner');
            expect(response.body[1]).toHaveProperty('role', 'member');
        });

        it('should return 403 when the user is not a member of the household', async () => {
            const householdId = uuidv4();

            // Mock to simulate user not being a member of the household
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get(`/api/households/${householdId}/members`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message', 'You do not have access to this household');
        });
    });

    describe('DELETE /api/households/{householdId}/members/{userId}', () => {
        it('should remove a member from a household', async () => {
            const householdId = uuidv4();
            const ownerId = uuidv4();
            const memberIdToRemove = uuidv4();

            // Mock to verify the user is the owner of the household
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'owner' }] });
            // Mock to remove the member
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            const response = await request(app)
                .delete(`/api/households/${householdId}/members/${memberIdToRemove}`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Member removed successfully');
        });

        it('should return 403 when the user is not the household owner', async () => {
            const householdId = uuidv4();
            const memberId = uuidv4();
            const memberIdToRemove = uuidv4();

            // Mock to simulate user not being the owner of the household
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'member' }] });

            const response = await request(app)
                .delete(`/api/households/${householdId}/members/${memberIdToRemove}`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message', 'You do not have permission to remove members');
        });
    });
});