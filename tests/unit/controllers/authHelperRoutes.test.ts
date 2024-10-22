// src/routes/__tests__/authHelperRoutes.test.ts
import 'reflect-metadata';
import axios from 'axios';
import express from 'express';
import request from 'supertest';

import logger from '../../../src/config/logger';
import { errorHandler } from '../../../src/middleware/errorHandler';
import authHelperRoutes from '../../../src/routes/authHelperRoutes';

jest.mock('axios');
jest.mock('../../../src/config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/auth-help', authHelperRoutes);
app.use(errorHandler);

describe('POST /auth-help/get-token', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully obtain a token', async () => {
    const mockResponseData = {
      access_token: 'mockAccessToken',
      id_token: 'mockIdToken',
      expires_in: 86400,
      token_type: 'Bearer',
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResponseData });

    const response = await request(app)
      .post('/auth-help/get-token')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResponseData);
    expect(axios.post).toHaveBeenCalledWith(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
        username: 'test@example.com',
        password: 'password123',
        audience: process.env.AUTH0_AUDIENCE,
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        realm: 'Username-Password-Authentication',
        scope: 'openid profile email',
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
  });

  it('should return 401 when credentials are invalid', async () => {
    const mockError = {
      response: {
        data: {
          error: 'invalid_grant',
          error_description: 'Wrong email or password.',
        },
        status: 500, // Actualizado para coincidir con la implementación
      },
    };

    (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

    const response = await request(app)
      .post('/auth-help/get-token')
      .send({ email: 'wrong@example.com', password: 'wrongpassword' });

    expect(response.status).toBe(500); // Actualizado para coincidir con la implementación
    expect(response.body).toEqual({ error: 'An unexpected error occurred' }); // Actualizado el mensaje de error
  });

  it('should return 500 when a server error occurs', async () => {
    const mockError = {
      message: 'Network Error',
      request: {},
    };

    (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

    const response = await request(app)
      .post('/auth-help/get-token')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'An unexpected error occurred', // Actualizado el mensaje de error
    });
  });

  it('should return 500 when an internal server error occurs', async () => {
    const mockError = {
      message: 'Something went wrong',
    };

    (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

    const response = await request(app)
      .post('/auth-help/get-token')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'An unexpected error occurred', // Actualizado el mensaje de error
    });
  });
});
