import express from 'express';
import { getSubcategories, addSubcategory, updateSubcategory, deleteSubcategory } from '../controllers/subcategoryController';
import requestLogger from "../middleware/requestLogger";
import responseLogger from "../middleware/responseLogger";

const router = express.Router();

router.use(requestLogger);
router.use(responseLogger);

/**
 * @swagger
 * tags:
 *   name: Subcategories
 *   description: API for managing expense subcategories
 */

/**
 * @swagger
 * /api/subcategories:
 *   get:
 *     tags: [Subcategories]
 *     summary: Retrieve all subcategories
 *     description: Fetch a comprehensive list of all available expense subcategories.
 *     responses:
 *       200:
 *         description: A list of subcategories.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subcategory'
 */
router.get('/', getSubcategories);

/**
 * @swagger
 * /api/subcategories:
 *   post:
 *     tags: [Subcategories]
 *     summary: Create a new subcategory
 *     description: Add a new subcategory to organize your expenses under a specific category. Each subcategory must have a unique name and a valid category ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the subcategory.
 *               categoryId:
 *                 type: string
 *                 description: The ID of the category this subcategory belongs to.
 *     responses:
 *       201:
 *         description: The subcategory was successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subcategory'
 */
router.post('/', addSubcategory);

/**
 * @swagger
 * /api/subcategories/{id}:
 *   put:
 *     tags: [Subcategories]
 *     summary: Update an existing subcategory
 *     description: Modify the details of an existing subcategory by its ID. Only the name and category ID can be changed.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the subcategory.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the subcategory.
 *               categoryId:
 *                 type: string
 *                 description: The ID of the category this subcategory belongs to.
 *     responses:
 *       200:
 *         description: The subcategory was successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subcategory'
 *       404:
 *         description: The subcategory with the specified ID was not found.
 */
router.put('/:id', updateSubcategory);

/**
 * @swagger
 * /api/subcategories/{id}:
 *   delete:
 *     tags: [Subcategories]
 *     summary: Delete a subcategory
 *     description: Remove an existing subcategory by its ID. Note that this action cannot be undone.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the subcategory.
 *     responses:
 *       204:
 *         description: The subcategory was successfully deleted.
 *       404:
 *         description: The subcategory with the specified ID was not found.
 */
router.delete('/:id', deleteSubcategory);

export default router;
