import express from 'express';
import { Container } from 'inversify';

import { HouseholdController } from '../controllers/householdController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { HouseholdMiddleware } from '../middleware/householdMiddleware';
import { DI_TYPES } from '../config/di';

export default function (container: Container) {
  const router = express.Router();
  const householdController = container.get<HouseholdController>(DI_TYPES.HouseholdController);
  const authMiddleware = container.get<AuthMiddleware>(DI_TYPES.AuthMiddleware);
  const householdMiddleware = container.get<HouseholdMiddleware>(DI_TYPES.HouseholdMiddleware);

  router.use(authMiddleware.authMiddleware);
  router.use(authMiddleware.attachUser);
  router.use(householdMiddleware.setCurrentHousehold);
  router.use(householdMiddleware.ensureHouseholdSelected);

  /**
   * @swagger
   * tags:
   *   name: Households
   *   description: Household management and member operations
   */

  /**
   * @swagger
   * /api/households:
   *   post:
   *     summary: Create a new household
   *     tags: [Households]
   *     description: |
   *       Creates a new household and automatically adds the current user as the owner.
   *       Each user can be the owner of multiple households.
   *     security:
   *       - bearerAuth: []
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
   *                 description: The name of the household (must be unique for the user)
   *     responses:
   *       201:
   *         description: Household successfully created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Household'
   *       400:
   *         description: Bad request - invalid input data (e.g., name is empty)
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       409:
   *         description: Conflict - a household with this name already exists for the user
   *       500:
   *         description: Internal server error - failed to create household
   */
  router.post('/', householdController.createHousehold);

  /**
   * @swagger
   * /api/households/{householdId}/invite:
   *   post:
   *     summary: Invite a user to join a household
   *     tags: [Households]
   *     description: |
   *       Sends an invitation to a user to join the specified household.
   *       Only the household owner can send invitations.
   *       The invited user will need to accept the invitation to join the household.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: householdId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the household to invite the user to
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - invitedUserId
   *             properties:
   *               invitedUserId:
   *                 type: string
   *                 description: The ID of the user to invite
   *     responses:
   *       200:
   *         description: Invitation sent successfully
   *       400:
   *         description: Bad request - invalid input data or user is already a member
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user is not the household owner
   *       404:
   *         description: Not found - household or invited user not found
   *       500:
   *         description: Internal server error - failed to send invitation
   */
  router.post('/:householdId/invite', householdController.inviteMember);

  /**
   * @swagger
   * /api/households/{householdId}/accept:
   *   post:
   *     summary: Accept an invitation to join a household
   *     tags: [Households]
   *     description: |
   *       Accepts a pending invitation for the authenticated user to join the specified household.
   *       The user must have a pending invitation to accept it.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: householdId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the household the user is accepting the invitation for
   *     responses:
   *       200:
   *         description: Invitation accepted successfully
   *       400:
   *         description: Bad request - user is already a member of the household
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       404:
   *         description: Not found - household not found or no pending invitation exists
   *       500:
   *         description: Internal server error - failed to accept invitation
   */
  router.post('/:householdId/accept', householdController.acceptInvitation);

  /**
   * @swagger
   * /api/households/{householdId}/reject:
   *   post:
   *     summary: Reject an invitation to join a household
   *     tags: [Households]
   *     description: |
   *       Rejects a pending invitation for the authenticated user to join the specified household.
   *       The user must have a pending invitation to reject it.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: householdId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the household the user is rejecting the invitation for
   *     responses:
   *       200:
   *         description: Invitation rejected successfully
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       404:
   *         description: Not found - household not found or no pending invitation exists
   *       500:
   *         description: Internal server error - failed to reject invitation
   */
  router.post('/:householdId/reject', householdController.rejectInvitation);

  /**
   * @swagger
   * /api/households/{householdId}/members:
   *   get:
   *     summary: Get all members of a household
   *     tags: [Households]
   *     description: |
   *       Retrieves a list of all members in the specified household.
   *       The authenticated user must be a member of the household to access this information.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: householdId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the household to get members for
   *     responses:
   *       200:
   *         description: List of household members retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/HouseholdMember'
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user is not a member of the household
   *       404:
   *         description: Not found - household not found
   *       500:
   *         description: Internal server error - failed to retrieve household members
   */
  router.get('/:householdId/members', householdController.getHouseholdMembers);

  /**
   * @swagger
   * /api/households/{householdId}/members/{userId}:
   *   delete:
   *     summary: Remove a member from the household
   *     tags: [Households]
   *     description: |
   *       Removes a member from the specified household.
   *       Only the household owner can remove members.
   *       The owner cannot remove themselves from the household.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: householdId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the household to remove the member from
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user to remove from the household
   *     responses:
   *       200:
   *         description: Member removed successfully
   *       400:
   *         description: Bad request - attempt to remove the owner or last member
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       403:
   *         description: Forbidden - user is not the household owner
   *       404:
   *         description: Not found - household or member not found
   *       500:
   *         description: Internal server error - failed to remove member
   */
  router.delete('/:householdId/members/:userId', householdController.removeMember);

  /**
   * @swagger
   * /api/households/me:
   *   get:
   *     summary: Get all households for the authenticated user
   *     tags: [Households]
   *     description: Retrieves a list of all households associated with the authenticated user.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of user's households retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Household'
   *       401:
   *         description: Unauthorized - user is not authenticated
   *       500:
   *         description: Internal server error - failed to retrieve user's households
   */
  router.get('/me', householdController.getUserHouseholds);

  return router;
}
