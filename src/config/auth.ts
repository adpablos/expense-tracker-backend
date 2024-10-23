type JWTAlgorithm =
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'PS256'
  | 'PS384'
  | 'PS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'HS256'
  | 'HS384'
  | 'HS512';

export interface Auth0Config {
  domain: string;
  audience: string;
  issuer: string;
  algorithms: JWTAlgorithm[];
  jwksUri: string;
  clientId: string;
  clientSecret: string;
}

export const createAuthConfig = (): Auth0Config => {
  if (
    !process.env.AUTH0_DOMAIN ||
    !process.env.AUTH0_AUDIENCE ||
    !process.env.AUTH0_CLIENT_ID ||
    !process.env.AUTH0_CLIENT_SECRET
  ) {
    throw new Error('Missing required AUTH0 environment variables');
  }

  return {
    domain: process.env.AUTH0_DOMAIN,
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
  };
};
