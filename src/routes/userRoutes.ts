import express from 'express';
import {getCurrentUser, updateUser, deleteUser, registerUser, getUserHouseholds} from '../controllers/userController';
import { authMiddleware, attachUser } from '../middleware/authMiddleware';
import requestLogger from '../middleware/requestLogger';
import responseLogger from '../middleware/responseLogger';

const router = express.Router();

router.use(requestLogger);
router.use(responseLogger);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     description: |
 *       Creates a new user in the database after they've been registered in Auth0.
 *       This endpoint should be called right after a successful registration with the authentication provider.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - auth_provider_id
 *               - email
 *               - name
 *             properties:
 *               auth_provider_id:
 *                 type: string
 *                 description: The unique identifier provided by Auth0 for this user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address
 *               name:
 *                 type: string
 *                 description: The user's full name
 *     responses:
 *       201:
 *         description: User successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input - please check the request body
 *       409:
 *         description: Conflict - a user with this email or auth_provider_id already exists
 *       500:
 *         description: Server error - failed to create user
 */
router.post('/', registerUser);

// Protected routes
router.use(authMiddleware);
router.use(attachUser);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     description: |
 *       Retrieves the profile of the currently authenticated user.
 *       This includes basic user information and a list of households they belong to.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       404:
 *         description: User not found - the authenticated user no longer exists in the database
 *       500:
 *         description: Server error - failed to retrieve user profile
 */
router.get('/me', getCurrentUser);

/**
 * @swagger
 * /api/users/me/households:
 *   get:
 *     summary: Get user's households
 *     tags: [Users]
 *     description: |
 *       Retrieves all households associated with the currently authenticated user.
 *       This includes households where the user is an owner or a member.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's households successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Household'
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       500:
 *         description: Server error - failed to retrieve user's households
 */
router.get('/me/households', getUserHouseholds);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     description: |
 *       Updates the profile of the currently authenticated user.
 *       Only certain fields can be updated (e.g., name, email).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The new email address for the user
 *               name:
 *                 type: string
 *                 description: The new name for the user
 *     responses:
 *       200:
 *         description: User profile successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input - please check the request body
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       404:
 *         description: User not found - the authenticated user no longer exists in the database
 *       409:
 *         description: Conflict - the new email address is already in use
 *       500:
 *         description: Server error - failed to update user profile
 */
router.put('/me', updateUser);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete current user account
 *     tags: [Users]
 *     description: |
 *       Deletes the account of the currently authenticated user. This action cannot be undone.
 *       The process includes:
 *       1. Removing the user from all households they belong to.
 *       2. Transferring ownership of any households they own to another member (if possible).
 *       3. Deleting any households where they were the sole member.
 *       4. Deleting all personal data associated with the user.
 *       Note: This does not delete the user's account from the authentication provider (e.g., Auth0).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: User account successfully deleted
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       404:
 *         description: User not found - the authenticated user no longer exists in the database
 *       500:
 *         description: Server error - failed to delete user account
 */
router.delete('/me', deleteUser);

export default router;