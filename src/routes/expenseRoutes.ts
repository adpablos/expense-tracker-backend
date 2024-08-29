import express from 'express';
import {Container} from 'inversify';
import {ExpenseController} from '../controllers/expenseController';
import multer from 'multer';
import path from "path";
import {AppError} from "../utils/AppError";
import requestLogger from "../middleware/requestLogger";
import responseLogger from "../middleware/responseLogger";
import {attachUser, authMiddleware} from '../middleware/authMiddleware';
import {ensureHouseholdSelected, setCurrentHousehold} from "../middleware/householdMiddleware";
import {HouseholdService} from "../services/householdService";
import {TYPES} from "../types";

export default function (container: Container) {
    const router = express.Router();
    const expenseController = container.get<ExpenseController>(TYPES.ExpenseController);
    const householdService = container.get<HouseholdService>(TYPES.HouseholdService);
    
    const upload = multer({
        dest: 'uploads/',
        limits: {fileSize: 5 * 1024 * 1024}, // 5MB max file size
        fileFilter: (req, file, cb) => {
            const fileTypes = /jpeg|jpg|png|webp|gif|flac|m4a|mp3|mp4|mpeg|mpga|oga|ogg|wav|webm/;
            const mimetype = fileTypes.test(file.mimetype);
            const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new AppError('Unsupported file type', 400));
            }
        }
    });

    router.use(requestLogger);
    router.use(responseLogger);
    router.use(authMiddleware);
    router.use(attachUser);
    router.use(setCurrentHousehold(householdService));
    router.use(ensureHouseholdSelected);

    /**
     * @swagger
     * tags:
     *   name: Expenses
     *   description: Expense management and tracking
     */

    /**
     * @swagger
     * /api/expenses:
     *   get:
     *     summary: Retrieve all expenses
     *     tags: [Expenses]
     *     description: |
     *       Fetches a detailed list of all recorded expenses for the specified household or the user's default household.
     *       Supports pagination and various filter options to narrow down the results.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: header
     *         name: X-Household-Id
     *         schema:
     *           type: string
     *         required: false
     *         description: The ID of the household to fetch expenses for. If not provided, the user's default household will be used.
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date-time
     *         description: The start date to filter expenses (inclusive, ISO 8601 format)
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date-time
     *         description: The end date to filter expenses (inclusive, ISO 8601 format)
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *         description: Filter expenses by category name
     *       - in: query
     *         name: subcategory
     *         schema:
     *           type: string
     *         description: Filter expenses by subcategory name
     *       - in: query
     *         name: amount
     *         schema:
     *           type: number
     *         description: Filter expenses by exact amount
     *       - in: query
     *         name: description
     *         schema:
     *           type: string
     *         description: Filter expenses by description (partial match)
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *         description: The page number for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 10
     *         description: The number of expenses per page
     *     responses:
     *       200:
     *         description: A list of expenses with pagination details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 expenses:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Expense'
     *                 page:
     *                   type: integer
     *                 totalPages:
     *                   type: integer
     *                 totalItems:
     *                   type: integer
     *       400:
     *         description: Bad request - invalid query parameters or no default household found
     *       401:
     *         description: Unauthorized - user is not authenticated
     *       403:
     *         description: Forbidden - user does not have access to the specified household
     *       500:
     *         description: Server error - failed to retrieve expenses
     */
    router.get('/', expenseController.getExpenses);

    /**
     * @swagger
     * /api/expenses:
     *   post:
     *     summary: Add a new expense
     *     tags: [Expenses]
     *     description: |
     *       Adds a new expense to the system for the specified household or the user's default household.
     *       The expense must be associated with a valid category and subcategory.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: header
     *         name: X-Household-Id
     *         schema:
     *           type: string
     *         required: false
     *         description: The ID of the household to add the expense to. If not provided, the user's default household will be used.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - description
     *               - amount
     *               - category
     *               - subcategory
     *               - expenseDatetime
     *             properties:
     *               description:
     *                 type: string
     *                 description: A brief description of the expense
     *               amount:
     *                 type: number
     *                 format: float
     *                 description: The amount of the expense (must be positive)
     *               category:
     *                 type: string
     *                 description: The name of the category for this expense
     *               subcategory:
     *                 type: string
     *                 description: The name of the subcategory for this expense
     *               expenseDatetime:
     *                 type: string
     *                 format: date-time
     *                 description: The date and time when the expense occurred (ISO 8601 format)
     *     responses:
     *       201:
     *         description: Expense successfully created
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Expense'
     *       400:
     *         description: Bad request - invalid input data or no default household found
     *       401:
     *         description: Unauthorized - user is not authenticated
     *       403:
     *         description: Forbidden - user does not have access to the specified household
     *       404:
     *         description: Not found - specified category or subcategory does not exist
     *       500:
     *         description: Server error - failed to create expense
     */
    router.post('/', expenseController.addExpense);

    /**
     * @swagger
     * /api/expenses/{id}:
     *   put:
     *     summary: Update an existing expense
     *     tags: [Expenses]
     *     description: |
     *       Updates the details of an existing expense by its ID within a specific household or the user's default household.
     *       All fields of the expense can be modified.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The unique ID of the expense to update
     *       - in: header
     *         name: X-Household-Id
     *         schema:
     *           type: string
     *         required: false
     *         description: The ID of the household the expense belongs to. If not provided, the user's default household will be used.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               description:
     *                 type: string
     *                 description: A brief description of the expense
     *               amount:
     *                 type: number
     *                 format: float
     *                 description: The amount of the expense (must be positive)
     *               category:
     *                 type: string
     *                 description: The name of the category for this expense
     *               subcategory:
     *                 type: string
     *                 description: The name of the subcategory for this expense
     *               expenseDatetime:
     *                 type: string
     *                 format: date-time
     *                 description: The date and time when the expense occurred (ISO 8601 format)
     *     responses:
     *       200:
     *         description: Expense successfully updated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Expense'
     *       400:
     *         description: Bad request - invalid input data or no default household found
     *       401:
     *         description: Unauthorized - user is not authenticated
     *       403:
     *         description: Forbidden - user does not have access to the specified household
     *       404:
     *         description: Not found - the specified expense, category, or subcategory does not exist
     *       500:
     *         description: Server error - failed to update expense
     */
    router.put('/:id', expenseController.updateExpense);

    /**
     * @swagger
     * /api/expenses/{id}:
     *   delete:
     *     summary: Delete an expense
     *     tags: [Expenses]
     *     description: |
     *       Removes an existing expense by its ID from a specific household or the user's default household.
     *       This action cannot be undone.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The unique ID of the expense to delete
     *       - in: header
     *         name: X-Household-Id
     *         schema:
     *           type: string
     *         required: false
     *         description: The ID of the household the expense belongs to. If not provided, the user's default household will be used.
     *     responses:
     *       204:
     *         description: Expense successfully deleted
     *       400:
     *         description: Bad request - invalid expense ID or no default household found
     *       401:
     *         description: Unauthorized - user is not authenticated
     *       403:
     *         description: Forbidden - user does not have access to the specified household
     *       404:
     *         description: Not found - the specified expense does not exist in the household
     *       500:
     *         description: Server error - failed to delete expense
     */
    router.delete('/:id', expenseController.deleteExpense);

    /**
     * @swagger
     * /api/expenses/upload:
     *   post:
     *     summary: Upload and process an expense file
     *     tags: [Expenses]
     *     description: |
     *       Uploads an image or audio file to create a new expense entry using AI processing.
     *       The file should be either an image (jpeg, jpg, png, webp, gif) or audio (flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm).
     *       The AI processes the uploaded file to automatically recognize and log the expense details, making data entry quick and effortless.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: header
     *         name: X-Household-Id
     *         schema:
     *           type: string
     *         required: false
     *         description: The ID of the household to add the expense to. If not provided, the user's default household will be used.
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               file:
     *                 type: string
     *                 format: binary
     *                 description: The image or audio file to upload and process
     *     responses:
     *       200:
     *         description: Expense successfully logged by AI
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Expense logged successfully.
     *                 expense:
     *                   $ref: '#/components/schemas/Expense'
     *       400:
     *         description: Bad request - no file uploaded, unsupported file type, or no default household found
     *       401:
     *         description: Unauthorized - user is not authenticated
     *       403:
     *         description: Forbidden - user does not have access to the specified household
     *       422:
     *         description: Unprocessable Entity - file was processed but no valid expense could be identified
     *       500:
     *         description: Server error - failed to process the file or create the expense
     */
    router.post('/upload', upload.single('file'), expenseController.uploadExpense);

    return router;
}