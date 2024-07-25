import express from 'express';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import requestLogger from '../middleware/requestLogger';
import responseLogger from "../middleware/responseLogger";

const router = express.Router();

router.use(requestLogger);
router.use(responseLogger);

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: API for managing expense categories
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Retrieve all categories
 *     description: Fetch a comprehensive list of all available expense categories.
 *     responses:
 *       200:
 *         description: A list of categories.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/', getCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
 *     description: Add a new category to organize your expenses. Each category must have a unique name.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category.
 *     responses:
 *       201:
 *         description: The category was successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 */
router.post('/', addCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update an existing category
 *     description: Modify the details of an existing category by its ID. Only the name of the category can be changed.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the category.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the category.
 *     responses:
 *       200:
 *         description: The category was successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: The category with the specified ID was not found.
 */
router.put('/:id', updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     description: Remove an existing category by its ID. Note that this action cannot be undone.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the category.
 *     responses:
 *       204:
 *         description: The category was successfully deleted.
 *       404:
 *         description: The category with the specified ID was not found.
 */
router.delete('/:id', deleteCategory);

export default router;
