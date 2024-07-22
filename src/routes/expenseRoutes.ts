import express from 'express';
import {
    getExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    uploadExpense
} from '../controllers/expenseController';
import multer from 'multer';
import path from "path";
import {AppError} from "../utils/AppError";

const router = express.Router();
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
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
 *     tags: [Expenses]
 *     summary: Retrieve all expenses
 *     description: Get a detailed list of all recorded expenses, including description, amount, category, subcategory, and date.
 *     responses:
 *       200:
 *         description: A list of expenses.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expense'
 */
router.get('/', getExpenses);

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Create a new expense
 *     description: Record a new expense entry. Each expense must include a description, amount, category, subcategory, and date.
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
 *               - date
 *             properties:
 *               description:
 *                 type: string
 *                 description: A brief description of the expense.
 *               amount:
 *                 type: number
 *                 description: The monetary amount of the expense.
 *               category:
 *                 type: string
 *                 description: The category under which this expense falls.
 *               subcategory:
 *                 type: string
 *                 description: The subcategory under which this expense falls.
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date when the expense was incurred.
 *     responses:
 *       201:
 *         description: The expense was successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 */
router.post('/', addExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     tags: [Expenses]
 *     summary: Update an existing expense
 *     description: Modify the details of an existing expense by its ID. You can change the description, amount, category, subcategory, and date.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the expense.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 description: A brief description of the expense.
 *               amount:
 *                 type: number
 *                 description: The monetary amount of the expense.
 *               category:
 *                 type: string
 *                 description: The category under which this expense falls.
 *               subcategory:
 *                 type: string
 *                 description: The subcategory under which this expense falls.
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date when the expense was incurred.
 *     responses:
 *       200:
 *         description: The expense was successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       404:
 *         description: The expense with the specified ID was not found.
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
