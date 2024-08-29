import axios, { AxiosError } from 'axios';
import express from 'express';

import logger from '../config/logger';

interface Auth0Error {
  response?: {
    data: {
      error?: string;
      error_description?: string;
      [key: string]: unknown;
    };
    status: number;
  };
  request?: unknown;
  message: string;
}

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
      scope: 'openid',
    });

    res.json(response.data);
  } catch (error) {
    const axiosError = error as AxiosError<Auth0Error>;
    logger.error('Error obtaining token', {
      error: axiosError.response ? axiosError.response.data : axiosError.message,
      status: axiosError.response ? axiosError.response.status : null,
    });

    if (axiosError.response) {
      // Auth0 specific error responses
      if (axiosError.response.status === 401 || axiosError.response.status === 403) {
        res.status(401).json({ message: 'Invalid credentials' });
      } else {
        res.status(axiosError.response.status).json({
          error: 'Failed to obtain token',
          details: axiosError.response.data,
        });
      }
    } else if (axiosError.request) {
      // The request was made but no response was received
      res.status(500).json({ error: 'No response received from authentication server' });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
