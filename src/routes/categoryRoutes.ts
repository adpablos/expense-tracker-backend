import express from 'express';
import { Container } from 'inversify';

import { CategoryController } from '../controllers/categoryController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { HouseholdMiddleware } from '../middleware/householdMiddleware';
import { DI_TYPES } from '../types/di';

export default function (container: Container) {
  const router = express.Router();
  const categoryController = container.get<CategoryController>(DI_TYPES.CategoryController);
  const authMiddleware = container.get<AuthMiddleware>(DI_TYPES.AuthMiddleware);
  const householdMiddleware = container.get<HouseholdMiddleware>(DI_TYPES.HouseholdMiddleware);

  router.use(authMiddleware.authMiddleware);
  router.use(authMiddleware.attachUser);
  router.use(householdMiddleware.setCurrentHousehold);
  router.use(householdMiddleware.ensureHouseholdSelected);

  /**
   * @swagger
   * tags:
   *   name: Categories
   *   description: Expense category management
   */

  /**
   * @swagger
   * /api/categories:
   *   get:
   *     summary: Retrieve all categories
   *     tags: [Categories]
   *     description: |
   *       Fetches a comprehensive list of all available expense categories for the specified household or the user's default household.
   *       Categories are used to organize expenses at a high level.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household to fetch categories for. If not provided, the user's default household will be used.
   *     responses:
   *       200:
   *         description: A list of categories successfully retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Category'
   *       400:
   *         description: Bad request - invalid household ID or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       500:
   *         description: Server error - failed to retrieve categories
   */
  router.get('/', categoryController.getCategories);

  /**
   * @swagger
   * /api/categories:
   *   post:
   *     summary: Create a new category
   *     tags: [Categories]
   *     description: |
   *       Adds a new category to organize expenses within a specific household or the user's default household.
   *       Each category must have a unique name within the household.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household to create the category in. If not provided, the user's default household will be used.
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
   *                 description: The name of the category (must be unique within the household)
   *     responses:
   *       201:
   *         description: Category successfully created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Category'
   *       400:
   *         description: Bad request - invalid input, duplicate category name, or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       500:
   *         description: Server error - failed to create category
   */
  router.post('/', categoryController.addCategory);

  /**
   * @swagger
   * /api/categories/{id}:
   *   put:
   *     summary: Update an existing category
   *     tags: [Categories]
   *     description: |
   *       Modifies the details of an existing category by its ID within a specific household or the user's default household.
   *       Only the name of the category can be changed.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique ID of the category to update
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household the category belongs to. If not provided, the user's default household will be used.
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
   *                 description: The new name for the category (must be unique within the household)
   *     responses:
   *       200:
   *         description: Category successfully updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Category'
   *       400:
   *         description: Bad request - invalid input, duplicate category name, or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       404:
   *         description: Category not found - the specified category does not exist in the household
   *       500:
   *         description: Server error - failed to update category
   */
  router.put('/:id', categoryController.updateCategory);

  /**
   * @swagger
   * /api/categories/{id}:
   *   delete:
   *     summary: Delete a category
   *     tags: [Categories]
   *     description: |
   *       Removes an existing category by its ID from a specific household or the user's default household.
   *       If the category has subcategories, they will also be deleted if `force=true` is provided.
   *       Note: This action cannot be undone. All expenses associated with this category (and its subcategories, if deleted) will have their category set to null.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique ID of the category to delete
   *       - in: query
   *         name: force
   *         required: false
   *         schema:
   *           type: boolean
   *           default: false
   *         description: If set to `true`, all associated subcategories will be deleted along with the category
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household the category belongs to. If not provided, the user's default household will be used.
   *     responses:
   *       204:
   *         description: Category successfully deleted
   *       400:
   *         description: Bad request - category has subcategories and force is not true, or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       404:
   *         description: Category not found - the specified category does not exist in the household
   *       500:
   *         description: Server error - failed to delete category
   */
  router.delete('/:id', categoryController.deleteCategory);

  return router;
}
