import express from 'express';
import {addExpense, deleteExpense, getExpenses, updateExpense, uploadExpense} from '../controllers/expenseController';
import multer from 'multer';
import path from "path";
import {AppError} from "../utils/AppError";
import requestLogger from "../middleware/requestLogger";
import responseLogger from "../middleware/responseLogger";

const router = express.Router();
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

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: API for managing expenses
 */

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     tags:
 *       - Expenses
 *     summary: Retrieve all expenses
 *     description: Get a detailed list of all recorded expenses, with optional filters and pagination.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-08-09T00:00:00Z"
 *         description: The start date to filter expenses (ISO 8601 format).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-08-09T23:59:59Z"
 *         description: The end date to filter expenses (ISO 8601 format).
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category.
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Filter by subcategory.
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         description: Filter by amount.
 *       - in: query
 *         name: description
 *         schema:
 *           type: string
 *         description: Filter by description (partial match).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number for pagination (must be a positive integer).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of expenses per page (must be a positive integer).
 *     responses:
 *       200:
 *         description: A list of expenses with pagination details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   description: The current page number.
 *                 totalPages:
 *                   type: integer
 *                   description: The total number of pages.
 *                 nextPage:
 *                   type: integer
 *                   nullable: true
 *                   description: The next page number, if available.
 *                 totalItems:
 *                   type: integer
 *                   description: The total number of items.
 *                 expenses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Expense'
 */
router.get('/', getExpenses);

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Add a new expense
 *     description: Adds a new expense to the system with the given details.
 *     tags:
 *       - Expenses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Compra en supermercado"
 *               amount:
 *                 type: number
 *                 example: 75.00
 *               category:
 *                 type: string
 *                 example: "Alimentación"
 *               subcategory:
 *                 type: string
 *                 example: "Supermercado"
 *               expenseDatetime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-08-09T13:24:00-04:00"
 *     responses:
 *       201:
 *         description: Expense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 description:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 category:
 *                   type: string
 *                 subcategory:
 *                   type: string
 *                 expenseDatetime:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid expense datetime format. Please provide the datetime in ISO 8601 format, such as '2024-08-09T14:30:00Z' or '2024-08-09T14:30:00-04:00'."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error creating expense"
 */
router.post('/', addExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update an existing expense
 *     description: Updates the details of an existing expense by its ID.
 *     tags:
 *       - Expenses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique ID of the expense to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Compra en supermercado"
 *               amount:
 *                 type: number
 *                 example: 75.00
 *               category:
 *                 type: string
 *                 example: "Alimentación"
 *               subcategory:
 *                 type: string
 *                 example: "Supermercado"
 *               expense_datetime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-08-09T13:24:00-04:00"
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 description:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 category:
 *                   type: string
 *                 subcategory:
 *                   type: string
 *                 expense_datetime:
 *                   type: string
 *                   format: date-time
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid expense datetime format. Please provide the datetime in ISO 8601 format, such as '2024-08-09T14:30:00Z' or '2024-08-09T14:30:00-04:00'."
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Expense not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error updating expense"
 */
router.put('/:id', updateExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
 *     description: Remove an existing expense by its ID. Note that this action cannot be undone.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the expense.
 *     responses:
 *       204:
 *         description: The expense was successfully deleted.
 *       404:
 *         description: The expense with the specified ID was not found.
 */
router.delete('/:id', deleteExpense);

/**
 * @swagger
 * /api/expenses/upload:
 *   post:
 *     tags: [Expenses]
 *     summary: Upload an expense file (image or audio) to log an expense using AI
 *     description: Upload an image or audio file to create a new expense entry. The file should be either an image (jpeg, jpg, png, webp, gif) or audio (flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm). The AI processes the uploaded file to automatically recognize and log the expense details, making data entry quick and effortless.
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image or audio file to upload.
 *                 required: true
 *     responses:
 *       200:
 *         description: The expense was successfully logged by the AI.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Expense logged successfully by AI.
 *                 expense:
 *                   type: object
 *                   $ref: '#/components/schemas/Expense'
 *       400:
 *         description: No file uploaded or unsupported file type.
 *       500:
 *         description: Error processing the file.
 */
router.post('/upload', upload.single('file'), uploadExpense);

export default router;
