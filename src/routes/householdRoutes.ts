import express from 'express';
import { createHousehold, inviteMember, acceptInvitation, rejectInvitation, getHouseholdMembers, removeMember } from '../controllers/householdController';
import { authMiddleware, attachUser } from '../middleware/authMiddleware';
import requestLogger from '../middleware/requestLogger';
import responseLogger from '../middleware/responseLogger';

const router = express.Router();

router.use(requestLogger);
router.use(responseLogger);
router.use(authMiddleware);
router.use(attachUser);

/**
 * @swagger
 * /api/households:
 *   post:
 *     tags: [Households]
 *     summary: Create a new household
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Household created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Household'
 */
router.post('/', createHousehold);

/**
 * @swagger
 * /api/households/{householdId}/invite:
 *   post:
 *     tags: [Households]
 *     summary: Invite a member to the household
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invitedUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 */
router.post('/:householdId/invite', inviteMember);

/**
 * @swagger
 * /api/households/{householdId}/accept:
 *   post:
 *     tags: [Households]
 *     summary: Accept an invitation to join a household
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 */
router.post('/:householdId/accept', acceptInvitation);

/**
 * @swagger
 * /api/households/{householdId}/reject:
 *   post:
 *     tags: [Households]
 *     summary: Reject an invitation to join a household
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation rejected successfully
 */
router.post('/:householdId/reject', rejectInvitation);

/**
 * @swagger
 * /api/households/{householdId}/members:
 *   get:
 *     tags: [Households]
 *     summary: Get all members of a household
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of household members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HouseholdMember'
 */
router.get('/:householdId/members', getHouseholdMembers);

/**
 * @swagger
 * /api/households/{householdId}/members/{userId}:
 *   delete:
 *     tags: [Households]
 *     summary: Remove a member from the household
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete('/:householdId/members/:userId', removeMember);

export default router;