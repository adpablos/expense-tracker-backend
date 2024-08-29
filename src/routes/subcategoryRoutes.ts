import express from 'express';
import { Container } from 'inversify';

import { SubcategoryController } from '../controllers/subcategoryController';
import { attachUser, authMiddleware } from '../middleware/authMiddleware';
import { ensureHouseholdSelected, setCurrentHousehold } from '../middleware/householdMiddleware';
import requestLogger from '../middleware/requestLogger';
import responseLogger from '../middleware/responseLogger';
import { HouseholdService } from '../services/householdService';
import { DI_TYPES } from '../types/di';

export default function (container: Container) {
  const router = express.Router();
  const subcategoryController = container.get<SubcategoryController>(
    DI_TYPES.SubcategoryController
  );
  const householdService = container.get<HouseholdService>(DI_TYPES.HouseholdService);

  router.use(requestLogger);
  router.use(responseLogger);
  router.use(authMiddleware);
  router.use(attachUser);
  router.use(setCurrentHousehold(householdService));
  router.use(ensureHouseholdSelected);

  /**
   * @swagger
   * tags:
   *   name: Subcategories
   *   description: Expense subcategory management
   */

  /**
   * @swagger
   * /api/subcategories:
   *   get:
   *     summary: Retrieve all subcategories
   *     tags: [Subcategories]
   *     description: |
   *       Fetches a comprehensive list of all available expense subcategories for the specified household or the user's default household.
   *       Subcategories are used to further organize expenses within categories.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household to fetch subcategories for. If not provided, the user's default household will be used.
   *     responses:
   *       200:
   *         description: A list of subcategories successfully retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Subcategory'
   *       400:
   *         description: Bad request - invalid household ID or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       500:
   *         description: Server error - failed to retrieve subcategories
   */
  router.get('/', subcategoryController.getSubcategories);

  /**
   * @swagger
   * /api/subcategories:
   *   post:
   *     summary: Create a new subcategory
   *     tags: [Subcategories]
   *     description: |
   *       Adds a new subcategory to organize expenses under a specific category within a household or the user's default household.
   *       Each subcategory must have a unique name within its parent category in the household.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household to create the subcategory in. If not provided, the user's default household will be used.
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
   *                 description: The name of the subcategory (must be unique within the category in the household)
   *               categoryId:
   *                 type: string
   *                 description: The ID of the parent category for this subcategory
   *     responses:
   *       201:
   *         description: Subcategory successfully created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Subcategory'
   *       400:
   *         description: Bad request - invalid input, duplicate subcategory name, invalid category ID, or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       404:
   *         description: Not found - the specified parent category does not exist
   *       500:
   *         description: Server error - failed to create subcategory
   */
  router.post('/', subcategoryController.addSubcategory);

  /**
   * @swagger
   * /api/subcategories/{id}:
   *   put:
   *     summary: Update an existing subcategory
   *     tags: [Subcategories]
   *     description: |
   *       Modifies the details of an existing subcategory by its ID within a specific household or the user's default household.
   *       The name of the subcategory and its parent category can be changed.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique ID of the subcategory to update
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household the subcategory belongs to. If not provided, the user's default household will be used.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: The new name for the subcategory (must be unique within the category in the household)
   *               categoryId:
   *                 type: string
   *                 description: The ID of the new parent category for this subcategory (if changing categories)
   *     responses:
   *       200:
   *         description: Subcategory successfully updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Subcategory'
   *       400:
   *         description: Bad request - invalid input, duplicate subcategory name, invalid category ID, or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       404:
   *         description: Not found - the specified subcategory or new parent category does not exist
   *       500:
   *         description: Server error - failed to update subcategory
   */
  router.put('/:id', subcategoryController.updateSubcategory);

  /**
   * @swagger
   * /api/subcategories/{id}:
   *   delete:
   *     summary: Delete a subcategory
   *     tags: [Subcategories]
   *     description: |
   *       Removes an existing subcategory by its ID from a specific household or the user's default household.
   *       Note: This action cannot be undone. All expenses associated with this subcategory will have their subcategory set to null.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique ID of the subcategory to delete
   *       - in: header
   *         name: X-Household-Id
   *         schema:
   *           type: string
   *         required: false
   *         description: The ID of the household the subcategory belongs to. If not provided, the user's default household will be used.
   *     responses:
   *       204:
   *         description: Subcategory successfully deleted
   *       400:
   *         description: Bad request - invalid subcategory ID or no default household found
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user does not have access to the specified household
   *       404:
   *         description: Not found - the specified subcategory does not exist in the household
   *       500:
   *         description: Server error - failed to delete subcategory
   */
  router.delete('/:id', subcategoryController.deleteSubcategory);

  return router;
}
