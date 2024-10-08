import axios, { isAxiosError } from 'axios';
import { Router } from 'express';

import logger from '../config/logger';

const router = Router();

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

    logger.info('Attempting to obtain token', { email });

    const response = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
        username: email,
        password: password,
        audience: process.env.AUTH0_AUDIENCE,
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        realm: 'Username-Password-Authentication',
        scope: 'openid profile email',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Token obtained successfully');
    res.json(response.data);
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      logger.error('Error obtaining token', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
      res.status(error.response.status).json(error.response.data);
    } else {
      logger.error('Unexpected error', error);
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

export default router;
