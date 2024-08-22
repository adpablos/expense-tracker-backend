import express from 'express';
import axios from 'axios';
import logger from "../config/logger";

const router = express.Router();

export default router;

/**
 * @swagger
 * /auth-help/get-token:
 *   post:
 *     tags: [Auth]
 *     summary: Get an authentication token
 *     description: For development purposes only. Obtains a token from Auth0.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token obtained successfully
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/get-token', async (req, res) => {
    try {
        const { email, password } = req.body;

        const response = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
            grant_type: 'password',
            username: email,
            password: password,
            audience: process.env.AUTH0_AUDIENCE,
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            scope: 'openid'
        });

        res.json(response.data);
    } catch (error: any) {
        logger.error('Error obtaining token', {
            error: error.response ? error.response.data : error.message,
            status: error.response ? error.response.status : null
        });

        if (error.response) {
            // Auth0 specific error responses
            if (error.response.status === 401 || error.response.status === 403) {
                res.status(401).json({ message: 'Invalid credentials' });
            } else {
                res.status(error.response.status).json({
                    error: 'Failed to obtain token',
                    details: error.response.data
                });
            }
        } else if (error.request) {
            // The request was made but no response was received
            res.status(500).json({ error: 'No response received from authentication server' });
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
