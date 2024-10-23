import jwksRsa from 'jwks-rsa';

import config from '../../../config/config';

const authClient = jwksRsa.expressJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: config.auth.jwksUri,
});

export default authClient;
